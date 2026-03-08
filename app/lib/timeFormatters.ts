// app/lib/timeFormatters.ts

/**
 * تحويل وقت بتنسيق 24 ساعة (مثل "14:30:00") إلى صيغة عربية 12 ساعة مع ص/م
 * @example "14:30:00" → "٢:٣٠ م"
 * @example "09:15:00" → "٩:١٥ ص"
 */
export function formatArabicTime(timeStr: string | null): string {
  if (!timeStr) return '—';

  // إزالة الثواني إذا وجدت (Supabase يرسل HH:MM:SS)
  const cleaned = timeStr.replace(/:\d{2}$/, '');

  const [hoursStr, minutesStr] = cleaned.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10) || 0;

  if (isNaN(hours) || isNaN(minutes)) return '—';

  const period = hours >= 12 ? 'م' : 'ص';
  const displayHours = hours % 12 || 12;

  // أرقام عربية شرقية
  const arabicNum = (n: number) =>
    n
      .toString()
      .split('')
      .map((d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
      .join('');

  return `\( {arabicNum(displayHours)}: \){arabicNum(minutes).padStart(2, '٠')} ${period}`;
}
