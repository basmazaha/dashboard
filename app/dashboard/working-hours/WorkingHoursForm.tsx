// app/dashboard/working-hours/WorkingHoursForm.tsx

'use client';

import { useState } from 'react';
import { upsertWorkingHours } from './actions';
import type { WorkingHour } from './types';
import './working-hours.css';

const DAY_NAMES: Record<number, string> = {
  0: 'الأحد',
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
};

type Props = {
  initialHours: WorkingHour[];
};

function normalizeTime(time: string | null): string {
  if (!time) return '';
  return time.split(':').slice(0, 2).join(':');
}

function formatArabicTime(time: string | null): string {
  if (!time) return '—';

  let fullTime = time;

  if (time.split(':').length === 2) {
    fullTime = `${time}:00`;
  }

  try {
    const date = new Date(`2000-01-01T${fullTime}`);

    if (isNaN(date.getTime())) return time;

    const formatted = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return formatted
      .replace('AM', 'صباحاً')
      .replace('PM', 'مساءً');

  } catch {
    return time || '—';
  }
}

function hoursChanged(a: WorkingHour[], b: WorkingHour[]) {
  if (a.length !== b.length) return true;

  for (let i = 0; i < a.length; i++) {
    const h1 = a[i];
    const h2 = b[i];

    if (
      h1.is_open !== h2.is_open ||
      h1.start_time !== h2.start_time ||
      h1.end_time !== h2.end_time ||
      h1.break_start !== h2.break_start ||
      h1.break_end !== h2.break_end ||
      h1.slot_duration_minutes !== h2.slot_duration_minutes
    ) {
      return true;
    }
  }

  return false;
}

