const LOGO = <img src="/icon/icon-192.png" alt="" className="logo-mark" aria-hidden="true" />;

export default function StaticHeader({ brand }) {
  return (
    <header className="st-bar">
      <a href="/" className="logo" aria-label={brand.name}>
        {LOGO}
        <span className="logo-name">{brand.name}</span>
      </a>
      <nav className="st-nav" aria-label="ناوبری">
        <a href="/about">درباره ما</a>
        <a href="/blog">وبلاگ</a>
      </nav>
      <a className="btn" href="/">درخواست دمو</a>
    </header>
  );
}
