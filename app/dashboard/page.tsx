// app/dashboard/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import AppointmentsTable from './AppointmentsTable';
import { startOfDay, formatISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // 1. جلب timezone من الإعدادات
  const { data: settings, error: settingsError } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  if (settingsError || !settings) {
    console.error('خطأ في جلب timezone:', settingsError);
    return (
      <div className="p-8 text-center text-red-600">
        تعذر جلب إعدادات المنطقة الزمنية
        <br />
        <small>{settingsError?.message || 'لا توجد بيانات إعدادات'}</small>
      </div>
    );
  }

  const timezone = settings.timezone || 'Africa/Cairo';

  // 2. حساب بداية اليوم الحالي في الـ timezone المحدد → ثم تحويلها إلى UTC
  // نأخذ الوقت الحالي في UTC ثم نحوله إلى المنطقة الزمنية المطلوبة
  const nowInTz = utcToZonedTime(new Date(), timezone);
  const startOfTodayInTz = startOfDay(nowInTz);           // 00:00:00 في الـ timezone
  const startOfTodayUTC = zonedTimeToUtc(startOfTodayInTz, timezone); // تحويل إلى UTC

  const startOfTodayISO = formatISO(startOfTodayUTC, { representation: 'complete' });

  // 3. جلب البيانات (مع error handling أفضل)
  const [
    { data: appointments, error: apptError },
    { data: offDaysData, error: offError },
    { data: workingHours, error: hoursError },
  ] = await Promise.all([
    supabaseServer
      .from('appointments')
      .select('id, full_name, date_time, phone, reason, status')
      .gte('date_time', startOfTodayISO)
      .order('date_time', { ascending: true })
      .limit(100),

    supabaseServer.from('off_days').select('date'),

    supabaseServer
      .from('working_hours')
      .select('day_of_week, is_open, start_time, end_time, slot_duration_minutes, break_start, break_end'),
  ]);

  if (apptError || offError || hoursError) {
    console.error('أخطاء في جلب البيانات:', { apptError, offError, hoursError });
    return (
      <div className="p-8 text-center text-red-600">
        حدث خطأ أثناء جلب بيانات المواعيد
        <br />
        <small>يرجى التحقق من سجلات Vercel</small>
      </div>
    );
  }

  const offDays = offDaysData?.map((row) => row.date) ?? [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المواعيد اليومية</h1>
        {/* يمكنك إضافة زر إضافة موعد هنا إذا أردت */}
      </div>

      <AppointmentsTable
        initialAppointments={appointments ?? []}
        initialOffDays={offDays}
        initialWorkingHours={workingHours ?? []}
        timezone={timezone}
      />
    </div>
  );
}
