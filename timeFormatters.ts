// lib/timeFormatters.ts

export function formatArabicTime(timeStr: string | null): string {
  if (!timeStr) return '—';

  // إزالة الثواني إذا وُجدت (Supabase يرسل غالباً HH:MM:SS)
  const cleaned = timeStr.replace(/:\d{2}$/, '').trim();

  const [hoursStr, minutesStr] = cleaned.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr || '00', 10);

  if (isNaN(hours) || isNaN(minutes)) return '—';

  const period = hours >= 12 ? 'م' : 'ص';
  const displayHours = hours % 12 || 12;

  // تحويل إلى أرقام عربية شرقية
  const toArabic = (n: number) =>
    n
      .toString()
      .split('')
      .map(d => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
      .join('');

  return `\( {toArabic(displayHours)}: \){toArabic(minutes).padStart(2, '٠')} ${period}`;
}
