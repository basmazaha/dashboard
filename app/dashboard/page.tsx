// dashboard/app/dashboard/page.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import AppointmentsTable from './AppointmentsTable';
import { fetchAppointments } from './actions';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function DashboardPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const currentPage = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 20;

  // جلب الـ timezone أولاً
  const { data: settings, error: tzError } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  const timezone = settings?.timezone || 'Africa/Cairo';

  if (tzError) {
    console.error('خطأ في جلب الـ timezone:', tzError);
  }

  // جلب المواعيد مع الـ pagination
  const appointmentsResult = await fetchAppointments(timezone, currentPage, pageSize);

  if ('error' in appointmentsResult) {
    return (
      <div className="no-appointments">
        حدث خطأ أثناء جلب المواعيد
        <br />
        <small>{appointmentsResult.error}</small>
      </div>
    );
  }

  const { appointments, totalCount } = appointmentsResult;

  // جلب أيام الإجازة
  const { data: offDaysData, error: offError } = await supabaseServer
    .from('off_days')
    .select('date');

  // جلب ساعات العمل
  const { data: workingHours, error: hoursError } = await supabaseServer
    .from('working_hours')
    .select('day_of_week, is_open, start_time, end_time, slot_duration_minutes, break_start, break_end');

  if (offError || hoursError) {
    console.error('خطأ في جلب البيانات الإضافية:', { offError, hoursError });
    return (
      <div className="no-appointments">
        حدث خطأ أثناء جلب البيانات الإضافية.
      </div>
    );
  }

  const offDays = offDaysData?.map(row => row.date) || [];

  return (
    <div>
      <div className="dashboard-page-header">
        <h2 className="dashboard-page-title">المواعيد القادمة</h2>
      </div>

      <AppointmentsTable
        initialAppointments={appointments || []}
        initialOffDays={offDays}
        initialWorkingHours={workingHours || []}
        timezone={timezone}
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={totalCount}
      />
    </div>
  );
}
