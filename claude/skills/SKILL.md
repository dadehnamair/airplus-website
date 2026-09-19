---
name: seo-geo-coding
description: قواعد اجباری SEO، GEO (Generative Engine Optimization) و Google Search Console هنگام کدنویسی سایت عمومی Next.js (App Router) این پروژه. Use this skill whenever code is written or changed that touches a public-facing route under frontend/src/app, a page/layout component, metadata (`export const metadata` / `generateMetadata`), `sitemap.ts`, `robots.ts`, a future `llms.txt` route, JSON-LD/schema.org, canonical URLs, breadcrumbs, internal links, `next.config.ts` redirects, slugs, pagination, or blog/legal/docs content — even if the user never mentions SEO. Also trigger for words like سئو، جستجو، گوگل، سرچ کنسول، ایندکس، کراول، اسکیما، ساختار داده، ریچ‌ریزالت، لینک داخلی، بردکرامب، نقشه سایت، صفحه جدید، مقاله، لندینگ، هوش مصنوعی، ChatGPT، Perplexity، AI Overviews. Do NOT use for admin-panel/ (separate app, no auth-gated dashboard needs no SEO), or pure backend logic with no public HTML output.
---

# کدنویسی مبتنی بر SEO + GEO + Search Console (Next.js App Router)

هر صفحهٔ عمومی دو مخاطب دارد: **خزندهٔ موتور جستجو** (گوگل) و **موتور پاسخ‌گوی هوش مصنوعی** (ChatGPT، Perplexity، Claude، Gemini، AI Overviews). یک صفحه وقتی «تمام» است که هر دو بتوانند آن را **کشف، بخوانند، بفهمند و به آن استناد کنند**، و در Search Console هم وضعیت سالم داشته باشد. پس سئو مرحلهٔ بعد از کدنویسی نیست؛ بخشی از تعریف «کار تمام‌شده» است.

این سند مخصوص استک واقعی این پروژه است: **`frontend/`** یک اپ Next.js 16 (App Router) با محتوای عمومی است — نه Laravel/Blade. صفحات `home`/`about`/`contact`/`legal` محتوایشان از بک‌اند FastAPI می‌آید (`getPageSections`/`getSectionContent` در `src/lib/content/api.ts`)؛ `pricing` و `blog`/مجله هنوز هاردکدند (`src/data/pricing.ts`, `src/data/articles.ts`) طبق `claude/CLAUDE.md`. `admin-panel/` اپ جدای دیگری‌ست و مخاطب عمومی/موتور جستجو ندارد — این اسکیل به آن اعمال نمی‌شود.

## وضعیت فعلی پروژه (قبل از هر کاری این را بدان)

این پروژه هنوز لایه‌های مشترک سئو را **ندارد** — برخلاف پروژه‌های بالغ‌تر، اینجا چیزی برای «فقط مصرف کردن» آماده نیست؛ کارت این است که هرکدام را **اولین بار که لازم شد بسازی**، با ساختار قابل‌استفادهٔ مجدد، نه صرفاً برای همان صفحه:

