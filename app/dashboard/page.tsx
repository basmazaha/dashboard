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

  // جلب الـ timezone من جدول business_settings
  const { data: settingsData, error: settingsError } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  const timezone = settingsData?.timezone || 'Africa/Cairo';

  if (settingsError) {
    console.error('خطأ في جلب إعدادات الأعمال:', settingsError);
  }

  // حساب "اليوم" حسب توقيت النشاط (يصلح المشكلة بعد منتصف الليل)
  const today = (() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find((p: any) => p.type === 'year')?.value ?? '';
    const month = parts.find((p: any) => p.type === 'month')?.value ?? '';
    const day = parts.find((p: any) => p.type === 'day')?.value ?? '';
    return `\( {year}- \){month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  })();

  const { data: appointments, error: apptError } = await supabaseServer
    .from('appointments')
    .select('id, full_name, appointment_date, appointment_time, phone, reason, status')
    .gte('appointment_date', today)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })
    .limit(100);

  const { data: offDaysData, error: offError } = await supabaseServer
    .from('off_days')
    .select('date');

  const { data: workingHours, error: hoursError } = await supabaseServer
    .from('working_hours')
    .select('day_of_week, is_open, start_time, end_time, slot_duration_minutes, break_start, break_end');

  if (apptError || offError || hoursError) {
    console.error('خطأ في جلب البيانات:', { apptError, offError, hoursError });
    return (
      <div className="no-appointments">
        حدث خطأ أثناء جلب البيانات.
        <br />
        <small>يرجى التحقق من الـ console</small>
      </div>
    );
  }

  const offDays = offDaysData?.map(row => row.date) || [];

  return (
    <div>
      <div className="dashboard-page-header">
        <h2 className="dashboard-page-title">المواعيد</h2>
      </div>

      <AppointmentsTable 
        initialAppointments={appointments || []} 
        initialOffDays={offDays}
        initialWorkingHours={workingHours || []} 
        timezone={timezone}
      />
    </div>
  );
}
