// app/dashboard/today-appointments/page.tsx

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import TodayAppointmentsTable from './TodayAppointmentsTable';
import { fetchTodayAppointments, getBusinessTimezone } from './actions';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function TodayAppointmentsPage({ searchParams }: Props) {
  const { userId } = await auth();

  if (!userId) redirect('/sign-in');

  const currentPage = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 20;

  const timezone = await getBusinessTimezone();

  const appointmentsResult = await fetchTodayAppointments(
    timezone,
    currentPage,
    pageSize
  );

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

  const { data: offDaysData } = await supabaseServer
    .from('off_days')
    .select('date');

  const { data: workingHours } = await supabaseServer
    .from('working_hours')
    .select(
      'day_of_week, is_open, start_time, end_time, slot_duration_minutes, break_start, break_end'
    );

  const offDays = offDaysData?.map((row) => row.date) || [];

  return (
    <TodayAppointmentsTable
      initialAppointments={appointments || []}
      initialOffDays={offDays}
      initialWorkingHours={workingHours || []}
      timezone={timezone}
      currentPage={currentPage}
      pageSize={pageSize}
      totalCount={totalCount}
    />
  );
}