| موجود است | وضعیت | ندارد و اولین‌بار باید ساخته شود |
| --- | --- | --- |
| `src/app/layout.tsx` → `export const metadata` سراسری (title template، OG، twitter، robots پیش‌فرض) | ✅ هست، اما `openGraph.images`/`twitter.images` پیش‌فرض ندارد | — |
| `src/app/sitemap.ts` | ✅ هست ولی فقط `/` را برمی‌گرداند | باید تمام مسیرهای ایندکس‌شدنی را لیست کند |
| `src/app/robots.ts` | ✅ هست، `allow: "/"` برای همه | Disallow برای مسیر خصوصی، هروقت ساخته شد |
| هر صفحه: `export const metadata` هاردکد | ✅ هست (title/description ثابت، نه از محتوای دیتابیسی) | canonical، OG image، JSON-LD — هیچ‌کدام نیست |
| — | — | `src/lib/seo/` (canonical builder، JSON-LD builderها) |
| — | — | JSON-LD به هر شکل (`application/ld+json` در کل `src/` صفر مورد است) |
| — | — | کامپوننت مشترک بردکرامب (الان هر صفحه UI بردکرامب را دستی و بدون JSON-LD تکرار می‌کند: `legal/page.tsx`, `blog/page.tsx`, `contact/ContactForm.tsx`, `about/Hero.tsx`) |
| `next/font/local` با `display: "swap"` در `src/fonts.ts` | ✅ درست پیاده شده، دست نزن | — |
| — | — | `next/image` (الان `<img>` خام در `Hero.tsx`های home/about و `Team.tsx`) |
| — | — | `app/icon.*`, `app/apple-icon.*`, `app/opengraph-image.*` (favicon/OG image پیش‌فرض) |
| — | — | `/llms.txt`, `/llms-full.txt` (باید Route Handler باشد، نه فایل استاتیک، چون محتوا باید از صفحات واقعی جمع شود) |
| هیچ i18n/hreflang | سایت تک‌زبانه (`fa-IR`/RTL) | تا وقتی زبان دوم اضافه نشده، hreflang **نساز** — سیگنال الکی بدتر از نبودنش است |
| تست خودکار frontend | طبق `claude/CLAUDE.md` هنوز پیکربندی نشده | ادعای «تست نوشتم» نکن؛ به جایش بخش «۱۱» پایین را ببین |

## اصل بنیادین: سازندهٔ مشترک بساز، در هر صفحه دستی تکرار نکن

نوشتن دستیِ JSON-LD یا بردکرامب در هر صفحه به‌مرور دراپت می‌کند (شکلی که در `og:image` یا کانونیکال ندارد، بردکرامب نمایشی و JSON-LD از هم جدا می‌مانند). پس اگر سازندهٔ مناسب برای نیازت وجود ندارد:

1. اول زیر `src/lib/seo/` بساز (مثلاً `src/lib/seo/canonical.ts`, `src/lib/seo/schema.ts`, `src/lib/seo/breadcrumbs.ts`) — تابع خالص TypeScript، بدون وابستگی به یک صفحهٔ خاص.
2. بعد در همان PR مصرفش کن.
3. اگر یک هلپر برای همه چیز کافی نیست (مثلاً builder جدید برای نوع Schema.org تازه)، همان الگوی موجود را کپی کن، نه ساختار متفاوت.

## گردش کار — برای هر صفحه/قابلیت عمومی جدید

### ۱. تصمیم اولیه: این صفحه ایندکس شود یا نه؟

- **عمومی و ارزشمند** → مسیر کامل پایین.
- **تراکنشی/خصوصی** (اگر بعداً به `frontend/` اضافه شد؛ فعلاً چنین مسیری در این اپ نیست) → در `export const metadata` مقدار `robots: { index: false, follow: false }` بگذار + مسیر را در `src/app/robots.ts` به `disallow` اضافه کن + از `src/app/sitemap.ts` خارج نگه‌دار. نکتهٔ ترکیب `noindex` + `Disallow` در `references/search-console.md` است — بخوان.

### ۲. متادیتا (`<head>`)

فقط از Metadata API نکست استفاده کن؛ هرگز JSX دستی `<head>` ننویس:

- صفحهٔ استاتیک (مثل `pricing`, `blog` که هاردکدند) → `export const metadata: Metadata = {...}` مثل الگوی فعلی.
- صفحهٔ محتوایش از بک‌اند می‌آید (`home`, `about`, `contact`, `legal`) → وقتی محتوای واقعی صفحه (مثلاً `PageIntroContent.title`/`description`) می‌تواند متای دقیق‌تری از رشتهٔ هاردکد فعلی بدهد، از `generateMetadata` async استفاده کن که همان `getPageSections`/`getSectionContent` را صدا می‌زند؛ اگر بک‌اند فیلد اختصاصی متا (`meta_title`/`meta_description`) ندارد، از عنوان/توضیح بخش اصلی به‌عنوان fallback استفاده کن، هاردکد را کاملاً کنار نگذار مگر مطمئنی محتوا همیشه هست.
- `title`/`description` **یکتا در کل سایت**، توصیفیِ همان صفحه؛ برند از `template` در `layout.tsx` خودکار اضافه می‌شود، دوباره ننویس.
- `alternates: { canonical: ... }` بگذار (فعلاً هیچ صفحه‌ای این را ندارد — این یک گپ فعال است). اگر URL چند شکل دارد (query/ترتیب پارامتر)، canonical به نسخهٔ اصلی بدون query اشاره کند. برای ساختن URL مطلق از `process.env.NEXT_PUBLIC_SITE_URL` (همان الگوی `layout.tsx`/`sitemap.ts`)، نه هاردکد دامنه.
- `openGraph.images`/`twitter.images` مطلق باشد؛ چون `layout.tsx` فعلاً هیچ‌کدام را پیش‌فرض ندارد، اولین صفحه‌ای که این را اضافه می‌کند باید هم دیفالت سراسری در `layout.tsx` را بگذارد هم امکان override در `generateMetadata` صفحه را بدهد.
- صفحات هاردکد (`pricing`, `blog`) هم دقیقاً همین ساختار Metadata API را رعایت کنند، فقط منبع رشته‌ها هاردکد است.

