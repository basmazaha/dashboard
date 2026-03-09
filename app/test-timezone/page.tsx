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

  // 1. جلب إعداد الـ timezone
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
  const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // 2. جلب المواعيد (مستقبلية + حديثة فقط كمثال)
  const today = new Date().toISOString().split('T')[0];

  const { data: appointmentsData, error: apptError } = await supabaseServer
    .from('appointments')
    .select('id, full_name, phone, appointment_date, appointment_time, reason, status')
    .gte('appointment_date', today)           // المواعيد من اليوم فصاعداً
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })
    .limit(50);

  if (apptError) {
    return (
      <div style={{ padding: '2rem', color: 'red', fontFamily: 'Tajawal, system-ui' }}>
        خطأ في جلب المواعيد: {apptError.message}
      </div>
    );
  }

  const appointments: Appointment[] = appointmentsData || [];

  // 3. دوال تنسيق باستخدام الـ timezone من قاعدة البيانات
  const formatDate = (dateStr: string | null) => {
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
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '—';
    try {
      const fakeDate = new Date(`1970-01-01T${timeStr}`);
      let formatted = new Intl.DateTimeFormat('ar-EG', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: dbTimezone,
      }).format(fakeDate);
      return formatted.replace('ص', 'صباحاً').replace('م', 'مساءً');
    } catch {
      return timeStr.slice(0, 5) || '—';
    }
  };

  const formatFullDatetime = (dateStr: string | null, timeStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const dt = new Date(`\( {dateStr}T \){timeStr || '00:00:00'}`);
      return new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: dbTimezone,
      }).format(dt).replace('ص', 'صباحاً').replace('م', 'مساءً');
    } catch {
      return `${dateStr} ${timeStr || '—'}`;
    }
  };

  return (
    <div dir="rtl" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Tajawal, system-ui' }}>
      <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>اختبار الـ Timezone + عرض المواعيد الفعلية</h1>

      {/* معلومات الإعدادات */}
      <section style={{ border: '1px solid #bfdbfe', borderRadius: '12px', padding: '1.5rem', background: '#eff6ff', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#1e40af' }}>الإعدادات الحالية</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.8rem' }}>
          <strong>Timezone في قاعدة البيانات:</strong> <span>{dbTimezone}</span>
          <strong>Timezone السيرفر (Vercel):</strong> <span>{serverTimezone}</span>
          <strong>الوقت الحالي (UTC):</strong> <span>{new Date().toISOString()}</span>
          <strong>الوقت الحالي حسب {dbTimezone}:</strong>{' '}
          <span>
            {new Intl.DateTimeFormat('ar-EG', {
              dateStyle: 'full',
              timeStyle: 'long',
              timeZone: dbTimezone,
            }).format(new Date())}
          </span>
        </div>
      </section>

      {/* المواعيد الفعلية */}
      <section style={{ border: '1px solid #d1d5db', borderRadius: '12px', padding: '1.5rem', background: '#f9fafb' }}>
        <h2 style={{ marginBottom: '1rem', color: '#1e40af' }}>
          المواعيد المسجلة ({appointments.length} موعد)
        </h2>

        {appointments.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '3rem 0' }}>
            لا توجد مواعيد مستقبلية مسجلة حالياً
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.97rem' }}>
              <thead>
                <tr style={{ background: '#e5e7eb' }}>
                  <th style={{ padding: '0.9rem', textAlign: 'right' }}>الاسم</th>
                  <th style={{ padding: '0.9rem', textAlign: 'right' }}>التليفون</th>
                  <th style={{ padding: '0.9rem', textAlign: 'right' }}>التاريخ والوقت (db timezone)</th>
                  <th style={{ padding: '0.9rem', textAlign: 'right' }}>السبب</th>
                  <th style={{ padding: '0.9rem', textAlign: 'right' }}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.9rem' }}>{appt.full_name || '—'}</td>
                    <td style={{ padding: '0.9rem' }}>{appt.phone || '—'}</td>
                    <td style={{ padding: '0.9rem', fontWeight: 500 }}>
                      {formatFullDatetime(appt.appointment_date, appt.appointment_time)}
                    </td>
                    <td style={{ padding: '0.9rem' }}>{appt.reason || '—'}</td>
                    <td style={{ padding: '0.9rem' }}>
                      <span
                        style={{
                          padding: '0.3em 0.8em',
                          borderRadius: '6px',
                          background:
                            appt.status === 'confirmed' ? '#ecfdf5' :
                            appt.status === 'cancelled' ? '#fee2e2' :
                            appt.status === 'pending' ? '#fefce8' : '#f3f4f6',
                          color:
                            appt.status === 'confirmed' ? '#065f46' :
                            appt.status === 'cancelled' ? '#991b1b' :
                            appt.status === 'pending' ? '#854d0e' : '#4b5563',
                        }}
                      >
                        {appt.status === 'confirmed' ? 'مؤكد' :
                         appt.status === 'cancelled' ? 'ملغي' :
                         appt.status === 'pending' ? 'معلق' : appt.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer style={{ marginTop: '3rem', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem' }}>
        هذه الصفحة لأغراض الاختبار والتأكد من تطبيق الـ timezone بشكل صحيح على البيانات الفعلية
      </footer>
    </div>
  );
}
