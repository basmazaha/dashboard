// app/dashboard/settings/bookingformsettings/BookingFormSettingsForm.tsx

'use client';

import { useState } from 'react';
import { updateBookingFormSettings } from './actions';

type FormState = {
  success: boolean;
  message: string;
};

interface Props {
  initialMinNotice: number;
  initialDaysAhead: number;
}

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

export default function BookingFormSettingsForm({
  initialMinNotice,
  initialDaysAhead,
}: Props) {
  const [minNotice, setMinNotice] = useState(initialMinNotice);
  const [daysAhead, setDaysAhead] = useState(initialDaysAhead);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    setMessage(null);

    const result = await updateBookingFormSettings({ success: false, message: '' }, formData); // أو عدّل الـ action ليأخذ prevState

    if (result.success) {
      // تحديث الحالة المحلية فورًا (هذا هو الجزء المهم)
      setMinNotice(Number(formData.get('min_booking_notice_minutes')));
      setDaysAhead(Number(formData.get('booking_days_ahead')));

      setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
    } else {
      setMessage({ type: 'error', text: result.message || 'حدث خطأ أثناء الحفظ' });
    }

    setSaving(false);
  };

  return (
    <>
      {message && (
        <div className={`bookingform-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form action={handleSubmit} className="bookingform-form">
        {/* أقل وقت للحجز */}
        <div className="bookingform-form__group">
          <label htmlFor="min_booking_notice_minutes" className="bookingform-form__label">
            أقل وقت قبل الحجز
          </label>
          <select
            id="min_booking_notice_minutes"
            name="min_booking_notice_minutes"
            value={minNotice}           // ← غيّرنا من defaultValue إلى value
            onChange={(e) => setMinNotice(Number(e.target.value))}
            className="bookingform-form__select"
            disabled={saving}
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
          <label htmlFor="booking_days_ahead" className="bookingform-form__label">
            السماح بالحجز حتى
          </label>
          <select
            id="booking_days_ahead"
            name="booking_days_ahead"
            value={daysAhead}           // ← غيّرنا من defaultValue إلى value
            onChange={(e) => setDaysAhead(Number(e.target.value))}
            className="bookingform-form__select"
            disabled={saving}
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
          disabled={saving}
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </form>
    </>
  );
}
