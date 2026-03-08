// app/dashboard/settings/timezone/TimezoneForm.tsx
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateTimezone } from './actions';
import './SettingsPage.css';

const COMMON_TIMEZONES = [
  { value: 'Africa/Cairo', label: 'القاهرة (UTC+2/+3)' },
  { value: 'Asia/Riyadh', label: 'الرياض (UTC+3)' },
  { value: 'Asia/Dubai', label: 'دبي (UTC+4)' },
  { value: 'Europe/Istanbul', label: 'إسطنبول (UTC+3)' },
  { value: 'America/New_York', label: 'نيويورك (UTC-5/-4)' },
  { value: 'UTC', label: 'UTC' },
];

type FormState = {
  success: boolean;
  message: string;
};

const initialState: FormState = {
  success: false,
  message: '',
};

interface TimezoneFormProps {
  initialTimezone: string;
}

export default function TimezoneForm({ initialTimezone }: TimezoneFormProps) {
  const [state, formAction] = useFormState(updateTimezone, initialState);
  const { pending } = useFormStatus();

  return (
    <>
      {state.message && (
        <div className={`form-message ${state.success ? 'success' : 'error'}`}>
          {state.message}
        </div>
      )}

      <form action={formAction} className="settings-form">
        <div className="settings-form__group">
          <label htmlFor="timezone" className="settings-form__label">
            المنطقة الزمنية
          </label>

          <select
            id="timezone"
            name="timezone"
            defaultValue={initialTimezone}
            className="settings-form__select"
            disabled={pending}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="settings-form__submit"
          disabled={pending}
        >
          {pending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </form>
    </>
  );
}
