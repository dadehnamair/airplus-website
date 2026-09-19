import Flight from '@/components/Flight';
import { readContent } from '@/lib/content';

// محتوا از data/content.json خوانده می‌شود و بعد از ذخیره در پنل ادمین فوراً تازه می‌شود.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const content = await readContent();
  return <Flight content={content} />;
}
