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

const MIN_NOTICE_OPTIONS = [
  { label: '1 ساعة', value: 60 },
  { label: '2 ساعتان', value: 120 },
  { label: '3 ساعات', value: 180 },
  { label: '6 ساعات', value: 360 },
  { label: '12 ساعة', value: 720 },
  { label: '24 ساعة', value: 1440 },
  { label: '48 ساعة', value: 2880 },
];
const DAYS_AHEAD_OPTIONS = [7, 15, 30, 60, 90];

interface Props {
  initialMinNotice: number;
  initialDaysAhead: number;
}

export default function BookingFormSettingsForm({
  initialMinNotice,
  initialDaysAhead,
}: Props) {
  const [state, formAction] = useFormState(
    updateBookingFormSettings,
    initialState
  );

  const { pending } = useFormStatus();

  return (
    <>
      {state.message && (
        <div
          className={`bookingform-message ${
            state.success ? 'success' : 'error'
          }`}
        >
          {state.message}
        </div>
      )}

      <form action={formAction} className="bookingform-form">
        {/* أقل وقت للحجز */}
        <div className="bookingform-form__group">
          <label
            htmlFor="min_booking_notice_minutes"
            className="bookingform-form__label"
          >
            أقل وقت قبل الحجز
          </label>

          <select
            id="min_booking_notice_minutes"
            name="min_booking_notice_minutes"
            defaultValue={initialMinNotice}
            className="bookingform-form__select"
            disabled={pending}
          >
            {MIN_NOTICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* عدد الأيام المسموح بالحجز خلالها */}
        <div className="bookingform-form__group">
          <label
            htmlFor="booking_days_ahead"
            className="bookingform-form__label"
          >
            السماح بالحجز حتى
          </label>

          <select
            id="booking_days_ahead"
            name="booking_days_ahead"
            defaultValue={initialDaysAhead}
            className="bookingform-form__select"
            disabled={pending}
          >
            {DAYS_AHEAD_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} يوم
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="bookingform-form__submit"
          disabled={pending}
        >
          {pending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </form>
    </>
  );
}