### ۳. ساختار HTML معنایی

- **دقیقاً یک `<h1>`** برای هر صفحه؛ سلسله‌مراتب `h2 → h3` بدون پرش.
- محتوای اصلی داخل `<main>` (الگوی فعلی همهٔ صفحات همین است — نگه‌دار)؛ ناوبری داخل `<nav>`؛ مقاله داخل `<article>`.
- هر تصویر `alt` توصیفی دارد. برای تصاویر جدید از `next/image` استفاده کن (نه `<img>` خام مثل `Hero.tsx`/`Team.tsx` فعلی) تا `width`/`height`/`sizes` صریح باشد و CLS کنترل شود؛ تصویر LCP هرگز `loading="lazy"` نگیرد و باید `priority` داشته باشد.
- لینک‌های داخلی با `next/link` (`<Link href>`)، نه `onclick`/JS محض — خزنده لینک JS-only را نمی‌بیند.
- چون این صفحات **Server Component** هستند (بدون `"use client"` در بالای فایل — مثل الگوی فعلی `page.tsx`ها)، محتوای اصلی همین‌طور در HTML اولیه رندر می‌شود؛ این را حفظ کن. محتوای مهم (متن، قیمت، سؤال‌های متداول) را داخل یک `"use client"` که فقط بعد از هیدریشن یا با فچ سمت کلاینت پر می‌شود نبر — هم برای خزندهٔ کلاسیک هم برای ربات‌های AI که اغلب JS اجرا نمی‌کنند حیاتی است.
- اعداد نمایشیِ ماک‌UI (تزئینی) `aria-hidden` هستند و ادعای آماری نیستند.

### ۴. بردکرامب: یک آرایه، دو خروجی

الان هر صفحه (`legal`, `blog`, `contact`, `about`) بردکرامب UI را دستی و جدا می‌نویسد و هیچ‌کدام JSON-LD ندارند. اولین‌باری که بردکرامب لازم شد:

1. یک کامپوننت مشترک `src/components/ui/Breadcrumbs.tsx` بساز که `items: {label, href?}[]` می‌گیرد (آیتم آخر بدون لینک).
2. یک builder `src/lib/seo/schema.ts` بساز که از همان آرایه `BreadcrumbList` (schema.org) می‌سازد.
3. صفحات موجود که بردکرامب دستی دارند را وقتی دوباره لمسشان می‌کنی به این الگو کوچ بده؛ صفحهٔ کاملاً جدید از ابتدا با این الگو برود.

هر صفحهٔ ایندکس‌شوندهٔ غیر از صفحهٔ اصلی بردکرامب دارد.

### ۵. JSON-LD (هم برای گوگل، هم برای LLM)

فعلاً صفر مورد JSON-LD در پروژه هست — این یعنی یک لایهٔ کامل باید از صفر ساخته شود، نه اینکه سازنده‌ای هست و فراموش شده:

- یک کامپوننت مشترک بساز، مثلاً:
  ```tsx
  // src/components/seo/JsonLd.tsx
  export function JsonLd({ data }: { data: object }) {
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
    );
  }
  ```
  و در `src/lib/seo/schema.ts` توابع builder ناب TypeScript برای هر نوع گره (`organization()`, `website()`, `breadcrumbList()`, `faqPage()`, `product()`, …) که فقط کلیدهای غیرخالی برمی‌گردانند.
