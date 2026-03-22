import { createServerClient } from '@/lib/supabaseServer'; // افترضت أن لديكِ هذا الـ helper
import SearchAppointmentsTable from './SearchAppointmentsTable';
import { getBusinessTimezone } from '../dashboard/actions'; // من actions اللي أضفناها قبل كده

// بافتراض أن لديكِ functions لجلب off_days و working_hours
// إما من actions أو مباشرة هنا
async function getOffDays() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('off_days')
    .select('date')
    .order('date', { ascending: true });
  return data?.map(row => row.date) || [];
}

async function getWorkingHours() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('working_hours')
    .select('*')
    .order('day_of_week');
  return data || [];
}

export default async function SearchPage() {
  const timezone = await getBusinessTimezone();
  const offDays = await getOffDays();
  const workingHours = await getWorkingHours();

  return (
    <div className="dashboard-content">
      <h1 className="page-title">بحث في المواعيد</h1>
      
      <SearchAppointmentsTable
        initialAppointments={[]}
        initialOffDays={offDays}
        initialWorkingHours={workingHours}
        timezone={timezone}
        currentPage={1}
        pageSize={20}
        totalCount={0}
      />
    </div>
  );
}
