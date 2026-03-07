// app/dashboard/working-hours/page.tsx

import { getWorkingHoursAndOffDays } from './actions';
import WorkingHoursForm from './WorkingHoursForm';
import OffDaysSection from './OffDaysSection';

export const dynamic = 'force-dynamic';

export default async function WorkingHoursPage() {
  const result = await getWorkingHoursAndOffDays();

  if (!result.success || !result.workingHours) {
    return (
      <div className="error-message">
        حدث خطأ أثناء جلب بيانات ساعات العمل: {result.error || 'غير معروف'}
      </div>
    );
  }

  const { workingHours, offDays } = result;

  const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];

  // هنا TypeScript متأكد إن workingHours هو array
  const defaultHours = daysOfWeek.map((dow) => {
    const existing = workingHours.find((h) => h.day_of_week === dow);
    return (
      existing || {
        day_of_week: dow,
        is_open: false,
        start_time: null,
        end_time: null,
        slot_duration_minutes: 15,
        break_start: null,
        break_end: null,
      }
    );
  });

  return (
    <div className="working-hours-page">
      <h2 className="page-title">إدارة ساعات العمل والعطلات</h2>

      <WorkingHoursForm initialHours={defaultHours} />

      <OffDaysSection initialOffDays={offDays ?? []} />
    </div>
  );
}
