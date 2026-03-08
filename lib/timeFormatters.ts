// lib/timeFormatters.ts

export function formatArabicTime(timeStr: string | null): string {
  if (!timeStr) return '—';

  const cleaned = timeStr.replace(/:\d{2}$/, '').trim(); // إزالة الثواني إن وجدت

  const [h, m] = cleaned.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '—';

  const period = h >= 12 ? 'م' : 'ص';
  const hours12 = h % 12 || 12;

  const toArabic = (n: number) =>
    n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d as any]);

  return `\( {toArabic(hours12)}: \){toArabic(m).padStart(2, '٠')} ${period}`;
}
