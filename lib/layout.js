// تقسیم مسیر پرواز بین بخش‌ها. هم صحنه و هم رابط از همین تابع استفاده می‌کنند.
export const SEG_VH = 190; // ارتفاع اسکرول هر بخش (برحسب vh)

export function sectionRange(i, N) {
  const len = 1 / N;
  const start = i * len;
  return {
    a: i === 0 ? -1 : start + len * 0.1,
    b: i === N - 1 ? 3 : start + len * 0.94,
    mid: start + len * 0.5,
    start,
    end: start + len,
  };
}
