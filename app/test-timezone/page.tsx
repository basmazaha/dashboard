// app/test-timezone/page.tsx
import { supabaseServer } from '@/lib/supabaseServer';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Appointment = {
  id: string;
  full_name: string | null;
  phone: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  reason: string | null;
  status: string | null;
};

export default async function TestTimezonePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // جلب إعداد الـ timezone
  const { data: settings, error: settingsError } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  if (settingsError) {
    return (
      <div style={{ padding: '2rem', color: 'red', fontFamily: 'Tajawal, system-ui' }}>
        خطأ في جلب إعداد الـ timezone: {settingsError.message}
      </div>
    );
  }

  const dbTimezone = settings?.timezone || 'Africa/Cairo';

  // جلب المواعيد (يمكنك تعديل الاستعلام حسب احتياجك)
  const { data: appointmentsData, error: apptError } = await supabaseServer
    .from('appointments')
    .select('id, full_name, phone, appointment_date, appointment_time, reason, status')
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })
    .limit(100);

  if (apptError) {
    return (
      <div style={{ padding: '2rem', color: 'red', fontFamily: 'Tajawal, system-ui' }}>
        خطأ في جلب المواعيد: {apptError.message}
      </div>
    );
  }

  const appointments: Appointment[] = appointmentsData || [];

  // ─── دوال عرض محسّنة تعامل الوقت كـ local time في الـ timezone المحدد ───

  function formatDateOnly(dateStr: string | null): string {
    if (!dateStr) return '—';
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: dbTimezone,
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  }

  function formatTimeOnly(timeStr: string | null): string {
    if (!timeStr) return '—';
    try {
      // وقت وهمي بدون Z → يُعامل كـ local time
      const fakeDate = new Date(`1970-01-01T${timeStr}`);
      let formatted = new Intl.DateTimeFormat('ar-EG', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: dbTimezone,
      }).format(fakeDate);

      formatted = formatted.replace('ص', 'صباحاً').replace('م', 'مساءً');
      return formatted;
    } catch {
      return timeStr.slice(0, 5) || '—';
    }
  }

  function formatDateTimeCombined(dateStr: string | null, timeStr: string | null): string {
    if (!dateStr) return '—';

    const timePart = timeStr || '00:00:00';
    // ننشئ سلسلة بدون Z حتى يعاملها Intl كـ local time في الـ timezone المحدد
    const dateTimeStr = `\( {dateStr}T \){timePart}`;

    try {
      const dt = new Date(dateTimeStr);

      let formatted = new Intl.DateTimeFormat('ar-EG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: dbTimezone,
      }).format(dt);

      formatted = formatted.replace('ص', 'صباحاً').replace('م', 'مساءً');
      return formatted;
    } catch (err) {
      console.error('خطأ تنسيق التاريخ والوقت:', err);
      return `${formatDateOnly(dateStr)} ${formatTimeOnly(timeStr)}`;
    }
  }

  return (
    <div dir="rtl" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Tajawal, system-ui' }}>
      <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        اختبار عرض المواعيد مع Timezone
      </h1>

      <div style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <strong>الـ Timezone المستخدم:</strong> {dbTimezone}
      </div>

      {appointments.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '4rem 1rem', fontSize: '1.2rem' }}>
          لا توجد مواعيد مسجلة حالياً
        </p>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #d1d5db', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.98rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '1rem', textAlign: 'right' }}>الاسم</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>التاريخ (منفصل)</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>الوقت (منفصل)</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>التاريخ والوقت معاً</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>السبب</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem' }}>{appt.full_name || '—'}</td>
                  <td style={{ padding: '1rem' }}>{formatDateOnly(appt.appointment_date)}</td>
                  <td style={{ padding: '1rem' }}>{formatTimeOnly(appt.appointment_time)}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    {formatDateTimeCombined(appt.appointment_date, appt.appointment_time)}
                  </td>
                  <td style={{ padding: '1rem' }}>{appt.reason || '—'}</td>
                  <td style={{ padding: '1rem' }}>
                    {appt.status || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '3rem', textAlign: 'center', color: '#6b7280', fontSize: '0.95rem' }}>
        صفحة اختبار — للتأكد من أن التاريخ والوقت يظهران بالتوقيت المحلي الصحيح حسب الـ timezone المخزن
      </div>
    </div>
  );
}
