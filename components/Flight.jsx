'use client';

import { useEffect, useRef, useState } from 'react';
import { startFlight } from './flightScene';
import { sectionRange, SEG_VH } from '@/lib/layout';
import LeadForm from './LeadForm';
import SiteFooter from './SiteFooter';
import './flight.css';

const FA = '۰۱۲۳۴۵۶۷۸۹';
const toFa = (n) => String(n).replace(/\d/g, (d) => FA[d]);
const toLatin = (s) => String(s).replace(/[۰-۹]/g, (d) => FA.indexOf(d));

// «۲۴۰+» را به پیشوند، عدد و پسوند می‌شکند تا شمارنده انیمیشنی داشته باشد
function parseStat(v) {
  const str = String(v || '');
  const m = str.match(/[0-9۰-۹][0-9۰-۹٬,]*/);
  if (!m) return null;
  const num = parseFloat(toLatin(m[0]).replace(/[٬,]/g, ''));
  if (Number.isNaN(num)) return null;
  return { pre: str.slice(0, m.index), suf: str.slice(m.index + m[0].length), num, group: /[٬,]/.test(m[0]) };
}

const LOGO = <img src="/icon/icon-192.png" alt="" className="logo-mark" aria-hidden="true" />;

export default function Flight({ content }) {
  const rootRef = useRef(null);
  const apiRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(false);
  const [auto, setAuto] = useState(false);
  const [quality, setQuality] = useState('auto');
  const { brand, sections, contact } = content;
  const N = sections.length;
  const ctaSec = sections.find((x) => x.type === 'cta');
  const demoAttr = ctaSec ? { 'data-goto': ctaSec.id } : { 'data-jump': 1 };

  /* صحنه سه‌بعدی */
  useEffect(() => {
    if (!rootRef.current) return undefined;
    let q = 'auto';
    try { q = localStorage.getItem('ap-quality') || 'auto'; } catch (e) { /* ignore */ }
    setQuality(q);
    const inst = startFlight(rootRef.current, content, {
      quality: q,
      onState: (s) => {
        if (s.auto === false) setAuto(false);
        if (typeof s.sound === 'boolean') setSound(s.sound);
      },
    });
    apiRef.current = inst.api;
    return () => { apiRef.current = null; inst.dispose(); };
  }, [content]);

  /* نشانگر موس با انیمیشن (فقط دستگاه‌های دارای موس) */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !window.matchMedia('(pointer: fine)').matches) return undefined;
    const ring = root.querySelector('.cur-ring'), dot = root.querySelector('.cur-dot');
    if (!ring || !dot) return undefined;
    root.classList.add('has-cursor');
    let x = window.innerWidth / 2, y = window.innerHeight / 2, rx = x, ry = y;
    let hover = false, down = false, raf = 0, seen = false;
    const move = (e) => {
      x = e.clientX; y = e.clientY;
      if (!seen) { seen = true; rx = x; ry = y; ring.style.opacity = 1; dot.style.opacity = 1; }
      hover = !!(e.target.closest && e.target.closest('a,button,input,select,textarea,label,[data-hover]'));
    };
    const dn = () => { down = true; }, up = () => { down = false; };
    const leave = () => { ring.style.opacity = 0; dot.style.opacity = 0; seen = false; };
    const loop = () => {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      const vx = x - rx, vy = y - ry, sp = Math.hypot(vx, vy);
      const ang = (Math.atan2(vy, vx) * 180) / Math.PI;
      const stretch = Math.min(sp * 0.018, 0.55);
      const sc = (hover ? 1.85 : 1) * (down ? 0.8 : 1);
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%) rotate(${ang}deg) scale(${sc * (1 + stretch)},${sc * (1 - stretch * 0.45)})`;
      dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${hover ? 0.4 : 1})`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', dn); window.addEventListener('pointerup', up);
    document.documentElement.addEventListener('pointerleave', leave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', dn); window.removeEventListener('pointerup', up);
      document.documentElement.removeEventListener('pointerleave', leave);
      root.classList.remove('has-cursor');
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  const toggleSound = async () => { if (apiRef.current) setSound(await apiRef.current.toggleSound()); };
  const toggleAuto = () => { if (apiRef.current) setAuto(apiRef.current.toggleAuto()); };
  const pickQuality = (q) => {
    setQuality(q);
    try { localStorage.setItem('ap-quality', q); } catch (e) { /* ignore */ }
    if (apiRef.current) apiRef.current.setQuality(q);
  };

  function renderBody(s) {
    switch (s.type) {
      case 'hero':
        return (
          <>
            <h1>{s.title}</h1>
            {s.lead && <p className="lead">{s.lead}</p>}
            {s.cta && <div className="actions"><button className="btn" type="button" {...demoAttr}>{s.cta}</button></div>}
            {s.hint && <p className="hint">{s.hint}</p>}
          </>
        );
      case 'content':
        return (
          <>
            <h2>{s.title}</h2>
            {s.lead && <p className="lead">{s.lead}</p>}
            {s.bullets.length > 0 && <ul>{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
          </>
        );
      case 'steps':
        return (
          <>
            <h2>{s.title}</h2>
            {s.lead && <p className="lead">{s.lead}</p>}
            <ol className="steps">
              {s.steps.map((st, i) => (
                <li key={i}>
                  <span className="n">{toFa(i + 1)}</span>
                  <div><b>{st.title}</b>{st.desc && <small>{st.desc}</small>}</div>
                </li>
              ))}
            </ol>
          </>
        );
      case 'stats':
        return (
          <>
            <h2>{s.title}</h2>
            {s.lead && <p className="lead">{s.lead}</p>}
            <div className="stats">
              {s.items.map((it, i) => {
                const ps = parseStat(it.value);
                return (
                  <div className="stat" key={i}>
                    {ps
                      ? <span className="stat-val" data-num={ps.num} data-pre={ps.pre} data-suf={ps.suf} data-group={ps.group ? '1' : '0'}>{it.value}</span>
                      : <span className="stat-val">{it.value}</span>}
                    <small>{it.label}</small>
                  </div>
                );
              })}
            </div>
          </>
        );
      case 'quotes':
        return (
          <>
            <h2>{s.title}</h2>
            {s.lead && <p className="lead">{s.lead}</p>}
            <div className="qs">
              {s.quotes.map((q, i) => (
                <figure key={i}><blockquote>{q.text}</blockquote><figcaption>{q.author}</figcaption></figure>
              ))}
            </div>
          </>
        );
      case 'cta':
        return (
          <>
            <h2>{s.title}</h2>
            {s.lead && <p className="lead">{s.lead}</p>}
            {s.formEnabled
              ? <LeadForm />
              : <div className="actions"><a className="btn" href={'mailto:' + contact.email}>{s.cta}</a></div>}
            <div className="actions tight">
              {s.formEnabled && <a className="btn ghost" href={'mailto:' + contact.email}>{contact.email}</a>}
              {s.again && <button className="btn ghost" type="button" data-jump="0">{s.again}</button>}
            </div>
          </>
        );
      default:
        return null;
    }
  }

  return (
    <div className="flight" ref={rootRef}>
      <div className="loader" role="status">
        <div className="lo-mark">{LOGO}</div>
        <div className="lo-name"><span>{brand.name}</span></div>
        <div className="lo-tag">{brand.tagline}</div>
        <div className="lo-bar"><i /></div>
        <svg className="lo-plane" viewBox="0 0 48 20" aria-hidden="true"><path d="M2 10 L46 2 L34 18 L26 11 Z" fill="#e4b817" /></svg>
      </div>

      <div className="vignette" aria-hidden="true" />
      <div className="mist" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <header className="bar">
        <a href="#" className="logo" aria-label={brand.name}>
          {LOGO}
          <span className="logo-name">{brand.name}</span>
        </a>
        <button className="btn" type="button" {...demoAttr}>درخواست دمو</button>
      </header>

      <div className="track" style={{ height: N * SEG_VH + 'vh' }} />

      {sections.map((s, i) => {
        const r = sectionRange(i, N);
        return (
          <section className="panel" key={s.id} data-i={i} data-type={s.type} data-a={r.a} data-b={r.b} aria-label={s.label}>
            <div className="card">{renderBody(s)}</div>
          </section>
        );
      })}

      <nav className="hud" aria-label="مسیر پرواز">
        {sections.map((s) => (
          <button key={s.id} type="button" className="stop"><span>{s.label}</span><i /></button>
        ))}
        <div className="pct" />
      </nav>

      <div className="instr" aria-hidden="true">
        <div><small>ارتفاع (فوت)</small><b data-k="alt">۰</b></div>
        <div><small>سرعت (km/h)</small><b data-k="spd">۰</b></div>
        <div><small>جهت</small><b data-k="hdg">۰۰۰°</b></div>
        <div className="cl"><b data-k="cloud">دید آزاد</b></div>
      </div>

      <div className="radar" aria-hidden="true">
        <div className="radar-face">
          <i className="radar-sweep" />
          <i className="radar-blip" style={{ '--a': '35deg', '--d': '17px' }} />
          <i className="radar-blip radar-blip2" style={{ '--a': '160deg', '--d': '23px' }} />
          <i className="radar-blip radar-blip3" style={{ '--a': '270deg', '--d': '13px' }} />
        </div>
        <small>رادار</small>
      </div>

      <div className="tools">
        <button type="button" className="gear" aria-expanded={open} aria-controls="settings" onClick={() => setOpen((v) => !v)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
          <span>تنظیمات پرواز</span>
        </button>
        {open && (
          <div className="settings" id="settings" role="dialog" aria-label="تنظیمات پرواز">
            <div className="st-row">
              <span>صدای پرواز</span>
              <button type="button" role="switch" aria-checked={sound} className="sw" onClick={toggleSound}><i /></button>
            </div>
            <div className="st-row">
              <span>پرواز خودکار</span>
              <button type="button" role="switch" aria-checked={auto} className="sw" onClick={toggleAuto}><i /></button>
            </div>
            <div className="st-row col">
              <span>کیفیت تصویر</span>
              <div className="seg" role="group" aria-label="کیفیت تصویر">
                {[['auto', 'خودکار'], ['high', 'بالا'], ['low', 'کم']].map(([k, l]) => (
                  <button type="button" key={k} aria-pressed={quality === k} onClick={() => pickQuality(k)}>{l}</button>
                ))}
              </div>
            </div>
            <p className="st-hint">با موس هواپیما را هدایت کنید. کلیدهای ↑ و ↓ بین بخش‌ها می‌پرند.</p>
          </div>
        )}
      </div>

      <div className="scrollhint" aria-hidden="true">
        <span>اسکرول کنید</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </div>

      <SiteFooter content={content} />

      <div className="cur-ring" aria-hidden="true" />
      <div className="cur-dot" aria-hidden="true" />
    </div>
  );
}
