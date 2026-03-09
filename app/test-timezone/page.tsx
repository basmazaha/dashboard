// app/test-timezone/page.tsx
import {
  testGetBusinessTimezone,
  testGenerateAvailableDates,
  testGenerateAvailableTimes,
} from './actions';

export const dynamic = 'force-dynamic';

export default async function TestTimezonePage() {
  const timezone = await testGetBusinessTimezone();
  const availableDatesResult = await testGenerateAvailableDates(14);

  // مثال على تاريخ لعرض الأوقات (غيّر هذا التاريخ حسب ما تريد اختباره)
  const exampleDate = '2025-03-16';
  const timesResult = await testGenerateAvailableTimes(exampleDate);

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: 'Tajawal, system-ui, sans-serif',
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: '#f9fafb',
      }}
    >
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1e40af' }}>
        صفحة اختبار عرض التواريخ والأوقات حسب Timezone العيادة
      </h1>

      <div
        style={{
          marginBottom: '2.5rem',
          padding: '1.25rem',
          backgroundColor: '#eff6ff',
          borderRadius: '12px',
          border: '1px solid #bfdbfe',
        }}
      >
        <strong>Timezone المستخدم حالياً من جدول business_settings:</strong>{' '}
        <span style={{ fontWeight: 'bold', color: '#1d4ed8' }}>{timezone}</span>
      </div>

      <section style={{ marginBottom: '3.5rem' }}>
        <h2 style={{ marginBottom: '1.25rem', color: '#1e40af' }}>
          التواريخ المتاحة (الـ 14 يوم القادمة)
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '12px', borderBottom: '2px solid #d1d5db', textAlign: 'right' }}>
                  التاريخ ISO
                </th>
                <th style={{ padding: '12px', borderBottom: '2px solid #d1d5db', textAlign: 'right' }}>
                  العرض حسب timezone العيادة
                </th>
                <th style={{ padding: '12px', borderBottom: '2px solid #d1d5db', textAlign: 'right' }}>
                  رقم يوم الأسبوع (محلي)
                </th>
              </tr>
            </thead>
            <tbody>
              {availableDatesResult.dates.map((item) => (
                <tr key={item.iso} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{item.iso}</td>
                  <td style={{ padding: '12px', textAlign: 'right', backgroundColor: '#f0f9ff' }}>
                    {item.label}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{item.dayOfWeek}</td>
                </tr>
              ))}

              {availableDatesResult.dates.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    لا توجد تواريخ متاحة في الفترة المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '1.25rem', color: '#1e40af' }}>
          الأوقات المتاحة والمحجوزة ليوم مثالي ({exampleDate})
        </h2>

        {timesResult.message && (
          <p style={{ color: '#dc2626', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            {timesResult.message}
          </p>
        )}

        {timesResult.times.length > 0 ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '2rem',
              }}
            >
              {timesResult.times.map((slot, index) => (
                <div
                  key={index}
                  style={{
                    padding: '14px',
                    border: '1px solid',
                    borderColor: slot.isBooked ? '#fecaca' : '#bbf7d0',
                    backgroundColor: slot.isBooked ? '#fef2f2' : '#f0fdf4',
                    borderRadius: '8px',
                    textAlign: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '6px' }}>
                    {slot.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      color: slot.isBooked ? '#b91c1c' : '#15803d',
                      fontWeight: 500,
                    }}
                  >
                    {slot.isBooked ? 'محجوز' : 'متاح'}
                  </div>
                </div>
              ))}
            </div>

            <p style={{ color: '#4b5563', fontSize: '0.95rem' }}>
              عدد المواعيد المحجوزة المكتشفة في هذا اليوم:{' '}
              <strong style={{ color: '#1e40af' }}>{timesResult.bookedCount}</strong>
            </p>
          </>
        ) : (
          <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '1.1rem' }}>
            لا توجد أوقات متاحة لهذا اليوم أو حدث خطأ أثناء الحساب.
          </p>
        )}
      </section>

      <section
        style={{
          marginTop: '4rem',
          padding: '1.5rem',
          backgroundColor: '#fefce8',
          borderRadius: '12px',
          border: '1px solid #fef08a',
        }}
      >
        <h3 style={{ marginBottom: '1rem', color: '#854d0e' }}>ملاحظات مهمة للاختبار</h3>
        <ul style={{ lineHeight: '1.7', color: '#713f12' }}>
          <li>
            غيّر قيمة العمود <code>timezone</code> في جدول <code>business_settings</code> ثم أعد تحميل الصفحة لترى تغيير تنسيق الأوقات (صباحاً / مساءً).
          </li>
          <li>
            أضف أو احذف سجلات في جدول <code>appointments</code> للتاريخ المثالي ({exampleDate}) وراقب كيف يتغير عدد المحجوزات والأوقات المتاحة.
          </li>
          <li>
            يوم الأسبوع (getDay) يحسب حالياً بناءً على توقيت السيرفر (غالباً UTC على Vercel)، وليس بالضرورة حسب timezone العيادة.
          </li>
          <li>يمكنك تغيير المتغير <code>exampleDate</code> في الكود لاختبار تواريخ أخرى.</li>
        </ul>
      </section>
    </div>
  );
}
