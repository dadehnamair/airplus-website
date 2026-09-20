import { notFound } from 'next/navigation';
import { readContent } from '@/lib/content';
import StaticHeader from '@/components/StaticHeader';
import SiteFooter from '@/components/SiteFooter';
import posts from '@/data/blog.json';
import '@/components/static.css';

const FA = '۰۱۲۳۴۵۶۷۸۹';
const toFa = (s) => String(s).replace(/\d/g, (d) => FA[d]);

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return {};
  return { title: post.title + ' | ایرپلاس', description: post.excerpt };
}

export default async function BlogPostPage({ params }) {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const content = await readContent();
  const { brand } = content;

  return (
    <div className="flight static-page">
      <StaticHeader brand={brand} />

      <article className="blog-post">
        <time dir="ltr">{toFa(post.date)}</time>
        <h1>{post.title}</h1>
        <p className="lead">{post.excerpt}</p>
        <div className="content">
          {post.content.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </article>
      <a className="blog-back" href="/blog">← بازگشت به وبلاگ</a>

      <SiteFooter content={content} isFlightPage={false} />
    </div>
  );
}
