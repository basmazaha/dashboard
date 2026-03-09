// app/test-timezone/page.tsx
import { supabaseServer } from '@/lib/supabaseServer';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Appointment = {
  id: string;
  full_name: string | null;
  phone: string | null;
  date_time: string | null;     // timestamptz → UTC ISO string
  reason: string | null;
  status: string | null;
};

export default async function TestTimezonePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // جلب الـ timezone من business_settings
  const { data: settings, error: tzError } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  if (tzError) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        خطأ في جلب الـ timezone: {tzError.message}
      </div>
    );
  }

  const displayTz = settings?.timezone || 'Africa/Cairo';

  // جلب المواعيد
  const { data: rows, error } = await supabaseServer
    .from('appointments')
    .select('id, full_name, phone, date_time, reason, status')
    .order('date_time', { ascending: true })
    .limit(50);

  if (error) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        خطأ في جلب المواعيد: {error.message}
      </div>
    );
  }

  const appointments = rows || [];

  // ─── دالة مساعدة للتنسيق ───
  const formatUtcToLocal = (
    utcIso: string | null,
    options: Intl.DateTimeFormatOptions
  ): string => {
    if (!utcIso) return '—';
    try {
      const date = new Date(utcIso);
      let str = new Intl.DateTimeFormat('ar-EG', {
        ...options,
        timeZone: displayTz,
      }).format(date);
      str = str.replace('ص', 'صباحاً').replace('م', 'مساءً');
      return str;
    } catch {
      return utcIso;
    }
  };

  return (
    <div dir="rtl" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Tajawal, system-ui' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        اختبار عرض المواعيد من timestamptz (UTC)
      </h1>

      <div style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'center' }}>
        <strong>Timezone العرض الحالي (من business_settings):</strong> {displayTz}
      </div>

      {appointments.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '1.2rem' }}>
          لا توجد مواعيد مسجلة حاليًا
        </p>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #d1d5db', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.97rem' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '1rem', textAlign: 'right' }}>الاسم</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>التاريخ فقط</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>الوقت فقط</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>التاريخ والوقت معًا</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>القيمة الخام (UTC)</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>السبب</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem' }}>{appt.full_name || '—'}</td>

                  {/* التاريخ فقط */}
                  <td style={{ padding: '1rem' }}>
                    {formatUtcToLocal(appt.date_time, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </td>

                  {/* الوقت فقط */}
                  <td style={{ padding: '1rem' }}>
                    {formatUtcToLocal(appt.date_time, {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </td>

                  {/* التاريخ + الوقت معًا */}
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    {formatUtcToLocal(appt.date_time, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </td>

                  {/* القيمة الخام من Supabase */}
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

      <div style={{ marginTop: '3rem', textAlign: 'center', color: '#6b7280', fontSize: '0.95rem' }}>
        <p>القيم مخزنة كـ UTC في عمود date_time (timestamptz)</p>
        <p>العرض يتم حسب الـ timezone المخزن في business_settings.timezone</p>
      </div>
    </div>
  );
}
