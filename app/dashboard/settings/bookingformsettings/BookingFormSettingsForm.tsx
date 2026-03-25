// app/dashboard/settings/bookingformsettings/BookingFormSettingsForm.tsx
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateBookingFormSettings } from './actions';

type FormState = {
  success: boolean;
  message: string;
};

const initialState: FormState = {
  success: false,
  message: '',
};

const NOTICE_HOURS = [1, 2, 3, 6, 12, 24, 48];
const NOTICE_MINUTES = [1, 2, 3, 6, 12, 24, 48];
const BOOKING_DAYS = [7, 15, 30, 60, 90];

interface Props {
  minBookingNoticeHours: number;
  minBookingNoticeMinutes: number;
  bookingDaysAhead: number;
}

export default function BookingFormSettingsForm({
  minBookingNoticeHours,
  minBookingNoticeMinutes,
  bookingDaysAhead,
}: Props) {
  const [state, formAction] = useFormState(updateBookingFormSettings, initialState);
  const { pending } = useFormStatus();

  return (
    <>
      {state.message && (
        <div className={`booking-message ${state.success ? 'success' : 'error'}`}>
          {state.message}
        </div>
      )}

      <form action={formAction} className="booking-form">

        {/* minimum notice hours */}
        <div className="booking-form__group">
          <label className="booking-form__label">
            أقل وقت قبل الحجز (ساعات)
          </label>

          <select
            name="min_booking_notice_hours"
            defaultValue={minBookingNoticeHours}
            className="booking-form__select"
            disabled={pending}
          >
            {NOTICE_HOURS.map((h) => (
              <option key={h} value={h}>
                {h} ساعة
              </option>
            ))}
          </select>
        </div>

        {/* minimum notice minutes */}
        <div className="booking-form__group">
          <label className="booking-form__label">
            أقل وقت قبل الحجز (دقائق)
          </label>

          <select
            name="min_booking_notice_minutes"
            defaultValue={minBookingNoticeMinutes}
            className="booking-form__select"
            disabled={pending}
          >
            {NOTICE_MINUTES.map((m) => (
              <option key={m} value={m}>
                {m} دقيقة
              </option>
            ))}
          </select>
        </div>

        {/* booking days ahead */}
        <div className="booking-form__group">
          <label className="booking-form__label">
            السماح بالحجز حتى
          </label>

          <select
            name="booking_days_ahead"
            defaultValue={bookingDaysAhead}
            className="booking-form__select"
            disabled={pending}
          >
            {BOOKING_DAYS.map((d) => (
              <option key={d} value={d}>
                {d} يوم
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="booking-form__submit"
          disabled={pending}
        >
          {pending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </form>
    </>
  );
}
