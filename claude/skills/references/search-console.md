# راهنمای Google Search Console برای این پروژه (Next.js App Router)

هدف: کدی بنویسیم که **در Search Console وضعیت سبز بگیرد**، و وقتی گزارشی هشدار داد، بدانیم علتش در کدام فایل این پروژه است.

## فهرست
1. گزارش Pages (Indexing) — وضعیت‌ها و علت در کد
2. نکتهٔ حساس: `noindex` + `Disallow`
3. Sitemaps (`src/app/sitemap.ts`)
4. Enhancements / Rich Results
5. Core Web Vitals و Page Experience
6. URL Inspection — چه چیزی را باید بتوان تأیید کرد
7. Manual actions و ریسک‌های محتوایی
8. نکات ویژهٔ سایت فارسی/RTL تک‌زبانه
9. گردش کار پس از انتشار

---

## ۱. گزارش Pages (Indexing)

| وضعیت در Search Console | معمولاً یعنی | علت رایج در این پروژه | راه‌حل |
| --- | --- | --- | --- |
| **Discovered – currently not indexed** | گوگل URL را می‌شناسد ولی هنوز کراول نکرده | فقط در `sitemap.ts` هست، لینک داخلی (فوتر/ناوبری) ندارد | لینک داخلی اضافه کن؛ بهبود TTFB |
| **Crawled – currently not indexed** | کراول شد ولی ارزش ایندکس ندید | محتوای نازک/تکراری، `title`/`description` هاردکد مشابه صفحات دیگر | محتوای یکتا و مفید، متای یکتا، پاسخ‌محور نوشتن |
| **Duplicate without user-selected canonical** | چند URL محتوای یکسان و canonical نامشخص | `alternates.canonical` ست نشده (فعلاً هیچ صفحه‌ای ندارد) یا query در URL مانده | `alternates.canonical` با `NEXT_PUBLIC_SITE_URL` بساز |
| **Duplicate, Google chose different canonical than user** | گوگل canonical شما را قبول نکرد | sitemap/لینک داخلی به نسخهٔ دیگری از URL اشاره می‌کند | همهٔ سیگنال‌ها (لینک، `sitemap.ts`) را به یک URL برسان |
| **Soft 404** | صفحه ۲۰۰ می‌دهد ولی «خالی/نبودن» می‌نماید | صفحهٔ خالی یا پیام «یافت نشد» رندرشده با کد ۲۰۰ به‌جای `notFound()` | از `notFound()` (`next/navigation`) استفاده کن تا `not-found.tsx` با کد ۴۰۴ واقعی سرو شود |
| **Not found (404)** | URL وجود ندارد | لینک داخلی شکسته؛ مسیر حذف/تغییر شده بدون ریدایرکت | `redirects()` در `next.config.ts` به مقصد جدید؛ اصلاح لینک |
| **Page with redirect** | URL ریدایرکت می‌شود | URL ریدایرکتی در `sitemap.ts`/لینک داخلی مانده | URL نهایی را در sitemap و لینک‌ها بگذار |
| **Redirect error** | زنجیره/حلقهٔ ریدایرکت | چند `redirect` پشت‌سرهم در `next.config.ts` | مستقیم به مقصد نهایی |
| **Server error (5xx)** | خطای سرور موقع کراول | فچ به بک‌اند FastAPI fail شده و صفحه throw کرده (`getPageSections` فعلاً خطا را throw می‌کند، catch نمی‌شود) | برای صفحات عمومی حیاتی، خطای فچ محتوا را با `try/catch` مدیریت کن تا صفحه ۵xx ندهد؛ مانیتور کن |
| **Blocked by robots.txt** | robots اجازهٔ کراول نمی‌دهد | مسیر ایندکس‌شدنی در `disallow` آرایهٔ `src/app/robots.ts` افتاده | بازبینی `src/app/robots.ts` |
| **Excluded by 'noindex' tag** | `noindex` دیده شد | `metadata.robots.index = false` ناخواسته روی صفحهٔ عمومی | فقط تراکنشی/خصوصی noindex باشد |
| **Indexed, though blocked by robots.txt** | ایندکس شد ولی robots اجازه نمی‌دهد | لینک خارجی به مسیر Disallow‌شده | بخش ۲ پایین |
| **Submitted URL not selected as canonical** | URL sitemap کانونیکال نیست | `sitemap.ts` شامل URL غیرکانونیکال/query‌دار | فقط URL کانونیکال در `sitemap.ts` |
| **Submitted URL marked 'noindex'** | sitemap و noindex متناقض‌اند | صفحهٔ noindex هنوز در `sitemap.ts` است | از آرایهٔ `sitemap.ts` حذف کن |

