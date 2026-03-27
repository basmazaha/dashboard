// app/dashboard/search/page.tsx

import { supabaseServer } from '@/lib/supabaseServer';
import SearchAppointmentsTable from './SearchAppointmentsTable';
import { getBusinessTimezone } from './actions';   // تأكدي إن المسار ده صح
import '../dashboard.css';

// جلب الأيام المغلقة (off_days)
async function getOffDays() {
  const supabase = supabaseServer;

  const { data, error } = await supabase
    .from('off_days')                    // ← غيّري اسم الجدول لو مختلف عندك
    .select('date')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching off days:', error);
    return [];
  }

  return data?.map(row => row.date) || [];
}

// جلب ساعات العمل (working_hours)
async function getWorkingHours() {
  const supabase = supabaseServer;

  const { data, error } = await supabase
    .from('working_hours')               // ← غيّري اسم الجدول لو مختلف
    .select('*')
    .order('day_of_week');

  if (error) {
    console.error('Error fetching working hours:', error);
    return [];
  }

  return data || [];
}

export default async function SearchPage() {
  const timezone = await getBusinessTimezone();
  const offDays = await getOffDays();
  const workingHours = await getWorkingHours();

  return (
    <div className="dashboard-content">

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
