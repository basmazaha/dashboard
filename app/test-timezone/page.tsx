// app/test-timezone/page.tsx
import {
  testGetBusinessTimezone,
  testGenerateAvailableDates,
  testGenerateAvailableTimes,
} from './actions';

export const dynamic = 'force-dynamic';

export default async function TestTimezonePage() {
  const timezone = await testGetBusinessTimezone();
  const datesResult = await testGenerateAvailableDates(14);

  // غيّر التاريخ ده لتاريخ فيه مواعيد محجوزة عندك
  const exampleDate = '2025-03-16'; // ← ← ← غيّره لتاريخ حقيقي من الداتابيز
  const timesResult = await testGenerateAvailableTimes(exampleDate);

  return (
    <div
      dir="rtl"
      style={{
        fontFamily: 'Tajawal, system-ui, sans-serif',
        padding: '2rem',
        maxWidth: '1400px',
        margin: '0 auto',
        backgroundColor: '#f9fafb',
      }}
    >
      <h1 style={{ textAlign: 'center', color: '#1e40af', marginBottom: '2rem' }}>
        اختبار عرض المواعيد الحقيقية + override الـ timezone
      </h1>

      <div
        style={{
          padding: '1.25rem',
          backgroundColor: '#eff6ff',
          borderRadius: '12px',
          marginBottom: '2.5rem',
          border: '1px solid #bfdbfe',
        }}
      >
        <strong>الـ Timezone الحالي من business_settings:</strong>{' '}
        <span style={{ fontWeight: 'bold', color: '#1d4ed8' }}>{timezone}</span>
      </div>

      {/* التواريخ المتاحة */}
      <section style={{ marginBottom: '4rem' }}>
        <h2 style={{ color: '#1e40af', marginBottom: '1.25rem' }}>
          التواريخ المتاحة (14 يوم قادم)
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '14px', textAlign: 'right', borderBottom: '2px solid #d1d5db' }}>
                  ISO
                </th>
                <th style={{ padding: '14px', textAlign: 'right', borderBottom: '2px solid #d1d5db' }}>
                  العرض حسب الـ timezone
                </th>
                <th style={{ padding: '14px', textAlign: 'right', borderBottom: '2px solid #d1d5db' }}>
                  يوم الأسبوع (محلي)
                </th>
              </tr>
            </thead>
            <tbody>
              {datesResult.dates.map(item => (
                <tr key={item.iso} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '14px', textAlign: 'right' }}>{item.iso}</td>
                  <td style={{ padding: '14px', textAlign: 'right' }}>{item.label}</td>
                  <td style={{ padding: '14px', textAlign: 'right' }}>{item.dayOfWeek}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* الأوقات + الحجوزات الحقيقية */}
      <section>
        <h2 style={{ color: '#1e40af', marginBottom: '1.25rem' }}>
          الأوقات ليوم: {exampleDate} (من جدول appointments)
        </h2>

        <p style={{ marginBottom: '1.5rem' }}>
          عدد المواعيد المحجوزة المكتشفة: <strong>{timesResult.bookedCount}</strong>
          {timesResult.message && ` — ${timesResult.message}`}
        </p>

        {timesResult.times.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {timesResult.times.map((slot, i) => (
              <div
                key={i}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: `2px solid ${slot.isBooked ? '#ef4444' : '#10b981'}`,
                  backgroundColor: slot.isBooked ? '#fef2f2' : '#f0fdf4',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  {slot.label}
                </div>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: slot.isBooked ? '#b91c1c' : '#059669',
                  }}
                >
                  {slot.isBooked ? 'محجوز' : 'متاح'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
            لا توجد أوقات متاحة أو حدث خطأ في الجلب
          </p>
        )}

        {/* Debug Info - مهم جدًا دلوقتي */}
        <div
          style={{
            marginTop: '3rem',
            padding: '1.5rem',
            backgroundColor: '#fef2f2',
            borderRadius: '12px',
            border: '1px solid #fecaca',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            direction: 'ltr',
            fontSize: '0.95rem',
          }}
        >
          <h3 style={{ marginBottom: '1rem', color: '#991b1b' }}>معلومات تشخيصية (Debug Info)</h3>
          <pre>{JSON.stringify(timesResult.debugInfo, null, 2)}</pre>
        </div>
      </section>

      <div
        style={{
          marginTop: '4rem',
          padding: '1.5rem',
          backgroundColor: '#fefce8',
          borderRadius: '12px',
          border: '1px solid #fef08a',
        }}
      >
        <h3 style={{ color: '#854d0e' }}>خطوات الاختبار الآن</h3>
        <ol style={{ lineHeight: '2', color: '#713f12' }}>
          <li>افتح الصفحة وانسخ محتوى الـ Debug Info (الجزء الأحمر في الأسفل)</li>
          <li>بعتهولي هنا أو شوفه بنفسك:</li>
          <ul>
            <li>إذا rowCount = 0 → ما فيش مواعيد في اليوم ده أو الاستعلام مش شغال</li>
            <li>إذا rawAppointments فيها بيانات لكن normalizedBooked فاضي → مشكلة في صيغة appointment_time</li>
            <li>إذا normalizedBooked فيها أوقات لكن ما ظهرتش محجوزة → المقارنة مش متطابقة</li>
          </ul>
          <li>غيّر timezone في الداتابيز وأعد التحميل، شوف إذا تغيرت كلمة «مساءً» و«صباحاً»</li>
        </ol>
      </div>
    </div>
  );
}
