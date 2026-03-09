// app/dashboard/page.tsx   ← الملف الوحيد الذي يحتاج تعديل

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import AppointmentsTable from './AppointmentsTable';
import { startOfDay, formatISO } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';   // ← التغيير هنا

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
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">
        تعذر جلب إعدادات المنطقة الزمنية
        <br />
        <small className="text-sm">{settingsError?.message || 'لا توجد بيانات إعدادات'}</small>
      </div>
    );
  }

  const timezone = settings.timezone || 'Africa/Cairo';

  // 2. حساب بداية اليوم الحالي في الـ timezone المحدد → ثم تحويلها إلى UTC
  const nowUTC = new Date();                           // الوقت الحالي (يُعامل كـ UTC داخلياً في JS)
  const nowInTz = toZonedTime(nowUTC, timezone);       // نقل الوقت إلى المنطقة المطلوبة
  const startOfTodayInTz = startOfDay(nowInTz);        // 00:00:00 في المنطقة الزمنية
  const startOfTodayUTC = fromZonedTime(startOfTodayInTz, timezone);  // إرجاعه إلى UTC

  const startOfTodayISO = formatISO(startOfTodayUTC, { representation: 'complete' });

  console.log('[DEBUG] timezone:', timezone);
  console.log('[DEBUG] startOfTodayISO:', startOfTodayISO);

  // 3. جلب البيانات
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
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">
        حدث خطأ أثناء جلب بيانات المواعيد أو ساعات العمل أو أيام الإجازة
        <br />
        <small>يرجى مراجعة Vercel Logs للتفاصيل</small>
      </div>
    );
  }

  const offDays = offDaysData?.map((row) => row.date) ?? [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المواعيد اليومية</h1>
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
