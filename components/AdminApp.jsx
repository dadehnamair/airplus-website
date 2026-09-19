'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './admin.css';

const STATUSES = ['صادر شد', 'در انتظار پرداخت', 'تسویه شد'];
const TYPES = {
  hero: 'شروع (Hero)',
  content: 'محتوا',
  steps: 'مراحل (پرواز از میان ابر)',
  stats: 'آمار و ارقام',
  quotes: 'نظر مشتریان',
  cta: 'فرود و فرم درخواست',
};
const SCENES = { none: 'بدون شیء سه‌بعدی', tickets: 'بلیت‌های شناور', towers: 'ستون‌های گزارش', airport: 'فرودگاه (مدل سه‌بعدی)' };
const CTA_SCENES = { none: 'بدون شیء سه‌بعدی', airport: 'فرودگاه (مدل سه‌بعدی) روی باند فرود' };

const Ctx = createContext(null);
const useForm = () => useContext(Ctx);
const getIn = (o, path) => path.reduce((a, k) => (a == null ? a : a[k]), o);
function setIn(obj, path, val) {
  const [k, ...rest] = path;
  const copy = Array.isArray(obj) ? obj.slice() : { ...obj };
  copy[k] = rest.length ? setIn(obj[k], rest, val) : val;
  return copy;
}
const uid = () => 's-' + Math.random().toString(36).slice(2, 8);

function newSection(type) {
  const base = { id: uid(), type, label: 'بخش جدید', title: 'عنوان بخش', lead: '' };
  switch (type) {
    case 'hero': return { ...base, cta: 'درخواست دمو', hint: '' };
    case 'content': return { ...base, bullets: ['ویژگی اول'], scene: 'none', tickets: [] };
    case 'steps': return { ...base, steps: [{ title: 'مرحله اول', desc: '' }, { title: 'مرحله دوم', desc: '' }] };
    case 'stats': return { ...base, items: [{ value: '۱۰۰+', label: 'عنوان آمار' }, { value: '۲۴', label: 'عنوان آمار' }] };
    case 'quotes': return { ...base, quotes: [{ text: '', author: '' }] };
    default: return { ...base, cta: 'درخواست دمو', again: 'پرواز دوباره', formEnabled: true, scene: 'none' };
  }
}

/* ---------- فیلدهای فرم (خارج از کامپوننت اصلی تا با هر تایپ دوباره ساخته نشوند) ---------- */
function Text({ label, path, multiline, help }) {
  const { get, set } = useForm();
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <label className="adm-field">
      <span>{label}</span>
      <Tag value={get(path) ?? ''} onChange={(e) => set(path, e.target.value)} rows={multiline ? 3 : undefined} />
      {help && <small>{help}</small>}
    </label>
  );
}

