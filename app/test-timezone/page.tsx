// app/dashboard/app/test-timezone/page.tsx
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function TestTimezonePage() {
  // جلب timezone من الإعدادات
  const { data: settings } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  const timezone = settings?.timezone || 'Africa/Cairo';

  // ─── بعض التواريخ للاختبار ───
  const testDates = [
    '2025-03-10', // يوم إثنين (مثال)
    '2025-03-15',
    '2025-03-20',
    '2025-03-25',
    '2025-03-30',
  ];

  return (
    <div dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>اختبار عرض التواريخ والأوقات حسب Timezone العيادة</h1>
      <p style={{ color: '#555', marginBottom: '2rem' }}>
        Timezone المخزن في الإعدادات: <strong>{timezone}</strong>
      </p>

      <h2>كيف يظهر التاريخ حاليًا (من السيرفر / بدون تعديل timezone)</h2>
      <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', marginBottom: '3rem' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th>التاريخ ISO</th>
            <th>new Date() محلي (متصفح)</th>
            <th>Intl ar-EG بدون timezone محدد</th>
            <th>Intl ar-EG مع timezone={timezone}</th>
            <th>يوم الأسبوع (getDay) محلي</th>
          </tr>
        </thead>
        <tbody>
          {testDates.map((dateStr) => {
            const dLocal = new Date(dateStr);
            const dWithTz = new Date(dateStr + 'T00:00:00');

            return (
              <tr key={dateStr}>
                <td>{dateStr}</td>
                <td>{dLocal.toLocaleDateString('ar-EG')}</td>
                <td>
                  {new Intl.DateTimeFormat('ar-EG', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }).format(dWithTz)}
                </td>
                <td style={{ background: '#e6f3ff' }}>
                  {new Intl.DateTimeFormat('ar-EG', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: timezone,
                  }).format(dWithTz)}
                </td>
                <td>{dLocal.getDay()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>اختبار الأوقات المتاحة (مثال افتراضي)</h2>
      <p>افتراض: ساعات العمل من 09:00 إلى 21:00، فترة راحة 14:00–15:00، مدة الموعد 30 دقيقة</p>

      <TestAvailableTimes timezone={timezone} date="2025-03-16" />

      <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#fff3cd', borderRadius: '8px' }}>
        <strong>ملاحظة مهمة:</strong>
        <ul>
          <li>يوم الأسبوع (getDay) يعتمد على timezone المتصفح → غير موثوق</li>
          <li>للحصول على أيام أسبوع صحيحة حسب timezone العيادة → يجب الحساب على السيرفر</li>
          <li>الحل المقترح: نقل منطق توليد التواريخ المتاحة إلى Server Component أو Server Action</li>
        </ul>
      </div>
    </div>
  );
}

// كومبوننت client-side لعرض الأوقات (للتوضيح فقط)
'use client';

import { useMemo } from 'react';

function TestAvailableTimes({ timezone, date }: { timezone: string; date: string }) {
  const slots = useMemo(() => {
    const start = new Date(`1970-01-01T09:00:00`);
    const end = new Date(`1970-01-01T21:00:00`);
    const slotMs = 30 * 60 * 1000;
    const breakStart = new Date(`1970-01-01T14:00:00`).getTime();
    const breakEnd = new Date(`1970-01-01T15:00:00`).getTime();

    const result: string[] = [];

    for (let t = start.getTime(); t < end.getTime(); t += slotMs) {
      if (t >= breakStart && t < breakEnd) continue;

      const slotDate = new Date(t);
      const timeStr = slotDate.toTimeString().slice(0, 5);

      const formatted = new Intl.DateTimeFormat('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone,
      })
        .format(slotDate)
        .replace('ص', 'صباحًا')
        .replace('م', 'مساءً');

      result.push(`${timeStr} → ${formatted}`);
    }

    return result;
  }, [timezone]);

  return (
    <div>
      <h3>الأوقات المتاحة ليوم {date} (timezone: {timezone})</h3>
      <ul style={{ columns: '3', listStyle: 'none', padding: 0 }}>
        {slots.map((slot, i) => (
          <li key={i} style={{ marginBottom: '0.5rem' }}>
            {slot}
          </li>
        ))}
      </ul>
    </div>
  );
}
