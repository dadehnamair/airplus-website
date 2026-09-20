import { Vazirmatn } from 'next/font/google';
import './globals.css';

const vazir = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-vazir',
  display: 'swap',
});

export const metadata = {
  title: 'ایرپلاس | پرواز',
  description: 'سامانه یکپارچه مدیریت آژانس‌های مسافرتی',
  icons: {
    icon: [
      { url: '/icon/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon/icon-192.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable}>
      <body>{children}</body>
    </html>
  );
}
