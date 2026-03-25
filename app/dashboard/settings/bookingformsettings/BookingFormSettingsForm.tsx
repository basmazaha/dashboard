// app/dashboard/settings/bookingformsettings/BookingFormSettingsForm.tsx

'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateBookingFormSettings } from './actions';
import { useState, useEffect } from 'react';   // ← أضف useEffect

type FormState = {
  success: boolean;
  message: string;
  // يفضل أن ترجع الـ action القيم الجديدة بعد التحديث
  minNotice?: number;
  daysAhead?: number;
};

const initialState: FormState = {
  success: false,
  message: '',
};

const MIN_NOTICE_OPTIONS = [
  { label: '1 ساعة', value: 60 },
  { label: '2 ساعات', value: 120 },
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
  // استخدام state للتحكم في القيم (controlled)
  const [minNotice, setMinNotice] = useState(initialMinNotice);
  const [daysAhead, setDaysAhead] = useState(initialDaysAhead);

  const [state, formAction] = useFormState(updateBookingFormSettings, initialState);

  const { pending } = useFormStatus();

  // ← الحل المهم: عند نجاح التحديث، نحدث الـ state محلياً
  useEffect(() => {
    if (state.success) {
      if (state.minNotice !== undefined) {
        setMinNotice(state.minNotice);
      }
      if (state.daysAhead !== undefined) {
        setDaysAhead(state.daysAhead);
      }
    }
  }, [state.success, state.minNotice, state.daysAhead]);

  return (
    <>
      {state.message && (
        <div className={`bookingform-message ${state.success ? 'success' : 'error'}`}>
          {state.message}
        </div>
      )}

      <form action={formAction} className="bookingform-form">
        {/* أقل وقت للحجز */}
        <div className="bookingform-form__group">
          <label htmlFor="min_booking_notice_minutes" className="bookingform-form__label">
            أقل وقت قبل الحجز
          </label>

          <select
            id="min_booking_notice_minutes"
            name="min_booking_notice_minutes"
            value={minNotice}                    // ← غيرنا إلى value
            onChange={(e) => setMinNotice(Number(e.target.value))}
            className="bookingform-form__select"
            disabled={pending}
          >
            {MIN_NOTICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* عدد الأيام المسموح بالحجز خلالها */}
        <div className="bookingform-form__group">
          <label htmlFor="booking_days_ahead" className="bookingform-form__label">
            السماح بالحجز حتى
          </label>

          <select
            id="booking_days_ahead"
            name="booking_days_ahead"
            value={daysAhead}                    // ← غيرنا إلى value
            onChange={(e) => setDaysAhead(Number(e.target.value))}
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
