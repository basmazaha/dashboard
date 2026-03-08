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

  const today = new Date().toISOString().split('T')[0]; // مثل: "2025-03-08"

  const { data: appointments, error: apptError } = await supabaseServer
    .from('appointments')
    .select('id, full_name, appointment_date, appointment_time, phone, reason, status')
    .gte('appointment_date', today)                          // ← من اليوم فصاعدًا فقط
    .order('appointment_date', { ascending: true })          // الأقرب أولاً
    .order('appointment_time', { ascending: true })          // ثم حسب الوقت داخل اليوم
    .limit(100);                                             // زيادة الحد قليلاً إذا لزم

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
      />
    </div>
  );
}