- **`Organization`/`WebSite` را فقط یک‌بار تعریف کن** — طبیعی‌ترین جا `layout.tsx` است (روی همهٔ صفحات رندر می‌شود). در JSON-LD صفحات دیگر با `{"@id": "{siteUrl}/#organization"}` ارجاع بده، دوباره تعریف نکن. تست بعدی باید تضمین کند در HTML خروجی هر صفحه **دقیقاً یک** `Organization` با همان `@id` هست.
- نوع گره را متناسب با محتوا انتخاب کن: `WebPage`/`CollectionPage`/`AboutPage`/`BlogPosting`/`FAQPage`/`HowTo`/`Product`+`Offer`/`BreadcrumbList`. `QAPage` برای پرسش‌وپاسخ تک‌جوابی درست نیست؛ `FAQPage` درست است.
- قیمت (`pricing`) همیشه به **ریال** و `priceCurrency` = `IRR`، عدد خام لاتین.
- `Product`/`Offer` (اگر/وقتی برای `pricing` ساخته شد) کامل باشد: `image`، `sku`/`mpn` در دسترس، `priceValidUntil`، `itemCondition`، `seller` (ارجاع به همان `Organization`). گرهٔ لخت در Search Console به‌عنوان merchant listing ناقص هشدار می‌گیرد.
- **ضدجعل (بسیار مهم):** هیچ عددی در JSON-LD منتشر نکن مگر اثبات‌پذیر باشد. `aggregateRating`/`review` فقط از دادهٔ واقعی تأییدشده (این پروژه فعلاً چنین دیتایی ندارد — نساز). فیلدهای اختیاری (`sameAs`, `foundingDate`, …) فقط وقتی مقدار واقعی در `content`/env هست؛ هرگز `""` یا `[]`.
- نودهای `FAQPage`/`HowTo` را «پاکسازی» نکن: گوگل ریچ‌ریزالتشان را کم/حذف کرده اما ChatGPT/Perplexity مصرفشان می‌کنند و برای بازیابی LLM ارزش دارند.
- هر بلوک `<script type="application/ld+json">` سطح‌بالا و مستقل باشد، هرگز تودرتو.
- محتوای JSON-LD باید با محتوای **مرئی** صفحه یکی باشد. مارک‌آپی که در صفحه دیده نمی‌شود خلاف رهنمود گوگل است و در Search Console به «اقدام دستی» می‌رسد.

### ۶. لینک‌دهی داخلی

- **متن لینک توصیف مقصد باشد** («مقایسهٔ تعرفه‌ها و پلن‌ها»)، هرگز «اینجا»/«بیشتر»/«کلیک کنید».
- **هیچ صفحهٔ ایندکس‌شوندهٔ یتیم نماند:** هر مسیر جدید حداقل از یکی از این‌ها لینک بگیرد: فوتر (`getSectionContent` روی `page_key="global"`, section `footer`)، ناوبری (`navbar`)، یا لینک صریح داخل محتوای یک صفحهٔ دیگر. علاوه بر آن در `src/app/sitemap.ts` باشد.

### ۷. کشف صفحه: sitemap، robots، llms

- هر مسیر ایندکس‌شدنی جدید را به آرایهٔ `src/app/sitemap.ts` اضافه کن (فعلاً فقط `/` آنجاست — این یعنی `about`/`contact`/`pricing`/`legal`/`blog` هم‌اکنون در sitemap نیستند و باید همین حالا یا در اولین لمس بعدی اضافه شوند). هر ورودی `url`/`lastModified`/`changeFrequency`/`priority` واقعی داشته باشد؛ `lastModified` ساختگی (همیشه `new Date()`) گوگل را وادار می‌کند کل سیگنال `lastmod` را نادیده بگیرد — فقط وقتی تاریخ واقعی تغییر محتوا در دسترس است بگذار.
- صفحهٔ `noindex`/redirect/غیرکانونیکال **هرگز** در sitemap نیاید.
- مسیر خصوصی جدید → در `src/app/robots.ts` به آرایهٔ `disallow` اضافه شود. دامنه از `process.env.NEXT_PUBLIC_SITE_URL`، نه هاردکد.
- محتوای عمومی مهم جدید (وقتی حجم محتوا آن‌قدر بزرگ شد که ارزش دارد): `/llms.txt` و `/llms-full.txt` را به‌شکل Route Handler بساز (`src/app/llms.txt/route.ts` که `text/plain` برمی‌گرداند)، نه فایل استاتیک — چون محتوا باید از صفحات/بک‌اند جمع شود، نه دستی نگه‌داری. تا وقتی این نیاز واقعی نشده، نساز.
- خزندهٔ AI جدید (`GPTBot`, `PerplexityBot`, …) را در `src/app/robots.ts` صریح `allow` کن؛ `disallow`های موجود را برای آن‌ها کم نکن.

