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
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable}>
      <body>{children}</body>
    </html>
  );
}
