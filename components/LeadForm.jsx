'use client';

import { useState } from 'react';

export default function LeadForm() {
  const [f, setF] = useState({ name: '', agency: '', phone: '', website: '' });
  const [state, setState] = useState('idle'); // idle | sending | ok | error
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setState('sending'); setMsg('');
    try {
      const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { setState('error'); setMsg(out.error || 'ارسال ناموفق بود؛ دوباره تلاش کنید.'); return; }
      setState('ok'); setF({ name: '', agency: '', phone: '', website: '' });
    } catch {
      setState('error'); setMsg('اتصال برقرار نشد؛ اینترنت خود را بررسی کنید.');
    }
  }

  if (state === 'ok') {
    return <p className="lf-ok" role="status">درخواست شما ثبت شد. به‌زودی با شما تماس می‌گیریم.</p>;
  }

  return (
    <form className="lead-form" onSubmit={submit} noValidate>
      <div className="lf-row">
        <label><span>نام و نام خانوادگی</span><input value={f.name} onChange={set('name')} autoComplete="name" required /></label>
        <label><span>نام آژانس</span><input value={f.agency} onChange={set('agency')} autoComplete="organization" /></label>
      </div>
      <label><span>شماره تماس</span><input value={f.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: 'right' }} required /></label>
      <input className="lf-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={set('website')} />
      {state === 'error' && <p className="lf-err" role="alert">{msg}</p>}
      <button className="btn" disabled={state === 'sending' || !f.name || !f.phone}>{state === 'sending' ? 'در حال ارسال…' : 'ثبت درخواست دمو'}</button>
    </form>
  );
}
