# چک‌لیست نهایی SEO + GEO + Search Console (Next.js App Router)

قبل از اعلام «تمام شد» هر بخش را مرور کن. مواردی که به کار فعلی مربوط نیستند را رد کن، ولی رد‌کردن را عمدی انجام بده.

## الف) پایه (همهٔ صفحات عمومی)
- [ ] `<head>` فقط از `export const metadata` یا `generateMetadata` (نه JSX دستی)
- [ ] `title`/`description` یکتا و توصیفی (description ≤ ۱۶۰ کاراکتر)
- [ ] `alternates.canonical` ست شده، بدون query، یک‌بار
- [ ] `openGraph.images`/`twitter.images` مطلق؛ `robots: { index: false }` فقط برای تراکنشی/خصوصی
- [ ] دقیقاً یک `<h1>`؛ سلسله‌مراتب h2/h3 بدون پرش
- [ ] تصاویر جدید با `next/image` (`alt`, ابعاد صریح)؛ بدون `loading="lazy"` روی LCP
- [ ] محتوای مهم در Server Component رندر می‌شود (نه پشت `"use client"` + فچ کلاینتی)
- [ ] لینک‌های داخلی با `next/link` و متن توصیفی

## ب) ساختار و لینک
- [ ] بردکرامب با کامپوننت مشترک (`src/components/ui/Breadcrumbs.tsx` وقتی ساخته شد) + همان آرایه برای JSON-LD
- [ ] حداقل یک لینک ورودی (فوتر/ناوبری/لینک از صفحهٔ دیگر)
- [ ] slug تمیز؛ اگر تغییر کرد `redirects()` ۳۰۱ در `next.config.ts` + اصلاح لینک‌های داخلی

## پ) Structured data (JSON-LD)
- [ ] فقط از builderهای `src/lib/seo/schema.ts` (وقتی ساخته شدند)، نه `JSON.stringify` پراکنده با شکل دلبخواه
- [ ] `Organization`/`WebSite` فقط در `layout.tsx`؛ بقیهٔ صفحات با `@id` ارجاع می‌دهند
- [ ] نوع گره مناسب (WebPage/CollectionPage/AboutPage/BlogPosting/FAQPage/HowTo/Product)
- [ ] `Product`/`Offer` (اگر مربوط است) کامل؛ قیمت ریال، `IRR`، عدد خام لاتین
- [ ] هیچ عدد/نظر/امتیاز اثبات‌نشده؛ کلیدهای اختیاری خالی منتشر نمی‌شوند
- [ ] JSON-LD با محتوای مرئی صفحه یکی است
- [ ] بلوک‌ها سطح‌بالا و غیرتودرتو

## ت) کشف و کراول
- [ ] URL جدید در آرایهٔ `src/app/sitemap.ts`
- [ ] صفحهٔ noindex/redirect در sitemap نیست
- [ ] مسیر خصوصی جدید در آرایهٔ `disallow` در `src/app/robots.ts`
- [ ] `lastModified` در sitemap واقعی است، نه همیشه `new Date()`
- [ ] (اگر مربوط است) محتوای عمومی جدید در `/llms.txt`/`/llms-full.txt`
- [ ] خزندهٔ AI جدید فقط با `allow` صریح در `src/app/robots.ts`

## ث) GEO (قابلیت استناد برای موتورهای پاسخ‌گو)
- [ ] هر h2 با جملهٔ پاسخ/تعریف مستقیم شروع می‌شود
- [ ] تعریف/مقایسه/مراحل به‌شکل لیست یا جدول
- [ ] (وقتی رندر مارک‌داون اضافه شد) لنگر `id` یکتا روی عنوان‌ها
- [ ] هویت برند یکدست (یک `Organization` واحد)
- [ ] بدون cloaking: HTML یکسان برای همهٔ خزنده‌ها و کاربران

## ج) Search Console
- [ ] سیگنال‌ها هم‌جهت: canonical = sitemap = لینک داخلی
- [ ] ۴۰۴ واقعی با `notFound()` برای ناموجود؛ بدون soft 404 و بدون زنجیرهٔ ریدایرکت
- [ ] CWV: ابعاد تصویر (`next/image`)، فونت swap (`next/font` — قبلاً درست است)، `"use client"` حداقلی
- [ ] Rich Results Test برای گره‌های جدید بدون خطا
- [ ] موبایل‌فرندلی؛ محتوای موبایل = دسکتاپ

## چ) راستی‌آزمایی (به‌جای تست خودکار، چون `frontend/` هنوز test suite ندارد)
- [ ] `npm run build` بدون خطا
- [ ] View-source دستی: h1/canonical/JSON-LD یکتا و معتبر
- [ ] به کاربر گفته شد پس از انتشار در Search Console چه چیزی را بررسی کند
- [ ] اگر builder/مسیر سئوی جدیدی ساخته شد، در خلاصهٔ کار به کاربر ذکر شد (این پروژه فایل مستندات پوشش ندارد)