### ۸. محتوای بلند (بلاگ، صفحات حقوقی)

فعلاً `blog` هاردکد است (بدون صفحهٔ تک‌مقاله، بدون رندرر مارک‌داون) و `legal` متن ساده با `whitespace-pre-line` است (بدون مارک‌داون). یعنی این بخش فعلاً بیشتر **پیش‌نیاز برای وقتی این قابلیت‌ها ساخته شدند** است:

- اگر/وقتی صفحهٔ تک‌مقاله (`app/blog/[slug]/page.tsx`) یا رندر مارک‌داون اضافه شد، هر `h2`/`h3` باید اسلاگ `id` یکتا بگیرد (لنگر لینک‌پذیر؛ برای استناد دقیق AI به بخش خاص هم لازم است) — یک کتابخانهٔ رندر مارک‌داون (`react-markdown`+`rehype-slug` یا مشابه) وقتی اضافه شد را با این قید انتخاب کن.
- ساختار پاسخ‌محور برای GEO: زیر هر `h2`، **جملهٔ اول مستقیماً پاسخ/تعریف** باشد (قابل نقل)، سپس جزئیات. تعریف‌ها/مقایسه‌ها/مراحل به‌شکل لیست یا جدول واقعی، نه پاراگراف فشرده. این قاعده حتی روی متن ساده و هاردکد فعلی هم اعمال می‌شود، نه فقط محتوای مارک‌داون آینده.
- `BlogPosting` (وقتی صفحهٔ تک‌مقاله ساخته شد) با `datePublished`/`dateModified` واقعی، `author`، `publisher` (`@id` سازمان)، `image`، `mainEntityOfPage`.

### ۹. URL، slug و redirect

- URLها کوتاه، خوانا، ثابت، حروف کوچک، با خط تیره.
- **تغییر مسیر = ۳۰۱** با `redirects()` در `next.config.ts` (`{ source, destination, permanent: true }`)، نه `302`/۴۰۲/۴۰۴، و به‌روزرسانی لینک‌های داخلی + `sitemap.ts` + canonical. زنجیرهٔ ریدایرکت نساز (مقصد نهایی مستقیم).
- مسیر ناموجود باید **HTTP 404 واقعی** برگرداند — از `notFound()` (`next/navigation`) داخل صفحه استفاده کن تا `not-found.tsx` موجود رندر شود، نه یک پیام «پیدا نشد» با کد ۲۰۰ (soft 404 در Search Console).
- یک نسخه از هر صفحه: `www`/بدون `www`، `http`/`https` و پارامترهای ردیابی به یک canonical برسند.
- صفحه‌بندی (اگر بعداً برای بلاگ اضافه شد): هر صفحه canonical خودش را دارد، با `<Link>` واقعی بین صفحات.

### ۱۰. عملکرد و Core Web Vitals

**LCP** (هدف < ۲٫۵ ثانیه)، **INP** (< ۲۰۰ میلی‌ثانیه)، **CLS** (< ۰٫۱) — گوگل این‌ها را در Search Console گزارش می‌دهد و روی رتبه اثر دارد:

- تصاویر جدید با `next/image` (ابعاد صریح خودکار → CLS پایین)؛ تصویر LCP با `priority`، بدون `loading="lazy"`.
- فونت با `next/font/local` + `display: "swap"` — الگوی فعلی `src/fonts.ts` همین است، دست نزن.
- کامپوننت‌های `"use client"` را کوچک و اسکوپ‌شده نگه‌دار (نه کل صفحه)؛ ویجت سنگین فقط سمت کلاینت را با `next/dynamic` لود کن تا روی INP و باندل اولیه اثر نگذارد.
- بدون تزریق محتوا بالای محتوای موجود پس از بارگذاری (لایوت‌شیفت).

