// app/test-timezone/page.tsx
import { supabaseServer } from '@/lib/supabaseServer';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Appointment = {
  id: string;
  full_name: string | null;
  phone: string | null;
  date_time: string | null;     // ← timestamptz → يجيء كـ ISO string مع offset أو بدون
  reason: string | null;
  status: string | null;
};

export default async function TestTimezonePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // 1. جلب timezone العرض من business_settings
  const { data: settings, error: tzError } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  if (tzError) {
    return (
      <div style={{ padding: '2rem', color: 'red', fontFamily: 'Tajawal, system-ui' }}>
        خطأ في جلب الـ timezone: {tzError.message}
      </div>
    );
  }

  const displayTimezone = settings?.timezone || 'Africa/Cairo';

  // 2. جلب المواعيد
  const { data: appointmentsData, error: apptError } = await supabaseServer
    .from('appointments')
    .select('id, full_name, phone, date_time, reason, status')
    .order('date_time', { ascending: true })
    .limit(100);

  if (apptError) {
    return (
      <div style={{ padding: '2rem', color: 'red', fontFamily: 'Tajawal, system-ui' }}>
        خطأ في جلب المواعيد: {apptError.message}
      </div>
    );
  }

  const appointments: Appointment[] = appointmentsData || [];

  // ─── دوال تنسيق بسيطة تعتمد على Intl.DateTimeFormat ───

  const formatInTimezone = (
    utcIso: string | null,
    options: Intl.DateTimeFormatOptions = {}
  ): string => {
    if (!utcIso) return '—';

    try {
      const date = new Date(utcIso);

      let formatted = new Intl.DateTimeFormat('ar-EG', {
        ...options,
        timeZone: displayTimezone,
      }).format(date);

      // تحسين صباحًا / مساءً
      formatted = formatted.replace('ص', 'صباحاً').replace('م', 'مساءً');
      return formatted;
    } catch (err) {
      console.error('خطأ في تنسيق التاريخ/الوقت:', err);
      return utcIso;
    }
  };

  return (
    <div dir="rtl" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Tajawal, system-ui' }}>
      <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        اختبار عرض المواعيد من timestamptz (UTC)
      </h1>

      <div
        style={{
          background: '#eff6ff',
          padding: '1.25rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          textAlign: 'center',
        }}
      >
        <strong>Timezone العرض الحالي (من business_settings):</strong>{' '}
        <span style={{ fontSize: '1.1rem', color: '#1e40af' }}>{displayTimezone}</span>
      </div>

      {appointments.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 1rem',
            color: '#6b7280',
            fontSize: '1.2rem',
            background: '#f9fafb',
            borderRadius: '12px',
          }}
        >
          لا توجد مواعيد مسجلة حاليًا
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #d1d5db', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.97rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '1rem', textAlign: 'right' }}>الاسم</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>التاريخ والوقت</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>التاريخ فقط</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>الوقت فقط</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>القيمة الخام (UTC)</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>السبب</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem' }}>{appt.full_name || '—'}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    {formatInTimezone(appt.date_time, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {formatInTimezone(appt.date_time, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {formatInTimezone(appt.date_time, {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </td>
                  <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                    {appt.date_time || '—'}
                  </td>
                  <td style={{ padding: '1rem' }}>{appt.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '3rem', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
        <p>القيم مخزنة كـ UTC في عمود timestamptz</p>
        <p>العرض يتم الآن حسب الـ IANA الموجود في business_settings.timezone</p>
      </div>
    </div>
  );
}
