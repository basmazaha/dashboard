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

  // جلب الـ timezone
  const { data: settings, error: settingsError } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  if (settingsError) {
    return <div style={{ padding: '2rem', color: 'red' }}>خطأ في جلب الـ timezone: {settingsError.message}</div>;
  }

  const dbTimezone = settings?.timezone || 'Africa/Cairo';

  // جلب المواعيد
  const { data: appointmentsData, error: apptError } = await supabaseServer
    .from('appointments')
    .select('id, full_name, phone, appointment_date, appointment_time, reason, status')
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })
    .limit(50);

  if (apptError) {
    return <div style={{ padding: '2rem', color: 'red' }}>خطأ في جلب المواعيد: {apptError.message}</div>;
  }

  const appointments = appointmentsData || [];

  // ─── دوال تنسيق محسّنة ───
  function formatAppointmentDateTime(dateStr: string | null, timeStr: string | null): string {
    if (!dateStr) return '—';

    const timePart = timeStr ? timeStr.slice(0, 8) : '00:00:00';
    // ننشئ string بدون Z → يُعامل كـ local time
    const dateTimeStr = `\( {dateStr}T \){timePart}`;

    try {
      const dt = new Date(dateTimeStr);

      const formatter = new Intl.DateTimeFormat('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: dbTimezone,
      });

      let formatted = formatter.format(dt);
      formatted = formatted.replace('ص', 'صباحاً').replace('م', 'مساءً');
      return formatted;
    } catch (err) {
      console.error('خطأ في التنسيق:', err);
      return `${dateStr} ${timePart.slice(0, 5)}`;
    }
  }

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
      const fake = new Date(`1970-01-01T${timeStr.slice(0, 8)}`);
      let formatted = new Intl.DateTimeFormat('ar-EG', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: dbTimezone,
      }).format(fake);
      return formatted.replace('ص', 'صباحاً').replace('م', 'مساءً');
    } catch {
      return timeStr.slice(0, 5);
    }
  }

  return (
    <div dir="rtl" style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Tajawal, sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>اختبار عرض المواعيد مع Timezone</h1>

      <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <strong>Timezone المستخدم حالياً:</strong> {dbTimezone}
      </div>

      {appointments.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', fontSize: '1.2rem' }}>
          لا توجد مواعيد في الجدول حالياً
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#e5e7eb' }}>
                <th style={{ padding: '12px', textAlign: 'right' }}>الاسم</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>التاريخ</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>الوقت</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>التاريخ والوقت معاً</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>السبب</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px' }}>{appt.full_name || '—'}</td>
                  <td style={{ padding: '12px' }}>{formatDateOnly(appt.appointment_date)}</td>
                  <td style={{ padding: '12px' }}>{formatTimeOnly(appt.appointment_time)}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>
                    {formatAppointmentDateTime(appt.appointment_date, appt.appointment_time)}
                  </td>
                  <td style={{ padding: '12px' }}>{appt.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '3rem', textAlign: 'center', color: '#777', fontSize: '0.95rem' }}>
        إذا كانت الأوقات لا تزال تبدو خاطئة، قد نحتاج إلى تغيير طريقة التخزين أو استخدام مكتبة متخصصة (date-fns-tz)
      </div>
    </div>
  );
}
