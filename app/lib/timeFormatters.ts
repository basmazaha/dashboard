// lib/timeFormatters.ts

export function formatArabicTime(timeStr: string | null): string {
  if (!timeStr || timeStr === '—') {
    return '—';
  }

  // إزالة الثواني إذا وُجدت (من Supabase عادة HH:MM:SS)
  const cleaned = timeStr.replace(/:\d{2}$/, '').trim();

  const [hoursStr, minutesStr] = cleaned.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr || '0', 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return '—';
  }

  const period = hours >= 12 ? 'م' : 'ص';
  const displayHours = hours % 12 || 12;

  // تحويل الأرقام إلى أرقام عربية شرقية
  const toArabicDigits = (num: number): string =>
    num
      .toString()
      .split('')
      .map((digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)])
      .join('');

  const formattedMinutes = toArabicDigits(minutes).padStart(2, '٠');
  const formattedHours = toArabicDigits(displayHours);

  return `\( {formattedHours}: \){formattedMinutes} ${period}`;
}
