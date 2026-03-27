// app/dashboard/settings/timezone/TimezoneForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateTimezone } from './actions';

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

const COMMON_TIMEZONES = [
  { value: 'Africa/Cairo', label: 'القاهرة (UTC+2/+3)' },
  { value: 'Asia/Riyadh', label: 'الرياض (UTC+3)' },
  { value: 'Asia/Dubai', label: 'دبي (UTC+4)' },
  { value: 'Europe/Istanbul', label: 'إسطنبول (UTC+3)' },
  { value: 'America/New_York', label: 'نيويورك (UTC-5/-4)' },
  { value: 'UTC', label: 'UTC' },
];

interface Props {
  initialTimezone: string;
}

export default function TimezoneForm({ initialTimezone }: Props) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // التحقق إذا تم تغيير القيمة
  const hasChanges = timezone !== initialTimezone;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasChanges) return;

    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateTimezone(formData);

    if (result.success) {
      setMessage({ type: 'success', text: 'تم حفظ المنطقة الزمنية بنجاح' });
      // يمكنك تحديث initialTimezone محليًا إذا أردت
      // setInitialTimezone(timezone); لكن ليس ضروري هنا
    } else {
      setMessage({ type: 'error', text: result.error || 'حدث خطأ أثناء الحفظ' });
    }

    setSaving(false);
  };

  const handleBack = () => {
    router.push('/dashboard/settings');
  };

  return (
    <>

      <form onSubmit={handleSubmit} className="timezone-form">
        <div className="timezone-form__group">
          <label htmlFor="timezone" className="timezone-form__label">
            المنطقة الزمنية
          </label>
          <select
            id="timezone"
            name="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="timezone-form__select"
            disabled={saving}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        
        <div className="form-buttons">

          {message && (
        <div className={`timezone-message ${message.type}`}>
          {message.text}
        </div>
      )}
          
          <button
            type="submit"
            className="timezone-form__submit"
            disabled={saving || !hasChanges}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>

          <button
            type="button"
            className="btn-back"
            onClick={handleBack}
            disabled={saving}
          >
            رجــــوع
          </button>
        </div>
      </form>
    </>
  );
}
