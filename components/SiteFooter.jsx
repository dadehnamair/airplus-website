'use client';

const isExternal = (h) => /^https?:\/\//.test(h);

export default function SiteFooter({ content }) {
  const { brand, sections, footer, contact } = content;
  const link = (l, i) => (
    <li key={i}>
      <a href={l.href || '#'} {...(isExternal(l.href || '') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{l.label}</a>
    </li>
  );

  return (
    <footer className="site-footer">
      <div className="sf-runway" aria-hidden="true" />
      <div className="sf-inner">
        <div className="sf-brand">
          <div className="sf-word" aria-label={brand.name}>{brand.name}</div>
          <p>{footer.about}</p>
          {footer.social.length > 0 && (
            <ul className="sf-social" aria-label="شبکه‌های اجتماعی">
              {footer.social.map((s, i) => (
                <li key={i}><a href={s.href || '#'} {...(isExternal(s.href || '') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{s.label}</a></li>
              ))}
            </ul>
          )}
        </div>

        <nav className="sf-col" aria-label="مسیر پرواز">
          <h3>مسیر پرواز</h3>
          <ul>
            {sections.map((s) => (
              <li key={s.id}><a href="#" data-goto={s.id}>{s.label}</a></li>
            ))}
          </ul>
        </nav>

        {footer.columns.map((c, i) => (
          <nav className="sf-col" key={i} aria-label={c.title}>
            <h3>{c.title}</h3>
            <ul>{c.links.map(link)}</ul>
          </nav>
        ))}

        <div className="sf-col sf-contact">
          <h3>تماس با ما</h3>
          <address>
            <p>{contact.address}</p>
            {contact.phones.map((p, i) => <p key={i} className="sf-phone">{p}</p>)}
            <p><a href={'mailto:' + contact.email} dir="ltr">{contact.email}</a></p>
          </address>
        </div>
      </div>

      <div className="sf-bottom">
        <span>{footer.copyright}</span>
        {footer.credit && <span>{footer.credit}</span>}
        {footer.legal.length > 0 && <ul className="sf-legal">{footer.legal.map(link)}</ul>}
        <button type="button" className="sf-top" data-jump="0">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          پرواز دوباره
        </button>
      </div>

      <p className="sf-credits">
        مدل سه‌بعدی هواپیما: «Airbus A320-200 V2» اثر{' '}
        <a href="https://sketchfab.com/fDlruosne" target="_blank" rel="noopener noreferrer">Dlourine</a>{' '}
        (<a href="https://sketchfab.com/3d-models/airbus-a320-200-v2-c078f9af15884a6b820c7e778831b110" target="_blank" rel="noopener noreferrer">Sketchfab</a>)
        با مجوز <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>؛ با تغییر رنگ و ساده‌سازی برای این سایت.
      </p>
    </footer>
  );
}
