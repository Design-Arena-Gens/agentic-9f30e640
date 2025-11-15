import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'محول النص إلى فيديو',
  description: 'أنشئ فيديوهات أنيقة من نصك مباشرة من المتصفح'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
