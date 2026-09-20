import { readContent } from '@/lib/content';
import StaticHeader from '@/components/StaticHeader';
import SiteFooter from '@/components/SiteFooter';
import posts from '@/data/blog.json';
import '@/components/static.css';

const FA = '۰۱۲۳۴۵۶۷۸۹';
const toFa = (s) => String(s).replace(/\d/g, (d) => FA[d]);

export const metadata = {
  title: 'وبلاگ | ایرپلاس',
  description: 'یادداشت‌هایی درباره فروش بلیت، تسویه با ایرلاین و گزارش‌گیری برای آژانس‌های مسافرتی.',
};

export default async function BlogPage() {
  const content = await readContent();
  const { brand } = content;
  const sorted = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="flight static-page">
      <StaticHeader brand={brand} />

      <section className="st-hero">
        <small>وبلاگ {brand.name}</small>
        <h1>یادداشت‌هایی برای اداره‌ی بهتر آژانس مسافرتی</h1>
        <p>درباره فروش بلیت، تسویه با ایرلاین و گزارش‌گیری؛ از تجربه‌ی آژانس‌هایی که با {brand.name} کار می‌کنند.</p>
      </section>

      <div className="blog-list">
        {sorted.map((p) => (
          <a className="blog-card" key={p.slug} href={'/blog/' + p.slug}>
            <time dir="ltr">{toFa(p.date)}</time>
            <h2>{p.title}</h2>
            <p>{p.excerpt}</p>
            {p.tag && <span className="blog-tag">{p.tag}</span>}
          </a>
        ))}
      </div>

      <SiteFooter content={content} isFlightPage={false} />
    </div>
  );
}
