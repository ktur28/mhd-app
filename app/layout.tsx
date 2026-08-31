export const metadata = {
  title: 'MHD Tracker',
  description: 'Mindesthaltbarkeitsdatum verwalten',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f8fafc' }}>
        {children}
      </body>
    </html>
  );
}
