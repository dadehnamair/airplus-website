import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { isAdmin } from '@/lib/auth';
import { readLeads, writeLeads, allow, toLatinDigits } from '@/lib/leads';

export const dynamic = 'force-dynamic';

// ثبت درخواست دمو (عمومی)
export async function POST(req) {
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  if (!allow(ip)) return NextResponse.json({ error: 'درخواست‌های زیادی فرستاده‌اید؛ کمی بعد دوباره تلاش کنید.' }, { status: 429 });

  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 }); }

  if (b.website) return NextResponse.json({ ok: true }); // فیلد مخفی ضد ربات

  const name = String(b.name || '').trim();
  const agency = String(b.agency || '').trim();
  const phone = toLatinDigits(String(b.phone || '').trim());
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: 'نام را کامل وارد کنید.' }, { status: 400 });
  if (agency.length > 120) return NextResponse.json({ error: 'نام آژانس خیلی طولانی است.' }, { status: 400 });
  if (!/^[+\d][\d\s\-()]{6,19}$/.test(phone)) return NextResponse.json({ error: 'شماره تماس معتبر نیست.' }, { status: 400 });

  const list = await readLeads();
  list.unshift({ id: crypto.randomUUID(), name, agency, phone, createdAt: new Date().toISOString() });
  await writeLeads(list.slice(0, 2000));
  return NextResponse.json({ ok: true });
}

// فهرست درخواست‌ها (فقط ادمین)
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });
  return NextResponse.json(await readLeads());
}

// حذف یک درخواست (فقط ادمین)
export async function DELETE(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  const list = await readLeads();
  await writeLeads(list.filter((l) => l.id !== id));
  return NextResponse.json({ ok: true });
}
