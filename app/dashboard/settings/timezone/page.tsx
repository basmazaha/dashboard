// app/dashboard/settings/timezone/page.tsx
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

export default function TimezoneSettingsPage({
  initialTimezone,
}: {
  initialTimezone: string;
}) {
  const [state, formAction] = useFormState(updateTimezone, initialState);
  const { pending } = useFormStatus();

  return (
    <div className="settings-page">
      <div className="settings-page__container">
        <header className="settings-page__header">
          <h1 className="settings-page__title">إعدادات المنطقة الزمنية</h1>
          <p className="settings-page__description">
            اختر التوقيت المحلي الافتراضي للشركة
          </p>
        </header>

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
              defaultValue={initialTimezone || 'Africa/Cairo'}
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
      </div>
    </div>
  );
}

// جلب البيانات الأولية من السيرفر
export async function getServerSideProps() {
  const { data } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .eq('id', 1)
    .single();

  return {
    props: {
      initialTimezone: data?.timezone || 'Africa/Cairo',
    },
  };
}