function Select({ label, path, options, onChange }) {
  const { get, set } = useForm();
  const entries = Array.isArray(options) ? options.map((o) => [o, o]) : Object.entries(options);
  return (
    <label className="adm-field">
      <span>{label}</span>
      <select value={get(path)} onChange={(e) => (onChange ? onChange(e.target.value) : set(path, e.target.value))}>
        {entries.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </label>
  );
}

function Check({ label, path }) {
  const { get, set } = useForm();
  return (
    <label className="adm-check">
      <input type="checkbox" checked={!!get(path)} onChange={(e) => set(path, e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function StringList({ label, path, min = 0, max = 12 }) {
  const { get, set } = useForm();
  const list = get(path) || [];
  return (
    <div className="adm-field">
      <span>{label}</span>
      {list.map((v, i) => (
        <div className="adm-row" key={i}>
          <input value={v} onChange={(e) => set(path, list.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className="adm-btn small" disabled={list.length <= min} onClick={() => set(path, list.filter((_, j) => j !== i))}>حذف</button>
        </div>
      ))}
      <button type="button" className="adm-btn small" disabled={list.length >= max} onClick={() => set(path, [...list, ''])}>افزودن مورد</button>
    </div>
  );
}

function ObjList({ label, path, fields, blank, min = 1, max = 14, titleKey }) {
  const { get, set } = useForm();
  const list = get(path) || [];
  const move = (i, d) => {
    const j = i + d; if (j < 0 || j >= list.length) return;
    const c = list.slice(); [c[i], c[j]] = [c[j], c[i]]; set(path, c);
  };
  return (
    <div className="adm-field">
      <span>{label}</span>
      {list.map((item, i) => (
        <fieldset className="adm-item" key={i}>
          <legend>{item[titleKey] || `مورد ${i + 1}`}</legend>
          <div className="adm-grid">
            {fields.map((f) => (
              <label className="adm-field" key={f.key}>
                <span>{f.label}</span>
                {f.type === 'select' ? (
                  <select value={item[f.key]} onChange={(e) => set([...path, i, f.key], e.target.value)}>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea rows={2} value={item[f.key]} onChange={(e) => set([...path, i, f.key], e.target.value)} />
                ) : (
                  <input value={item[f.key]} onChange={(e) => set([...path, i, f.key], e.target.value)} />
                )}
              </label>
            ))}
          </div>
          <div className="adm-row">
            <button type="button" className="adm-btn small" onClick={() => move(i, -1)} disabled={i === 0}>بالا</button>
            <button type="button" className="adm-btn small" onClick={() => move(i, 1)} disabled={i === list.length - 1}>پایین</button>
            <button type="button" className="adm-btn small danger" onClick={() => set(path, list.filter((_, j) => j !== i))} disabled={list.length <= min}>حذف</button>
          </div>
        </fieldset>
      ))}
      <button type="button" className="adm-btn small" disabled={list.length >= max} onClick={() => set(path, [...list, { ...blank }])}>افزودن</button>
    </div>
  );
}

/* ---------- ویرایشگر یک بخش ---------- */
const TICKET_FIELDS = [
  { key: 'route', label: 'مسیر (مثلاً تهران ← مشهد)' },
  { key: 'airline', label: 'ایرلاین' },
  { key: 'price', label: 'مبلغ (تومان)' },
  { key: 'status', label: 'وضعیت', type: 'select', options: STATUSES },
];

function SectionEditor({ i }) {
  const { get, set } = useForm();
  const sections = get(['sections']);
  const s = sections[i];
  const P = (k) => ['sections', i, k];

  const move = (d) => {
    const j = i + d; if (j < 0 || j >= sections.length) return;
    const c = sections.slice(); [c[i], c[j]] = [c[j], c[i]]; set(['sections'], c);
  };
  const dup = () => {
    if (sections.length >= 12) return;
    const copy = JSON.parse(JSON.stringify(s)); copy.id = uid(); copy.label = (s.label + ' ۲').slice(0, 14);
    const c = sections.slice(); c.splice(i + 1, 0, copy); set(['sections'], c);
  };
  const del = () => { if (sections.length > 1 && window.confirm(`بخش «${s.label}» حذف شود؟`)) set(['sections'], sections.filter((_, j) => j !== i)); };
  const onScene = (v) => {
    set(P('scene'), v);
    if (v === 'tickets' && !(s.tickets && s.tickets.length)) set(P('tickets'), [{ route: 'تهران ← مشهد', airline: 'ماهان', price: '۴٬۸۵۰٬۰۰۰', status: 'صادر شد' }]);
  };

  return (
    <details className="adm-sec">
      <summary>
        <span className="adm-no">{i + 1}</span>
        <b>{s.label || 'بدون نام'}</b>
        <em>{TYPES[s.type]}</em>
      </summary>
      <div className="adm-sec-body">
        <div className="adm-grid">
          <Text label="برچسب در نوار مسیر (حداکثر ۱۴ نویسه)" path={P('label')} />
          <Text label="عنوان" path={P('title')} />
        </div>
        <Text label="توضیح کوتاه" path={P('lead')} multiline />

        {s.type === 'hero' && (
          <div className="adm-grid">
            <Text label="متن دکمه" path={P('cta')} />
            <Text label="متن راهنمای اسکرول" path={P('hint')} />
          </div>
        )}
        {s.type === 'content' && (
          <>
            <StringList label="ویژگی‌ها (حداکثر ۶)" path={P('bullets')} max={6} />
            <Select label="شیء سه‌بعدی در صحنه این بخش" path={P('scene')} options={SCENES} onChange={onScene} />
            {s.scene === 'tickets' && <ObjList label="بلیت‌های شناور (۱ تا ۱۴)" path={P('tickets')} titleKey="route" min={1} max={14} blank={{ route: '', airline: '', price: '', status: 'صادر شد' }} fields={TICKET_FIELDS} />}
          </>
        )}
        {s.type === 'steps' && (
          <ObjList label="مراحل (۲ تا ۵؛ هر مرحله یک ابر غلیظ در مسیر است)" path={P('steps')} titleKey="title" min={2} max={5} blank={{ title: '', desc: '' }}
            fields={[{ key: 'title', label: 'عنوان کوتاه' }, { key: 'desc', label: 'توضیح', type: 'textarea' }]} />
        )}
        {s.type === 'stats' && (
          <ObjList label="آمارها (۱ تا ۴؛ مثلاً «۲۴۰+»)" path={P('items')} titleKey="label" min={1} max={4} blank={{ value: '', label: '' }}
            fields={[{ key: 'value', label: 'مقدار' }, { key: 'label', label: 'عنوان' }]} />
        )}
        {s.type === 'quotes' && (
          <ObjList label="نظرها (۱ تا ۶)" path={P('quotes')} titleKey="author" min={1} max={6} blank={{ text: '', author: '' }}
            fields={[{ key: 'text', label: 'متن نظر', type: 'textarea' }, { key: 'author', label: 'نام و سمت' }]} />
        )}
        {s.type === 'cta' && (
          <>
            <div className="adm-grid">
              <Text label="متن دکمه" path={P('cta')} />
              <Text label="متن دکمه بازگشت" path={P('again')} />
            </div>
            <Check label="فرم درخواست دمو نمایش داده شود (درخواست‌ها در تب «درخواست‌ها» ذخیره می‌شوند)" path={P('formEnabled')} />
            <Select label="شیء سه‌بعدی روی باند فرود" path={P('scene')} options={CTA_SCENES} />
          </>
        )}

        <div className="adm-row adm-actions">
          <button type="button" className="adm-btn small" onClick={() => move(-1)} disabled={i === 0}>بالا</button>
          <button type="button" className="adm-btn small" onClick={() => move(1)} disabled={i === sections.length - 1}>پایین</button>
          <button type="button" className="adm-btn small" onClick={dup} disabled={sections.length >= 12}>تکثیر</button>
          <button type="button" className="adm-btn small danger" onClick={del} disabled={sections.length <= 1}>حذف بخش</button>
        </div>
      </div>
    </details>
  );
}

function FooterColumns() {
  const { get, set } = useForm();
  const cols = get(['footer', 'columns']) || [];
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= cols.length) return; const c = cols.slice(); [c[i], c[j]] = [c[j], c[i]]; set(['footer', 'columns'], c); };
  return (
    <div className="adm-field">
      <span>ستون‌های لینک فوتر (حداکثر ۴)</span>
      {cols.map((c, i) => (
        <fieldset className="adm-item" key={i}>
          <legend>{c.title || `ستون ${i + 1}`}</legend>
          <Text label="عنوان ستون" path={['footer', 'columns', i, 'title']} />
          <ObjList label="لینک‌ها" path={['footer', 'columns', i, 'links']} titleKey="label" min={0} max={8} blank={{ label: '', href: '' }}
            fields={[{ key: 'label', label: 'متن' }, { key: 'href', label: 'نشانی (https://…)' }]} />
          <div className="adm-row">
            <button type="button" className="adm-btn small" onClick={() => move(i, -1)} disabled={i === 0}>بالا</button>
            <button type="button" className="adm-btn small" onClick={() => move(i, 1)} disabled={i === cols.length - 1}>پایین</button>
            <button type="button" className="adm-btn small danger" onClick={() => set(['footer', 'columns'], cols.filter((_, j) => j !== i))}>حذف ستون</button>
          </div>
        </fieldset>
      ))}
      <button type="button" className="adm-btn small" disabled={cols.length >= 4} onClick={() => set(['footer', 'columns'], [...cols, { title: 'ستون جدید', links: [] }])}>افزودن ستون</button>
    </div>
  );
}

/* ---------- درخواست‌های دمو ---------- */
function Leads() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const r = await fetch('/api/leads');
    if (!r.ok) { setErr('بارگذاری ناموفق بود'); return; }
    setList(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(id) {
    if (!window.confirm('این درخواست حذف شود؟')) return;
    await fetch('/api/leads?id=' + encodeURIComponent(id), { method: 'DELETE' });
    load();
  }
  function exportCsv() {
    const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = [['نام', 'آژانس', 'تلفن', 'تاریخ'], ...list.map((l) => [l.name, l.agency, l.phone, new Date(l.createdAt).toLocaleString('fa-IR')])];
    const blob = new Blob(['\ufeff' + rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'leads.csv'; a.click(); URL.revokeObjectURL(a.href);
  }

  if (err) return <p className="adm-error">{err}</p>;
  if (!list) return <p>در حال بارگذاری…</p>;
  return (
    <section className="adm-card">
      <div className="adm-row" style={{ justifyContent: 'space-between' }}>
        <h2>درخواست‌های دمو ({list.length.toLocaleString('fa-IR')})</h2>
        <button className="adm-btn small" onClick={exportCsv} disabled={!list.length}>دریافت CSV</button>
      </div>
      {list.length === 0 ? <p className="adm-muted">هنوز درخواستی ثبت نشده است.</p> : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>نام</th><th>آژانس</th><th>تلفن</th><th>زمان</th><th /></tr></thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id}>
                  <td>{l.name}</td><td>{l.agency || '—'}</td><td dir="ltr">{l.phone}</td>
                  <td>{new Date(l.createdAt).toLocaleString('fa-IR')}</td>
                  <td><button className="adm-btn small danger" onClick={() => remove(l.id)}>حذف</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------- پنل اصلی ---------- */
export default function AdminApp({ initial }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState('content');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newType, setNewType] = useState('content');

  const set = useCallback((path, val) => { setData((d) => setIn(d, path, val)); setDirty(true); setMsg(null); }, []);
  const get = useCallback((path) => getIn(data, path), [data]);

  function addSection() {
    const secs = data.sections;
    if (secs.length >= 12) return;
    const s = newSection(newType);
    const c = secs.slice();
    const last = c[c.length - 1];
    if (last && last.type === 'cta') c.splice(c.length - 1, 0, s); else c.push(s);
    set(['sections'], c);
  }

  async function save() {
    setBusy(true); setMsg(null);
    const res = await fetch('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 401) { setMsg({ type: 'error', text: 'نشست شما تمام شده؛ دوباره وارد شوید.' }); router.refresh(); return; }
    if (!res.ok) { setMsg({ type: 'error', text: out.error || 'ذخیره ناموفق بود' }); return; }
    setDirty(false); setMsg({ type: 'ok', text: 'ذخیره شد. سایت اصلی به‌روز شد.' });
  }
  async function logout() { await fetch('/api/logout', { method: 'POST' }); router.refresh(); }

  const lastIsCta = data.sections[data.sections.length - 1]?.type === 'cta';

  return (
    <Ctx.Provider value={{ get, set }}>
      <main className="adm-page">
        <header className="adm-top">
          <h1>پنل مدیریت</h1>
          <div className="adm-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'content'} onClick={() => setTab('content')}>محتوا</button>
            <button role="tab" aria-selected={tab === 'leads'} onClick={() => setTab('leads')}>درخواست‌ها</button>
          </div>
          <div className="adm-row">
            <a className="adm-btn" href="/" target="_blank" rel="noreferrer">مشاهده سایت</a>
            <button className="adm-btn" onClick={logout}>خروج</button>
          </div>
        </header>

        {tab === 'leads' ? (
          <div className="adm-wrap"><Leads /></div>
        ) : (
          <>
            <div className="adm-wrap">
              <section className="adm-card">
                <h2>برند</h2>
                <div className="adm-grid">
                  <Text label="نام برند (در لودر، آسمان و بلیت‌ها نمایش داده می‌شود)" path={['brand', 'name']} />
                  <Text label="شعار کوتاه" path={['brand', 'tagline']} />
                </div>
              </section>

              <section className="adm-card">
                <h2>بخش‌های صفحه ({data.sections.length.toLocaleString('fa-IR')} از ۱۲)</h2>
                <p className="adm-muted">ترتیب این فهرست همان ترتیب پرواز است. طول مسیر و صحنه‌ها خودکار با تعداد بخش‌ها تنظیم می‌شود.</p>
                {data.sections.map((s, i) => <SectionEditor key={s.id} i={i} />)}
                {!lastIsCta && <p className="adm-warn">بخش «فرود و فرم» را آخر بگذارید؛ باند فرود همیشه انتهای مسیر است.</p>}
                <div className="adm-row adm-add">
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} aria-label="نوع بخش جدید">
                    {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button type="button" className="adm-btn primary" onClick={addSection} disabled={data.sections.length >= 12}>افزودن بخش</button>
                </div>
              </section>

              <section className="adm-card">
                <h2>فوتر</h2>
                <Text label="متن معرفی" path={['footer', 'about']} multiline />
                <FooterColumns />
                <ObjList label="شبکه‌های اجتماعی" path={['footer', 'social']} titleKey="label" min={0} max={8} blank={{ label: '', href: '' }}
                  fields={[{ key: 'label', label: 'نام' }, { key: 'href', label: 'نشانی' }]} />
                <ObjList label="لینک‌های حقوقی (قوانین، حریم خصوصی…)" path={['footer', 'legal']} titleKey="label" min={0} max={4} blank={{ label: '', href: '' }}
                  fields={[{ key: 'label', label: 'متن' }, { key: 'href', label: 'نشانی' }]} />
                <div className="adm-grid">
                  <Text label="متن کپی‌رایت" path={['footer', 'copyright']} />
                  <Text label="سازنده" path={['footer', 'credit']} />
                </div>
              </section>

              <section className="adm-card">
                <h2>اطلاعات تماس</h2>
                <Text label="آدرس" path={['contact', 'address']} multiline />
                <StringList label="شماره‌های تماس" path={['contact', 'phones']} min={1} max={4} />
                <Text label="ایمیل" path={['contact', 'email']} />
              </section>
            </div>

            <footer className="adm-save">
              <span className={msg ? 'adm-msg ' + msg.type : 'adm-msg'} role="status">{msg ? msg.text : dirty ? 'تغییرات ذخیره نشده' : ' '}</span>
              <button className="adm-btn primary" onClick={save} disabled={busy || !dirty}>{busy ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</button>
            </footer>
          </>
        )}
      </main>
    </Ctx.Provider>
  );
}
