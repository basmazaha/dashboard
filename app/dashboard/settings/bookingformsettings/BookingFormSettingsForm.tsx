// app/dashboard/settings/bookingformsettings/BookingFormSettingsForm.tsx

'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateBookingFormSettings, type FormState } from './actions';
import { useState, useEffect } from 'react';

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

  // مفتاح لإعادة تهيئة النموذج بعد التحديث الناجح
  const [formKey, setFormKey] = useState(0);

  const [minNotice, setMinNotice] = useState(initialMinNotice);
  const [daysAhead, setDaysAhead] = useState(initialDaysAhead);

  const [state, formAction] = useFormState(updateBookingFormSettings, initialState);

  const { pending } = useFormStatus();

  // عند نجاح التحديث → نزيد المفتاح → يعاد تهيئة المكون
  useEffect(() => {
    if (state.success && state.minNotice && state.daysAhead) {
      setMinNotice(state.minNotice);
      setDaysAhead(state.daysAhead);
      
      // إعادة تهيئة النموذج بعد تحديث القيم
      const timer = setTimeout(() => {
        setFormKey(prev => prev + 1);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [state.success, state.minNotice, state.daysAhead]);

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

      <form 
        key={formKey}   // ← هذا هو الحل الرئيسي
        action={formAction} 
        className="bookingform-form"
      >
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
            value={minNotice}
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
          <label
            htmlFor="booking_days_ahead"
            className="bookingform-form__label"
          >
            السماح بالحجز حتى
          </label>

          <select
            id="booking_days_ahead"
            name="booking_days_ahead"
            value={daysAhead}
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
