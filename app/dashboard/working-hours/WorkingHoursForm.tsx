'use client';

import { useState } from 'react';
import { upsertWorkingHours } from './actions';

// استيراد ملف الـ CSS الخاص بالصفحة
import './working-hours.css';

const DAY_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

type WorkingHour = {
  day_of_week: number;
  is_open: boolean;
  start_time: string | null;
  end_time: string | null;
  slot_duration_minutes: number;
  break_start: string | null;
  break_end: string | null;
};

type Props = {
  initialHours: WorkingHour[];
};

export default function WorkingHoursForm({ initialHours }: Props) {
  const [hours, setHours] = useState<WorkingHour[]>(initialHours);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggleOpen = (dayOfWeek: number) => {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, is_open: !h.is_open } : h,
      ),
    );
  };

  const handleTimeChange = (
    dayOfWeek: number,
    field: 'start_time' | 'end_time' | 'break_start' | 'break_end',
    value: string,
  ) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayOfWeek ? { ...h, [field]: value || null } : h)),
    );
  };

  const handleDurationChange = (dayOfWeek: number, value: string) => {
    const num = parseInt(value, 10);
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek
          ? { ...h, slot_duration_minutes: isNaN(num) ? 15 : num }
          : h,
      ),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const result = await upsertWorkingHours(hours);

    if (result.success) {
      setMessage({ type: 'success', text: 'تم حفظ ساعات العمل بنجاح' });
    } else {
      setMessage({ type: 'error', text: result.error || 'حدث خطأ أثناء الحفظ' });
    }

    setSaving(false);
  };

  return (
    <div className="working-hours-container">
      <h2 className="section-title">ساعات العمل الأسبوعية</h2>

      <div className="days-grid">
        {hours.map((day) => (
          <div key={day.day_of_week} className="day-card">
            <div className="day-header">
              <h3>{DAY_NAMES[day.day_of_week]}</h3>

              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={day.is_open}
                  onChange={() => handleToggleOpen(day.day_of_week)}
                />
                <span>مفتوح</span>
              </label>
            </div>

            <div className={`day-fields ${!day.is_open ? 'disabled-fields' : ''}`}>
              <div className="field-row">
                <label>من</label>
                <input
                  type="time"
                  value={day.start_time || ''}
                  onChange={(e) =>
                    handleTimeChange(day.day_of_week, 'start_time', e.target.value)
                  }
                  disabled={!day.is_open}
                />
              </div>

              <div className="field-row">
                <label>إلى</label>
                <input
                  type="time"
                  value={day.end_time || ''}
                  onChange={(e) =>
                    handleTimeChange(day.day_of_week, 'end_time', e.target.value)
                  }
                  disabled={!day.is_open}
                />
              </div>

              <div className="field-row">
                <label>مدة الكشف (دقيقة)</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  step={5}
                  value={day.slot_duration_minutes}
                  onChange={(e) => handleDurationChange(day.day_of_week, e.target.value)}
                  disabled={!day.is_open}
                />
              </div>

              <div className="field-row">
                <label>استراحة من</label>
                <input
                  type="time"
                  value={day.break_start || ''}
                  onChange={(e) =>
                    handleTimeChange(day.day_of_week, 'break_start', e.target.value)
                  }
                  disabled={!day.is_open}
                />
              </div>

              <div className="field-row">
                <label>استراحة إلى</label>
                <input
                  type="time"
                  value={day.break_end || ''}
                  onChange={(e) =>
                    handleTimeChange(day.day_of_week, 'break_end', e.target.value)
                  }
                  disabled={!day.is_open}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`btn btn-primary ${saving ? 'disabled' : ''}`}
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
