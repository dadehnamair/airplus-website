'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import './admin.css';

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error || 'ورود ناموفق بود'); return; }
    router.refresh();
  }

  return (
    <main className="adm-page adm-center">
      <form className="adm-box" onSubmit={submit}>
        <h1>ورود به پنل مدیریت</h1>
        <label className="adm-field">
          <span>رمز عبور</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
        </label>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button className="adm-btn primary" disabled={busy || !password}>{busy ? 'در حال ورود…' : 'ورود'}</button>
      </form>
    </main>
  );
}
