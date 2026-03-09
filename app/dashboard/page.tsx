// app/dashboard/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import AppointmentsTable from './AppointmentsTable';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // ─── 1. جلب إعدادات الأعمال (timezone) ───────────────────────────────
  const { data: settings, error: settingsError } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  if (settingsError) {
    console.error('خطأ في جلب الإعدادات:', settingsError);
    return (
      <div className="p-6 text-red-600">
        حدث خطأ أثناء جلب إعدادات النظام (timezone).
        <br />
        <small>{settingsError.message}</small>
      </div>
    );
  }

  const timezone = settings?.timezone || 'Africa/Cairo';

  // ─── 2. حساب بداية اليوم الحالي في الـ timezone المطلوب (بشكل صحيح) ──
  // نستخدم Intl.DateTimeFormat لتجنب أي اعتماد على توقيت السيرفر
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const todayParts = formatter.formatToParts(new Date());
  const year = todayParts.find(p => p.type === 'year')?.value;
  const month = todayParts.find(p => p.type === 'month')?.value;
  const day = todayParts.find(p => p.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('فشل في استخراج التاريخ من Intl.DateTimeFormat');
  }

  // YYYY-MM-DD
  const todayInTz = `\( {year}- \){month}-${day}`;

  // بداية اليوم في الـ timezone المحدد (محلياً)
  const startOfDayLocal = new Date(`${todayInTz}T00:00:00`);

  // نحولها إلى UTC بشكل صحيح
  // نستخدم toLocaleString مع timeZone=UTC للحصول على ISO string نظيف
  const startOfDayUTC = startOfDayLocal
    .toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/, '$3-$1-$2T$4:$5:$6Z');

  // ─── 3. جلب البيانات مع error handling أفضل ─────────────────────────────
  const supabase = supabaseServer;

  const promises = [
    supabase
      .from('appointments')
      .select('id, full_name, date_time, phone, reason, status')
      .gte('date_time', startOfDayUTC)
      .order('date_time', { ascending: true })
      .limit(100),

    supabase.from('off_days').select('date'),

    supabase
      .from('working_hours')
      .select('day_of_week, is_open, start_time, end_time, slot_duration_minutes, break_start, break_end'),
  ];

  const [apptRes, offRes, hoursRes] = await Promise.all(promises);

  if (apptRes.error || offRes.error || hoursRes.error) {
    console.error('خطأ في جلب البيانات:', {
      apptError: apptRes.error,
      offError: offRes.error,
      hoursError: hoursRes.error,
    });

    return (
      <div className="p-6 text-red-600">
        حدث خطأ أثناء جلب بيانات المواعيد أو أيام العطل أو ساعات العمل.
        <br />
        <small>تحقق من console logs للتفاصيل</small>
      </div>
    );
  }

  const appointments = apptRes.data ?? [];
  const offDays = (offRes.data ?? []).map(row => row.date);
  const workingHours = hoursRes.data ?? [];

  return (
    <div>
      <div className="dashboard-page-header">
        <h2 className="dashboard-page-title">المواعيد</h2>
      </div>

      <AppointmentsTable
        initialAppointments={appointments}
        initialOffDays={offDays}
        initialWorkingHours={workingHours}
        timezone={timezone}
      />
    </div>
  );
}
