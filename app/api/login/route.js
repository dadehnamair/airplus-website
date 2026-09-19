import { NextResponse } from 'next/server';
import { makeToken } from '@/lib/auth';

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD در فایل .env.local تنظیم نشده است' }, { status: 500 });
  }
  await new Promise((r) => setTimeout(r, 400)); // کند کردن حدس زدن رمز
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'رمز اشتباه است' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin', makeToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return res;
}
