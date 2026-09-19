import crypto from 'crypto';
import { cookies } from 'next/headers';

const secret = () => process.env.ADMIN_SECRET || 'dev-only-secret-change-me';
const sign = (exp) => crypto.createHmac('sha256', secret()).update(String(exp)).digest('hex');

export function makeToken() {
  const exp = Date.now() + 1000 * 60 * 60 * 12; // ۱۲ ساعت
  return exp + '.' + sign(exp);
}

export function verifyToken(token) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(exp)));
  } catch {
    return false;
  }
}

export function isAdmin() {
  return verifyToken(cookies().get('admin')?.value);
}
