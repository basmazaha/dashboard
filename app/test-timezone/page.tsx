// app/test-timezone/page.tsx
import { supabaseServer } from '@/lib/supabaseServer';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function TestTimezonePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // ─── جلب إعدادات الـ timezone ───
  const { data: settings, error: settingsError } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  if (settingsError) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        خطأ في جلب إعدادات الـ timezone: {settingsError.message}
      </div>
    );
  }

  const dbTimezone = settings?.timezone || 'Africa/Cairo';
  const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ─── بعض التواريخ والأوقات للاختبار ───
  const testDates = [
    '2025-03-15',
    '2025-06-20',
    '2025-10-01',
    '2025-12-25',
  ];

  const testTimes = ['09:00:00', '14:30:00', '23:45:00'];

  return (
    <div dir="rtl" style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', fontFamily: 'Tajawal, system-ui' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>اختبار الـ Timezone</h1>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* معلومات أساسية */}
        <section style={{ border: '1px solid #d1d5db', borderRadius: '12px', padding: '1.5rem', background: '#f9fafb' }}>
          <h2 style={{ marginBottom: '1rem', color: '#1e40af' }}>الإعدادات الحالية</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <th style={{ textAlign: 'right', padding: '0.6rem', width: '180px' }}>Timezone في قاعدة البيانات</th>
                <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>{dbTimezone}</td>
              </tr>
              <tr>
                <th style={{ textAlign: 'right', padding: '0.6rem' }}>Timezone السيرفر (Vercel)</th>
                <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>{serverTimezone}</td>
              </tr>
              <tr>
                <th style={{ textAlign: 'right', padding: '0.6rem' }}>الوقت الحالي (UTC)</th>
                <td style={{ padding: '0.6rem' }}>{new Date().toISOString()}</td>
              </tr>
              <tr>
                <th style={{ textAlign: 'right', padding: '0.6rem' }}>الوقت الحالي (db timezone)</th>
                <td style={{ padding: '0.6rem' }}>
                  {new Intl.DateTimeFormat('ar-EG', {
                    dateStyle: 'full',
                    timeStyle: 'long',
                    timeZone: dbTimezone,
                  }).format(new Date())}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* اختبار تنسيق التواريخ */}
        <section style={{ border: '1px solid #d1d5db', borderRadius: '12px', padding: '1.5rem', background: '#f9fafb' }}>
          <h2 style={{ marginBottom: '1rem', color: '#1e40af' }}>اختبار تنسيق التواريخ</h2>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.98rem' }}>
            <thead>
              <tr style={{ background: '#e5e7eb' }}>
                <th style={{ padding: '0.8rem', textAlign: 'right' }}>التاريخ (ISO)</th>
                <th style={{ padding: '0.8rem', textAlign: 'right' }}>db timezone (ar-EG)</th>
                <th style={{ padding: '0.8rem', textAlign: 'right' }}>بدون timezone (محلي)</th>
              </tr>
            </thead>
            <tbody>
              {testDates.map((date) => (
                <tr key={date} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.8rem' }}>{date}</td>
                  <td style={{ padding: '0.8rem' }}>
                    {new Intl.DateTimeFormat('ar-EG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      timeZone: dbTimezone,
                    }).format(new Date(date))}
                  </td>
                  <td style={{ padding: '0.8rem', color: '#6b7280' }}>
                    {new Date(date).toLocaleDateString('ar-EG', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* اختبار تنسيق الأوقات */}
        <section style={{ border: '1px solid #d1d5db', borderRadius: '12px', padding: '1.5rem', background: '#f9fafb' }}>
          <h2 style={{ marginBottom: '1rem', color: '#1e40af' }}>اختبار تنسيق الأوقات</h2>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.98rem' }}>
            <thead>
              <tr style={{ background: '#e5e7eb' }}>
                <th style={{ padding: '0.8rem', textAlign: 'right' }}>الوقت (24h)</th>
                <th style={{ padding: '0.8rem', textAlign: 'right' }}>db timezone (ar-EG)</th>
                <th style={{ padding: '0.8rem', textAlign: 'right' }}>بدون timezone (محلي)</th>
              </tr>
            </thead>
            <tbody>
              {testTimes.map((time) => (
                <tr key={time} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.8rem' }}>{time}</td>
                  <td style={{ padding: '0.8rem' }}>
                    {new Intl.DateTimeFormat('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: dbTimezone,
                    })
                      .format(new Date(`1970-01-01T${time}`))
                      .replace('ص', 'صباحاً')
                      .replace('م', 'مساءً')}
                  </td>
                  <td style={{ padding: '0.8rem', color: '#6b7280' }}>
                    {new Date(`1970-01-01T${time}`).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div style={{ fontSize: '0.9rem', color: '#6b7280', textAlign: 'center', marginTop: '2rem' }}>
          هذه الصفحة للاختبار فقط — للتأكد من أن تنسيق التواريخ والأوقات يتماشى مع الـ timezone المخزن في قاعدة البيانات.
        </div>
      </div>
    </div>
  );
}
