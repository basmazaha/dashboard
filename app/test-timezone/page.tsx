// app/test-timezone/page.tsx
import { testGetBusinessTimezone, testGenerateAvailableDates } from './actions';
import TestAvailableTimes from './TestAvailableTimes';

export const dynamic = 'force-dynamic';

export default async function TestTimezonePage() {
  const timezone = await testGetBusinessTimezone();
  const { dates } = await testGenerateAvailableDates(14);

  return (
    <div dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif', padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>اختبار عرض التواريخ والأوقات حسب Timezone العيادة</h1>
      <p style={{ color: '#555', marginBottom: '2rem' }}>
        Timezone المخزن في الإعدادات: <strong>{timezone}</strong>
      </p>

      <h2>التواريخ المتاحة (الـ 14 يوم القادمة)</h2>
      <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '3rem' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th>ISO</th>
            <th>التنسيق حسب timezone العيادة</th>
            <th>يوم الأسبوع (getDay محلي)</th>
          </tr>
        </thead>
        <tbody>
          {dates.map((item) => (
            <tr key={item.iso}>
              <td>{item.iso}</td>
              <td style={{ background: '#e6f3ff' }}>{item.label}</td>
              <td>{item.dayOfWeek}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>مثال على عرض الأوقات المتاحة (client-side)</h2>
      <TestAvailableTimes timezone={timezone} date="2025-03-16" />

      <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#fff3cd', borderRadius: '8px' }}>
        <strong>ملاحظات:</strong>
        <ul>
          <li>التواريخ يتم توليدها على السيرفر → التنسيق يعتمد على timezone العيادة</li>
          <li>يوم الأسبوع (getDay) لا يزال يتأثر بتوقيت السيرفر</li>
          <li>الأوقات في المثال أدناه client-side (للتوضيح فقط)</li>
        </ul>
      </div>
    </div>
  );
}
