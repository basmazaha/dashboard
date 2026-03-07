import { getWorkingHoursAndOffDays } from './actions';
import WorkingHoursForm from './WorkingHoursForm';
import OffDaysSection from './OffDaysSection';

export const dynamic = 'force-dynamic';

export default async function WorkingHoursPage() {
  const result = await getWorkingHoursAndOffDays();

  if (!result.success) {
    return (
      <div style={{ padding: '2rem', color: '#dc2626', textAlign: 'center' }}>
        حدث خطأ أثناء جلب البيانات: {result.error || 'غير معروف'}
      </div>
    );
  }

  // ضمان أن workingHours و offDays دائمًا مصفوفة (حتى لو فارغة)
  const workingHours = result.workingHours ?? [];
  const offDays = result.offDays ?? [];

  const daysOfWeek = [0, 1, 2, 3, 4, 5, 6];

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
    <div style={{ padding: '1.5rem' }}>
      <WorkingHoursForm initialHours={defaultHours} />
      <OffDaysSection initialOffDays={offDays} />
    </div>
  );
}
