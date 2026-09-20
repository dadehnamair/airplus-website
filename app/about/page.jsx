import { readContent } from '@/lib/content';
import StaticHeader from '@/components/StaticHeader';
import SiteFooter from '@/components/SiteFooter';
import '@/components/static.css';

export const metadata = {
  title: 'درباره ما | ایرپلاس',
  description: 'ایرپلاس ابزار یکپارچه آژانس‌های مسافرتی است، از اتوماسیون فروش تا گزارش‌گیری دقیق.',
};

export default async function AboutPage() {
  const content = await readContent();
  const { brand, footer, contact, sections } = content;
  const quotesSection = sections.find((s) => s.type === 'quotes');
  const salesSection = sections.find((s) => s.id === 's-sales');
  const reportsSection = sections.find((s) => s.id === 's-reports');
  const settleSection = sections.find((s) => s.type === 'steps');

  return (
    <div className="flight static-page">
      <StaticHeader brand={brand} />

      <section className="st-hero">
        <small>درباره {brand.name}</small>
        <h1>{brand.tagline}</h1>
        <p>{footer.about}</p>
      </section>

      <section className="st-section">
        <h2>چرا {brand.name}؟</h2>
        <p className="lead">{content.sections[0].lead}</p>
        <div className="st-grid">
          <div className="st-card">
            <h3>{salesSection.title}</h3>
            <p>{salesSection.lead}</p>
          </div>
          <div className="st-card">
            <h3>{settleSection.title}</h3>
            <p>{settleSection.lead}</p>
          </div>
          <div className="st-card">
            <h3>{reportsSection.title}</h3>
            <p>{reportsSection.lead}</p>
          </div>
        </div>
      </section>

      {quotesSection && (
        <section className="st-section">
          <h2>{quotesSection.title}</h2>
          <div className="st-quotes">
            {quotesSection.quotes.map((q, i) => (
              <figure className="st-quote" key={i}>
                <blockquote>{q.text}</blockquote>
                <figcaption>{q.author}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="st-section">
        <div className="st-cta">
          <h2>آماده‌اید آژانس خودتان را ساده‌تر اداره کنید؟</h2>
          <p>اطلاعاتتان را بگذارید تا برای یک جلسه دمو با شما تماس بگیریم؛ یا مستقیم با ما تماس بگیرید.</p>
          <div className="actions">
            <a className="btn" href="/">درخواست دمو</a>
            <a className="btn ghost" href={'mailto:' + contact.email}>{contact.email}</a>
          </div>
        </div>
      </section>

      <SiteFooter content={content} isFlightPage={false} />
    </div>
  );
}
