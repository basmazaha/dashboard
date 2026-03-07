import { getWorkingHoursAndOffDays } from './actions';
import WorkingHoursForm from './WorkingHoursForm';
import OffDaysSection from './OffDaysSection';

export const dynamic = 'force-dynamic';

export default async function WorkingHoursPage() {
  const result = await getWorkingHoursAndOffDays();

  if (!result.success) {
    return (
      <div className="error-message">
        حدث خطأ أثناء جلب البيانات.
      </div>
    );
  }

  const { workingHours, offDays } = result;

  const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
  const defaultHours = daysOfWeek.map(dow => {
    const existing = workingHours.find(h => h.day_of_week === dow);
    return existing || {
      day_of_week: dow,
      is_open: false,
      start_time: null,
      end_time: null,
      slot_duration_minutes: null,
      break_start: null,
      break_end: null,
    };
  });

  return (
    <div>
      <WorkingHoursForm initialHours={defaultHours} />
      <OffDaysSection initialOffDays={offDays || []} />
    </div>
  );
}