قاعدهٔ طلایی: **سیگنال‌ها هم‌جهت باشند.** canonical، `sitemap.ts`، لینک‌های داخلی و ریدایرکت‌ها همه باید به یک URL برسند.

## ۲. نکتهٔ حساس: `noindex` + `Disallow`

اگر بعداً یک مسیر تراکنشی/خصوصی به `frontend/` اضافه شد (فعلاً چنین مسیری در این اپ نیست)، یک ظرافت فنی هست: **وقتی `robots.ts` کراول را ببندد، گوگل صفحه را نمی‌خواند و `metadata.robots.index=false` را هرگز نمی‌بیند.** اگر جایی لینک خارجی به آن URL باشد، ممکن است بدون محتوا ایندکس شود («Indexed, though blocked by robots.txt»).

- برای صفحاتی که فقط باید کراول نشوند، `disallow` در `src/app/robots.ts` کافی است.
- برای صفحاتی که **نباید هیچ‌وقت در نتایج ظاهر شوند** و ممکن است لینک خارجی بگیرند، `noindex` بدون `Disallow` مطمئن‌تر است.
- این تصمیم را بدون نظر کاربر تغییر نده؛ اگر صفحهٔ تراکنشی جدید می‌سازی، این ظرافت را به کاربر گوشزد کن.

## ۳. Sitemaps

- `/sitemap.xml` از طریق `src/app/sitemap.ts` تولید می‌شود (کانونشن App Router؛ نیازی به فایل استاتیک نیست). آن را در Search Console ثبت کن.
- فقط URLهای **۲۰۰، ایندکس‌شدنی، کانونیکال**. بدون redirect، noindex، پارامتر ردیابی.
- `lastModified` فقط وقتی تاریخ واقعی تغییر محتواست بگذار؛ مقدار ساختگی (همیشه `new Date()` — که الگوی فعلی است) باعث می‌شود گوگل کل سیگنال `lastmod` را نادیده بگیرد. برای صفحات محتوایش از بک‌اند می‌آید، اگر `page_section` تاریخ بروزرسانی دارد از همان استفاده کن؛ وگرنه این فیلد را کلاً حذف کن تا گوگل خودش تشخیص دهد.
- سقف هر فایل: ۵۰٬۰۰۰ URL یا ۵۰ مگابایت (برای این پروژه در آیندهٔ نزدیک محدودکننده نیست)؛ اگر لازم شد، Next.js از `generateSitemaps()` برای چندبخشی‌کردن پشتیبانی می‌کند.
- تفاوت «Couldn't fetch» و «Success but 0 pages»: اولی مسیر/۵xx است؛ دومی یعنی آرایهٔ برگشتی از `sitemap.ts` خالی است.

## ۴. Enhancements / Rich Results

- بعد از هر builder جدید در `src/lib/seo/schema.ts`، صفحه‌های نمونه را با **Rich Results Test** و **Schema Markup Validator** بررسی کن.
- خطای رایج `Product`: نبود `image`، `offers.price`/`priceCurrency` نامعتبر، `priceValidUntil` گذشته. قیمت ریالی با `IRR` و عدد خام (بدون جداکنندهٔ هزارگان، بدون ارقام فارسی).
- ارقام JSON-LD همیشه **لاتین/عدد خام** باشند حتی اگر متن صفحه ارقام فارسی دارد.
- `BreadcrumbList`: هر `ListItem` دارای `position` متوالی از ۱، `name`، `item` (URL مطلق).
- `FAQPage`: پرسش و پاسخ باید در صفحه **دیده شوند**؛ FAQ پنهان یا تبلیغاتی مجاز نیست.
- ریچ‌ریزالت FAQ/HowTo در گوگل محدود یا حذف شده؛ اما مارک‌آپ معتبر می‌ماند چون برای بازیابی LLM ارزش دارد. نبودِ نمایش در SERP نشانهٔ خرابی نیست.
- `aggregateRating`/`review` فقط از نظرهای واقعیِ تأییدشده منتشر شود؛ این پروژه فعلاً چنین دیتایی ندارد — نساز. مارک‌آپ جعلی ریسک اقدام دستی دارد.

