// app/dashboard/page.tsx
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

  const { data: appointments, error } = await supabaseServer
    .from('appointments')
    .select('id, full_name, appointment_date, appointment_time, phone, reason, status')
    .order('appointment_date', { ascending: true })
    .limit(50);

  if (error) {
    console.error('خطأ في جلب المواعيد:', error);
    return (
      <div className="no-appointments">
        حدث خطأ أثناء جلب المواعيد: {error.message}
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

      <AppointmentsTable initialAppointments={appointments || []} />
    </div>
  );
}
