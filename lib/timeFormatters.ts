// lib/timeFormatters.ts

export function formatArabicTime(timeStr: string | null): string {
  if (!timeStr) return '—';

  // إزالة الثواني إذا وُجدت (Supabase يرسل HH:MM:SS)
  const cleaned = timeStr.replace(/:\d{2}$/, '').trim();

  const [hoursStr, minutesStr] = cleaned.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr || '0', 10);

  if (isNaN(hours) || isNaN(minutes)) return '—';

  const period = hours >= 12 ? 'م' : 'ص';
  const displayHours = hours % 12 || 12;

  // تحويل الأرقام إلى عربية شرقية
  const toArabicDigits = (num: number): string =>
    num
      .toString()
      .split('')
      .map(digit => '٠١٢٣٤٥٦٧٨٩'[parseInt(digit)])
      .join('');

  // ضمان صفرين للدقائق
  const formattedHours = toArabicDigits(displayHours);
  const formattedMinutes = toArabicDigits(minutes).padStart(2, '٠');

  return `\( {formattedHours}: \){formattedMinutes} ${period}`;
}
