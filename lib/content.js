import { promises as fs } from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'content.json');

export async function readContent() {
  const raw = await fs.readFile(FILE, 'utf8');
  return JSON.parse(raw);
}

export async function writeContent(data) {
  const tmp = FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, FILE);
}

export const SECTION_TYPES = ['hero', 'content', 'steps', 'stats', 'quotes', 'cta'];
export const TICKET_STATUSES = ['صادر شد', 'در انتظار پرداخت', 'تسویه شد'];
export const SCENES = ['none', 'tickets', 'towers'];

const isStr = (v) => typeof v === 'string';
const isArr = (v) => Array.isArray(v);
const tooLong = (v, n = 600) => isStr(v) && v.length > n;

// اعتبارسنجی قبل از ذخیره؛ صحنه سه‌بعدی روی همین ساختار حساب می‌کند.
export function validateContent(d) {
  if (!d || typeof d !== 'object') return 'ساختار داده نامعتبر است';
  if (!d.brand || !isStr(d.brand.name) || !d.brand.name.trim()) return 'نام برند خالی است';
  if (!isArr(d.sections) || d.sections.length < 1 || d.sections.length > 12) return 'تعداد بخش‌ها باید بین ۱ تا ۱۲ باشد';

  const ids = new Set();
  for (let i = 0; i < d.sections.length; i++) {
    const s = d.sections[i];
    const where = `بخش ${i + 1}`;
    if (!s || typeof s !== 'object') return `${where}: ساختار نامعتبر`;
    if (!isStr(s.id) || !s.id || ids.has(s.id)) return `${where}: شناسه تکراری یا خالی است`;
    ids.add(s.id);
    if (!SECTION_TYPES.includes(s.type)) return `${where}: نوع نامعتبر`;
    if (!isStr(s.label) || !s.label.trim()) return `${where}: «برچسب» (نام در نوار مسیر) خالی است`;
    if (s.label.length > 14) return `${where}: برچسب حداکثر ۱۴ نویسه`;
    if (!isStr(s.title) || !s.title.trim()) return `${where}: عنوان خالی است`;
    if (tooLong(s.title, 160) || tooLong(s.lead || '')) return `${where}: متن خیلی طولانی است`;

    if (s.type === 'content') {
      if (!isArr(s.bullets) || s.bullets.length > 6) return `${where}: حداکثر ۶ ویژگی`;
      if (!SCENES.includes(s.scene)) return `${where}: صحنه نامعتبر`;
      if (s.scene === 'tickets') {
        if (!isArr(s.tickets) || s.tickets.length < 1 || s.tickets.length > 14) return `${where}: تعداد بلیت‌ها باید بین ۱ تا ۱۴ باشد`;
        for (const t of s.tickets) if (!TICKET_STATUSES.includes(t.status)) return `${where}: وضعیت یکی از بلیت‌ها نامعتبر است`;
      }
    }
    if (s.type === 'steps') {
      if (!isArr(s.steps) || s.steps.length < 2 || s.steps.length > 5) return `${where}: تعداد مراحل باید بین ۲ تا ۵ باشد`;
      for (const st of s.steps) if (!isStr(st.title) || !st.title.trim()) return `${where}: عنوان یکی از مراحل خالی است`;
    }
    if (s.type === 'stats') {
      if (!isArr(s.items) || s.items.length < 1 || s.items.length > 4) return `${where}: تعداد آمارها باید بین ۱ تا ۴ باشد`;
    }
    if (s.type === 'quotes') {
      if (!isArr(s.quotes) || s.quotes.length < 1 || s.quotes.length > 6) return `${where}: تعداد نظرها باید بین ۱ تا ۶ باشد`;
    }
  }

  const f = d.footer;
  if (!f || typeof f !== 'object') return 'بخش فوتر موجود نیست';
  if (!isArr(f.columns) || f.columns.length > 4) return 'حداکثر ۴ ستون در فوتر';
  for (const c of f.columns) if (!isArr(c.links)) return 'لینک‌های یک ستون فوتر نامعتبر است';
  if (!isArr(f.social) || !isArr(f.legal)) return 'شبکه‌های اجتماعی یا لینک‌های حقوقی نامعتبر است';
  if (!d.contact || !d.contact.email || !isArr(d.contact.phones)) return 'اطلاعات تماس ناقص است';
  return null;
}
