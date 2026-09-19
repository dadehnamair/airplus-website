import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { readContent, writeContent, validateContent } from '@/lib/content';
import { isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await readContent());
}

export async function PUT(req) {
  if (!isAdmin()) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON نامعتبر' }, { status: 400 }); }
  const err = validateContent(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  await writeContent(body);
  revalidatePath('/');
  return NextResponse.json({ ok: true });
}
