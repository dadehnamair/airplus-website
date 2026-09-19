import { isAdmin } from '@/lib/auth';
import { readContent } from '@/lib/content';
import AdminApp from '@/components/AdminApp';
import AdminLogin from '@/components/AdminLogin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'پنل مدیریت', robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!isAdmin()) return <AdminLogin />;
  const content = await readContent();
  return <AdminApp initial={content} />;
}