### ۱۱. راستی‌آزمایی قبل از اعلام «تمام» (به‌جای تست خودکار)

`frontend/` طبق `claude/CLAUDE.md` هنوز تست خودکار ندارد — ادعای «تست نوشتم» نکن. به‌جایش دستی این‌ها را بررسی کن:

- `npm run build` بدون خطا.
- View-source (نه فقط DevTools رندرشده) صفحه: دقیقاً یک `<h1>`، یک `<link rel="canonical">`، JSON-LD معتبر (`json_decode`-پذیر، بدون تودرتو).
- Rich Results Test / Schema Markup Validator برای هر گرهٔ جدید.
- `priceCurrency` = `IRR` برای صفحات قیمت.
- مسیر جدید در خروجی `src/app/sitemap.ts` هست؛ صفحات `noindex` در آن نیستند.
- اگر بعداً یک فریم‌ورک تست به `frontend/` اضافه شد، این چک‌ها را به تست Feature تبدیل کن (نه قبلش).

### ۱۲. مستندسازی

این پروژه معادل `docs/seo.md`/`docs/geo.md` ندارد. بعد از افزودن یک builder/مسیر/الگوی جدید سئو، در خلاصهٔ کارت به کاربر (نه در یک فایل مستندات جدید که کسی نخواسته) بگو چه سازنده‌ای کجا اضافه شد، تا در کار بعدی قابل کشف باشد.

## Search Console: چه چیزی را از ابتدا درست بسازیم

جزئیات کامل و نگاشت «وضعیت گزارش ← علت در کد ← راه‌حل» در `references/search-console.md` است. **هر وقت** کار به ایندکس‌شدن، کراول، خطای Coverage/Pages، Rich Results، Core Web Vitals، redirect، sitemap یا robots مربوط شد آن فایل را بخوان. چکیدهٔ ذهنی:

1. گوگل باید صفحه را **بتواند کراول کند** (robots، ۲۰۰، بدون وابستگی به JS برای محتوا — که چون Server Component است پیش‌فرض برقرار است، مراقب باش نشکنی).
2. باید **بخواهد ایندکس کند** (محتوای یکتا و مفید، canonical درست، بدون `noindex` ناخواسته، در sitemap، لینک داخلی).
3. باید **مارک‌آپ معتبر** ببیند که با محتوای مرئی یکی است.
4. باید **تجربهٔ صفحهٔ سالم** ببیند (CWV، موبایل‌فرندلی، HTTPS).

## چک‌لیست نهایی پیش از ارائهٔ کار

قبل از اینکه بگویی کار تمام است، با `references/checklist.md` صفحه/قابلیت را مرور کن. اگر مورد نامعلومی ماند، به کاربر بگو، حدس نزن و عدد یا ادعای اثبات‌نشده وارد مارک‌آپ نکن.

## اشتباهات پرتکرار (نکن)

- JSX دستی `<head>` به‌جای `export const metadata`/`generateMetadata`.
- `Organization` دوباره تعریف‌شده روی صفحهٔ داخلی (باید فقط در `layout.tsx` باشد، بقیه با `@id` ارجاع بدهند).
- `Product` بدون `image`/قیمت به تومان یا دلار به‌جای ریال.
- `aggregateRating`/`review` ساختگی یا آمار اثبات‌نشده در JSON-LD.
- متن لینک «اینجا»/«بیشتر»؛ صفحه‌ای که هیچ لینک ورودی ندارد.
- افزودن صفحهٔ جدید بدون اضافه‌کردنش به `src/app/sitemap.ts` و بدون بردکرامب.
- محتوای اصلی که فقط داخل یک `"use client"` وابسته به فچ کلاینتی ظاهر می‌شود.
- تغییر مسیر بدون `redirects()` ۳۰۱ در `next.config.ts`.
- صفحهٔ خطا با کد ۲۰۰ به‌جای `notFound()`.
- ساختن hreflang برای سایتی که هنوز تک‌زبانه است.
- `<img>` خام برای تصویر جدید به‌جای `next/image`.
