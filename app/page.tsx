'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('form');
  
  // Formular-Zustände
  const [productName, setProductName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Daten-Zustände
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<any>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  // Produkte laden und nach Ablaufdatum sortieren (nächster Ablauf oben)
  const loadProducts = async () => {
    if (!supabaseUrl) return;
    const { data, error } = await supabase
      .from('mhd_products')
      .select('*')
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('Fehler beim Laden:', error);
    } else if (data) {
      setProducts(data);
    }
  };

  // Tage bis zum Ablaufdatum berechnen
  const getDaysRemaining = (targetDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = targetDateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);

    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Neues Produkt speichern
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !expiryDate) return;

    setIsSubmitting(true);
    setStatusMsg('Speichere...');
    let photoUrl = '';

    try {
      // 1. Foto hochladen falls vorhanden
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('mhd-fotos')
          .upload(fileName, file);

        if (uploadErr) throw uploadErr;

        const { data: publicUrlData } = supabase.storage
          .from('mhd-fotos')
          .getPublicUrl(fileName);

        photoUrl = publicUrlData.publicUrl;
      }

      // 2. Produkt in DB eintragen
      const { error: dbErr } = await supabase.from('mhd_products').insert([{
        product_name: productName.trim(),
        expiry_date: expiryDate,
        image_url: photoUrl
      }]);

      if (dbErr) throw dbErr;

      setStatusMsg('✅ Produkt erfolgreich gespeichert!');
      setProductName('');
      setExpiryDate('');
      setFile(null);
      loadProducts();
    } catch (err: any) {
      setStatusMsg('❌ Fehler: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ablaufdatum aktualisieren
  const handleUpdateDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const { error } = await supabase
        .from('mhd_products')
        .update({ expiry_date: editingProduct.expiry_date })
        .eq('id', editingProduct.id);

      if (error) throw error;

      setStatusMsg('✅ Datum aktualisiert!');
      setEditingProduct(null);
      loadProducts();
    } catch (err: any) {
      setStatusMsg('❌ Fehler beim Aktualisieren: ' + err.message);
    }
  };

  // Produkt löschen
  const handleDelete = async (id: number, name: string) => {
    const confirmDelete = window.confirm(`Möchtest du "${name}" wirklich löschen?`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from('mhd_products').delete().eq('id', id);
      if (error) throw error;

      setStatusMsg('🗑️ Produkt gelöscht.');
      loadProducts();
    } catch (err: any) {
      setStatusMsg('❌ Fehler beim Löschen: ' + err.message);
    }
  };

  // Gefilterte Produkte basierend auf der Suchleiste (Name oder Datum)
  const filteredProducts = products.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const formattedDate = new Date(item.expiry_date + 'T00:00:00').toLocaleDateString('de-CH');
    const nameMatch = item.product_name.toLowerCase().includes(query);
    const rawDateMatch = item.expiry_date.includes(query);
    const formattedDateMatch = formattedDate.includes(query);

    return nameMatch || rawDateMatch || formattedDateMatch;
  });

  return (
    <main style={{ maxWidth: '500px', margin: '0 auto', padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '16px' }}>📦 MHD-Tracker</h2>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button 
          onClick={() => { setActiveTab('form'); setEditingProduct(null); }} 
          style={{ 
            flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
            background: activeTab === 'form' ? '#16a34a' : '#e2e8f0', 
            color: activeTab === 'form' ? '#fff' : '#1e293b' 
          }}>
          + Neues Produkt
        </button>
        <button 
          onClick={() => setActiveTab('list')} 
          style={{ 
            flex: 1, padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
            background: activeTab === 'list' ? '#16a34a' : '#e2e8f0', 
            color: activeTab === 'list' ? '#fff' : '#1e293b' 
          }}>
          📋 Übersicht ({products.length})
        </button>
      </div>

      {/* Status-Meldungen */}
      {statusMsg && (
        <div style={{ padding: '10px 14px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '16px', textAlign: 'center', fontSize: '14px' }}>
          {statusMsg}
        </div>
      )}

      {/* TAB 1: ERFASSUNG */}
      {activeTab === 'form' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px' }}>
            Produktname:*
            <input 
              type="text" 
              value={productName} 
              onChange={(e) => setProductName(e.target.value)} 
              placeholder="z.B. Vollmilch 1L" 
              required 
              style={{ width: '100%', padding: '12px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </label>

          <label style={{ fontWeight: 'bold', fontSize: '14px' }}>
            Ablaufdatum (MHD):*
            <input 
              type="date" 
              value={expiryDate} 
              onChange={(e) => setExpiryDate(e.target.value)} 
              required 
              style={{ width: '100%', padding: '12px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </label>

          <label style={{ fontWeight: 'bold', fontSize: '14px' }}>
            Foto aufnehmen / auswählen:
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            />
          </label>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              marginTop: '10px', padding: '14px', background: '#16a34a', color: '#fff', 
              border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' 
            }}>
            {isSubmitting ? 'Speichere...' : 'Produkt Speichern'}
          </button>
        </form>
      )}

      {/* TAB 2: PRODUKTLISTE */}
      {activeTab === 'list' && (
        <div>
          {editingProduct ? (
            /* EDITIERFORMULAR */
            <form onSubmit={handleUpdateDate} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ marginTop: 0 }}>Datum ändern</h3>
              <p><strong>Produkt:</strong> {editingProduct.product_name}</p>

              <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>
                Neues Ablaufdatum:
                <input 
                  type="date" 
                  value={editingProduct.expiry_date} 
                  onChange={(e) => setEditingProduct({ ...editingProduct, expiry_date: e.target.value })} 
                  style={{ width: '100%', padding: '10px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" style={{ flex: 1, padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                  Speichern
                </button>
                <button type="button" onClick={() => setEditingProduct(null)} style={{ padding: '10px', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: '6px' }}>
                  Abbrechen
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* SUCHLEISTE */}
              <div style={{ marginBottom: '6px' }}>
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="🔍 Nach Name oder Datum suchen..." 
                  style={{ 
                    width: '100%', padding: '10px 14px', borderRadius: '8px', 
                    border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' 
                  }}
                />
              </div>

              {filteredProducts.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', marginTop: '16px' }}>
                  {searchQuery ? 'Keine passenden Produkte gefunden.' : 'Noch keine Produkte erfasst.'}
                </p>
              ) : (
                filteredProducts.map((item) => {
                  const days = getDaysRemaining(item.expiry_date);
                  
                  // Standard-Design (Grün)
                  let cardBg = '#ffffff';
                  let cardBorder = '#e2e8f0';
                  let badgeBg = '#dcfce7'; 
                  let badgeText = '#15803d';
                  let daysLabel = `Noch ${days} Tage`;

                  // HEUTE ABLAUFEND -> Gelb/Orange Warnung
                  if (days === 0) {
                    cardBg = '#fef9c3'; 
                    cardBorder = '#eab308'; 
                    badgeBg = '#ca8a04'; 
                    badgeText = '#ffffff';
                    daysLabel = '⚠️ ABLAUFDATUM HEUTE!';
                  } 
                  // BEREITS ABGELAUFEN
                  else if (days < 0) {
                    cardBg = '#fef2f2'; 
                    cardBorder = '#fca5a5';
                    badgeBg = '#dc2626'; 
                    badgeText = '#ffffff';
                    daysLabel = `Seit ${Math.abs(days)} Tag(en) abgelaufen`;
                  } 
                  // BALD ABLAUFEND (1 - 3 Tage)
                  else if (days <= 3) {
                    cardBg = '#fff7ed'; 
                    cardBorder = '#ffedd5';
                    badgeBg = '#ea580c'; 
                    badgeText = '#ffffff';
                    daysLabel = `Dringend: Noch ${days} Tag(e)`;
                  }

                  return (
                    <div 
                      key={item.id} 
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '12px', 
                        background: cardBg, 
                        padding: '10px 12px', 
                        borderRadius: '8px', 
                        border: `2px solid ${cardBorder}`, 
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
                      }}>
                      {/* Vorschaubild */}
                      <div style={{ width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '20px' }}>📷</span>
                        )}
                      </div>

                      {/* Produkt-Infos */}
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '16px', display: 'block', marginBottom: '2px', color: '#0f172a' }}>
                          {item.product_name}
                        </strong>
                        
                        <div style={{ display: 'inline-block', background: badgeBg, color: badgeText, fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', marginBottom: '4px' }}>
                          {daysLabel}
                        </div>

                        <div style={{ fontSize: '12px', color: '#475569' }}>
                          MHD: {new Date(item.expiry_date + 'T00:00:00').toLocaleDateString('de-CH')}
                        </div>
                      </div>

                      {/* Aktionen */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button 
                          onClick={() => setEditingProduct(item)} 
                          style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                          ✏️ Datum
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id, item.product_name)} 
                          style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '6px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                          🗑️ Löschen
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
