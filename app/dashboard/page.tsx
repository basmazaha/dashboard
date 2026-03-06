import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import AppointmentsTable from './AppointmentsTable';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();

  // جلب المواعيد
  const { data: appointments, error: apptError } = await supabaseServer
    .from('appointments')
    .select('id, full_name, appointment_date, appointment_time, phone, reason, status')
    .order('appointment_date', { ascending: true })
    .limit(50);

  // جلب أيام العطل
  const { data: offDays, error: offError } = await supabaseServer
    .from('off_days')
    .select('date');

  // جلب ساعات العمل
  const { data: workingHours, error: hoursError } = await supabaseServer
    .from('working_hours')
    .select('day, start_time, end_time, interval_minutes');

  if (apptError || offError || hoursError) {
    console.error('خطأ في جلب البيانات:', apptError || offError || hoursError);
    return (
      <div className="no-appointments">
        حدث خطأ أثناء جلب البيانات، يرجى المحاولة لاحقًا.
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-page-header">
        <h2 className="dashboard-page-title">المواعيد</h2>
        <div className="current-user-info">
          المستخدم الحالي: <strong>{user?.firstName || user?.username || 'غير معروف'}</strong> 
          (ID: {userId.slice(0, 8)}...)
        </div>
      </div>

      <AppointmentsTable 
        initialAppointments={appointments || []} 
        initialOffDays={offDays || []} 
        initialWorkingHours={workingHours || []} 
      />
    </div>
  );
}