## ۵. Core Web Vitals و Page Experience

| معیار | حد «خوب» | اقدام‌های مرتبط با این پروژه |
| --- | --- | --- |
| LCP | ≤ 2.5s | `next/image` با `priority` روی تصویر اصلی؛ `next/font/local` با `display: swap` (الگوی فعلی `src/fonts.ts` درست است)؛ کاهش کد بلاک‌کننده |
| INP | ≤ 200ms | `"use client"` کوچک و اسکوپ‌شده؛ ویجت سنگین با `next/dynamic` |
| CLS | ≤ 0.1 | `next/image` با ابعاد صریح به‌جای `<img>` خام (فعلاً در `Hero.tsx`های home/about و `Team.tsx` استفاده نشده)؛ رزرو فضا برای بنر/فونت |

همچنین: HTTPS همه‌جا، viewport مناسب موبایل، بدون interstitial مزاحم. گوگل **mobile-first** ایندکس می‌کند؛ چون این صفحات Server Component و بدون شرط دستگاه رندر می‌شوند، محتوای موبایل و دسکتاپ طبیعتاً یکسان است — مراقب باش با CSS محتوای مهم را در موبایل مخفی نکنی.

## ۶. URL Inspection — چه چیزی باید قابل تأیید باشد

برای هر صفحهٔ کلیدی جدید، در «Test live URL» باید ببینی:
- «URL is available to Google»، کد ۲۰۰.
- **HTML رندرشده** شامل H1، متن اصلی، لینک‌های داخلی و JSON-LD (چون Server Component است، HTML اولیه باید این‌ها را داشته باشد بدون نیاز به اجرای JS).
- Canonical انتخاب‌شدهٔ گوگل = canonical شما.
- «Page indexing → Indexing allowed: Yes».
- موارد Enhancements بدون خطا.

سپس «Request indexing» را برای صفحات کلیدی جدید بزن.

## ۷. Manual actions و ریسک‌های محتوایی

- Structured data ناهماهنگ با محتوای مرئی، آمار/نظر جعلی، محتوای پنهان برای خزنده، **cloaking** (نمایش متفاوت به Googlebot و کاربر) → اقدام دستی.
- این شامل تشخیص User-Agent برای خزندهٔ AI/گوگل و ارائهٔ محتوای متفاوت هم می‌شود؛ نکن. `llms.txt` (وقتی ساخته شد) فایل/مسیر جداگانه است و اشکالی ندارد، ولی صفحات HTML برای همه یکسان باشند.
- محتوای انبوه تولیدشدهٔ کم‌ارزش (spam) و لینک‌های مصنوعی نساز.

## ۸. نکات ویژهٔ سایت فارسی/RTL تک‌زبانه

- `<html lang="fa" dir="rtl">` (الگوی فعلی `src/app/layout.tsx` — درست است، دست نزن).
- این سایت **تک‌زبانه** است، هیچ i18n routing/نسخهٔ زبان دیگری ندارد → **hreflang اضافه نکن**. تگ hreflang برای سایتی که alternate واقعی ندارد، سیگنال گمراه‌کننده است، نه بی‌ضرر. اگر روزی نسخهٔ انگلیسی اضافه شد، آن‌وقت `alternates.languages` در Metadata API را تنظیم کن.
- در متن صفحه ارقام فارسی یکدست؛ در JSON-LD، URL و ویژگی‌های ماشینی ارقام لاتین (قیمت، تاریخ ISO، `position`).
- `og:locale` = `fa_IR` (الگوی فعلی `layout.tsx` — درست است).

## ۹. گردش کار پس از انتشار (برای گزارش به کاربر)

پس از ارائهٔ هر صفحه/قابلیت مهم، به‌صورت کوتاه به کاربر بگو چه چیزی را در Search Console بررسی کند:
1. URL Inspection صفحهٔ جدید + Request indexing.
2. ثبت/بازخوانی `/sitemap.xml` و بررسی وضعیت «Success».
3. گزارش Pages پس از چند روز: صفحه در «Indexed» و نه «Excluded».
4. Enhancements (اگر گرهٔ جدیدی اضافه شد) بدون خطا/هشدار جدید.
5. Core Web Vitals در گزارش موبایل (داده‌ها با تأخیر ۲۸ روزه می‌آیند).
6. اگر ایمپرشن هست و CTR پایین، `title`/`description` را بازنویسی کن.