export default function WorkingHoursForm({ initialHours }: Props) {
  const [hours, setHours] = useState<WorkingHour[]>(initialHours);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [originalHours, setOriginalHours] = useState<WorkingHour[]>(initialHours);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  
  const hasChanges = hoursChanged(hours, originalHours);

  const handleChange = (
    dayOfWeek: number,
    field: keyof WorkingHour,
    value: string | number | boolean | null
  ) => {

    setErrors(prev => {
  const newErrors = { ...prev };
  delete newErrors[`${dayOfWeek}_${field}`];
  return newErrors;
});
    
    setHours(prev =>
  prev.map(h => {
    if (h.day_of_week !== dayOfWeek) return h;

    if (field === 'is_open' && value === false) {
      return {
        ...h,
        is_open: false,
        start_time: null,
        end_time: null,
        break_start: null,
        break_end: null,
        slot_duration_minutes: null
      };
    }

    return { ...h, [field]: value };
  })
);
  };

  const handleSave = async () => {
  setMessage(null);


    for (const day of hours) {
  if (day.is_open) {

    if (!day.start_time || !day.end_time || !day.slot_duration_minutes) {

  const newErrors: Record<string, boolean> = {};

  if (!day.start_time)
    newErrors[`${day.day_of_week}_start_time`] = true;

  if (!day.end_time)
    newErrors[`${day.day_of_week}_end_time`] = true;

  if (!day.slot_duration_minutes)
    newErrors[`${day.day_of_week}_slot_duration_minutes`] = true;

  setErrors(newErrors);

  setMessage({
    type: 'error',
    text: `يرجى تحديد من وإلى ومدة الموعد ليوم ${DAY_NAMES[day.day_of_week]}`
  });

  return;
    }

    const start = day.start_time;
    const end = day.end_time;

    if (start >= end) {
      setMessage({
        type: 'error',
        text: `وقت النهاية يجب أن يكون بعد البداية (${DAY_NAMES[day.day_of_week]})`
      });
      return;
    }

    if (day.break_start && !day.break_end) {

  setErrors({
    [`${day.day_of_week}_break_end`]: true
  });

  setMessage({
    type: 'error',
    text: `يرجى تحديد نهاية الاستراحة (${DAY_NAMES[day.day_of_week]})`
  });

  return;
    }

    if (!day.break_start && day.break_end) {

  setErrors({
    [`${day.day_of_week}_break_start`]: true
  });

  setMessage({
    type: 'error',
    text: `يرجى تحديد بداية الاستراحة (${DAY_NAMES[day.day_of_week]})`
  });

  return;
    }

    if (day.break_start && day.break_end) {

      if (day.break_start >= day.break_end) {
        setMessage({
          type: 'error',
          text: `نهاية الاستراحة يجب أن تكون بعد بدايتها (${DAY_NAMES[day.day_of_week]})`
        });
        return;
      }

      if (day.break_start < start || day.break_end > end) {
        setMessage({
          type: 'error',
          text: `الاستراحة يجب أن تكون داخل ساعات العمل (${DAY_NAMES[day.day_of_week]})`
        });
        return;
      }
    }
  }
    }

  setSaving(true);

  const result = await upsertWorkingHours(hours);

  if (result.success) {
    setMessage({ type: 'success', text: 'تم حفظ ساعات العمل بنجاح' });
    setOriginalHours(hours);
    setIsEditing(false);
  } else {
    setMessage({ type: 'error', text: result.error || 'حدث خطأ أثناء الحفظ' });
  }

  setSaving(false);
};

  const handleCancel = () => {
  setHours(originalHours);
  setIsEditing(false);
  setMessage(null);
};

  return (
    <section className="hours-section">
      <div className="section-header">
        <h2>ساعات العمل الأسبوعية</h2>
      </div>

      <div className="table-wrapper">
        <table className="hours-table">
          <thead>
            <tr>
              <th>اليوم</th>
              <th>مفتوح</th>
              <th>من</th>
              <th>إلى</th>
              <th>مدة الموعد</th>
              <th>استراحة من</th>
              <th>استراحة إلى</th>
            </tr>
          </thead>
          <tbody>
            {hours.map(day => (
              <tr key={day.day_of_week}>
                <td className="day-cell">{DAY_NAMES[day.day_of_week]}</td>

                <td className="checkbox-cell">
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={day.is_open}
                      onChange={e => handleChange(day.day_of_week, 'is_open', e.target.checked)}
                    />
                  ) : (
                    <span className={day.is_open ? 'yes' : 'no'}>
                      {day.is_open ? 'نعم' : 'لا'}
                    </span>
                  )}
                </td>

                <td className="time-cell">
                  {isEditing && day.is_open ? (
                    <input
                      type="time"
                      className={`form-input ${errors[`${day.day_of_week}_start_time`] ? 'input-error' : ''}`}
                      value={normalizeTime(day.start_time)}
                      onChange={e => handleChange(day.day_of_week, 'start_time', e.target.value)}
                    />
                  ) : (
                    formatArabicTime(day.start_time)
                  )}
                </td>

                <td className="time-cell">
                  {isEditing && day.is_open ? (
                    <input
                      type="time"
                      className={`form-input ${errors[`${day.day_of_week}_end_time`] ? 'input-error' : ''}`}
                      value={normalizeTime(day.end_time)}
                      onChange={e => handleChange(day.day_of_week, 'end_time', e.target.value)}
                    />
                  ) : (
                    formatArabicTime(day.end_time)
                  )}
                </td>

                <td>
                  {isEditing && day.is_open ? (
                    <select
                      className={`form-input ${errors[`${day.day_of_week}_slot_duration_minutes`] ? 'input-error' : ''}`}
                      value={day.slot_duration_minutes ?? ''}
                      onChange={(e) =>
                        handleChange(
                          day.day_of_week,
                          'slot_duration_minutes',
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    >
                      <option value="">—</option>
                      <option value="15">15 دقيقة</option>
                      <option value="30">30 دقيقة</option>
                      <option value="60">60 دقيقة</option>
                    </select>
                  ) : (
                    day.slot_duration_minutes ? `${day.slot_duration_minutes} دقيقة` : '—'
                  )}
                </td>

                <td className="time-cell">
                  {isEditing && day.is_open ? (
                    <input
                      type="time"
                      className={`form-input ${errors[`${day.day_of_week}_break_start`] ? 'input-error' : ''}`}
                      value={normalizeTime(day.break_start)}
                      onChange={e => handleChange(day.day_of_week, 'break_start', e.target.value)}
                    />
                  ) : (
                    formatArabicTime(day.break_start)
                  )}
                </td>

                <td className="time-cell">
                  {isEditing && day.is_open ? (
                    <input
                      type="time"
                      className={`form-input ${errors[`${day.day_of_week}_break_end`] ? 'input-error' : ''}`}
                      value={normalizeTime(day.break_end)}
                      onChange={e => handleChange(day.day_of_week, 'break_end', e.target.value)}
                    />
                  ) : (
                    formatArabicTime(day.break_end)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

        <div className="edit-button">
        {isEditing ? (
          <div className="edit-controls">
            <button className="btn btn-cancel" onClick={handleCancel} disabled={saving}>
              إلغاء
            </button>
            <button
              className="btn btn-save"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        ) : (
          <button className="btn btn-edit" onClick={() => setIsEditing(true)}>
            تعديل
          </button>
        )}
        </div> 
      </div>
    </section>
  );
}

