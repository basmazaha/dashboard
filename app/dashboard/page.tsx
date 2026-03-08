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

  const today = new Date().toISOString();

  // جلب timezone الشركة (من الجدول)
  const { data: settings, error: settingsError } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .eq('id', 1)
    .single();

  if (settingsError || !settings) {
    console.error('خطأ في جلب timezone:', settingsError);
    // fallback إذا لم يوجد
    const fallbackTz = 'Africa/Cairo';
  }

  const timezone = settings?.timezone || 'Africa/Cairo';

  // جلب المواعيد (مع التحويل إلى التوقيت المحلي إذا أردت، لكن هنا نجلب الأصلي فقط)
  const { data: appointments, error: apptError } = await supabaseServer
    .from('appointments')
    .select('id, full_name, appointment_date, appointment_time, phone, reason, status')
    .gte('appointment_date', today.split('T')[0])
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
        <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
          المنطقة الزمنية للشركة: <strong>{timezone}</strong>
        </p>
      </div>

      <AppointmentsTable 
        initialAppointments={appointments || []} 
        initialOffDays={offDays}
        initialWorkingHours={workingHours || []}
        businessTimezone={timezone}  // ← تمرير timezone للمكون
      />
    </div>
  );
}
