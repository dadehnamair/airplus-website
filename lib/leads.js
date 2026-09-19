import { promises as fs } from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'leads.json');

export async function readLeads() {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { return []; }
}

export async function writeLeads(list) {
  const tmp = FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
  await fs.rename(tmp, FILE);
}

// محدودیت ساده در حافظه: حداکثر ۵ درخواست در ساعت برای هر IP.
const hits = new Map();
export function allow(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 3600 * 1000);
  if (arr.length >= 5) { hits.set(ip, arr); return false; }
  arr.push(now); hits.set(ip, arr);
  return true;
}

export const toLatinDigits = (s) => String(s).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
