import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'File Master - All-in-One File processing Platform',
  description: 'Merge, Compress, Enhance, Edit, and Convert documents, images, audio, video, spreadsheets, and common media formats instantly.',
  keywords: 'file processor, pdf merger, image compressor, video trim, office to pdf, docx pdf convert, file master',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#6366f1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet" />

        <style>{`
          html, body {
            font-family: 'Inter', sans-serif;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Outfit', sans-serif;
          }
        `}</style>
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased bg-gradient-premium select-none">
        {children}
      </body>
    </html>
  );
}
