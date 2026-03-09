'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
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
  timezone: string;
};

function normalizeTime(time: string | null): string {
  if (!time) return '';
  return time.split(':').slice(0, 2).join(':');
}

function formatArabicTime(time: string | null, timezone: string): string {
  if (!time) return '—';

  // نحول الوقت إلى صيغة كاملة إذا كان HH:MM فقط
  let fullTime = time;
  if (time.split(':').length === 2) {
    fullTime = `${time}:00`;
  }

  try {
    // نستخدم تاريخ وهمي + الـ timezone المطلوب
    const date = new Date(`2000-01-01T${fullTime}`);
    if (isNaN(date.getTime())) return time;

    const zoned = toZonedTime(date, timezone);
    let str = format(zoned, 'hh:mm a');

    str = str.replace('AM', 'صباحاً').replace('PM', 'مساءً');
    return str;
  } catch (err) {
    console.error('خطأ في تنسيق الوقت:', err);
    return time || '—';
  }
}

export default function WorkingHoursForm({ initialHours, timezone }: Props) {
  const [hours, setHours] = useState<WorkingHour[]>(initialHours);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (
    dayOfWeek: number,
    field: keyof WorkingHour,
    value: string | number | boolean | null
  ) => {
    setHours(prev =>
      prev.map(h =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const result = await upsertWorkingHours(hours);

    if (result.success) {
      setMessage({ type: 'success', text: 'تم حفظ ساعات العمل بنجاح' });
      setIsEditing(false);
    } else {
      setMessage({ type: 'error', text: result.error || 'حدث خطأ أثناء الحفظ' });
    }

    setSaving(false);
  };

  return (
    <section className="hours-section">
      <div className="section-header">
        <h2>ساعات العمل الأسبوعية</h2>

        {isEditing ? (
          <div className="edit-controls">
            <button className="btn btn-cancel" onClick={() => setIsEditing(false)} disabled={saving}>
              إلغاء
            </button>
            <button className="btn btn-save" onClick={handleSave} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        ) : (
          <button className="btn btn-edit" onClick={() => setIsEditing(true)}>
            تعديل
          </button>
        )}
      </div>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="table-wrapper">
        <table className="hours-table">
          <thead>
            <tr>
              <th>اليوم</th>
              <th>مفتوح</th>
              <th>من</th>
              <th>إلى</th>
              <th>مدة الكشف (د)</th>
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
                      className="form-input"
                      value={normalizeTime(day.start_time)}
                      onChange={e => handleChange(day.day_of_week, 'start_time', e.target.value)}
                    />
                  ) : (
                    formatArabicTime(day.start_time, timezone)
                  )}
                </td>

                <td className="time-cell">
                  {isEditing && day.is_open ? (
                    <input
                      type="time"
                      className="form-input"
                      value={normalizeTime(day.end_time)}
                      onChange={e => handleChange(day.day_of_week, 'end_time', e.target.value)}
                    />
                  ) : (
                    formatArabicTime(day.end_time, timezone)
                  )}
                </td>

                <td>
                  {isEditing && day.is_open ? (
                    <select
                      className="form-input"
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
                    day.slot_duration_minutes ? `${day.slot_duration_minutes} د` : '—'
                  )}
                </td>

                <td className="time-cell">
                  {isEditing && day.is_open ? (
                    <input
                      type="time"
                      className="form-input"
                      value={normalizeTime(day.break_start)}
                      onChange={e => handleChange(day.day_of_week, 'break_start', e.target.value)}
                    />
                  ) : (
                    formatArabicTime(day.break_start, timezone)
                  )}
                </td>

                <td className="time-cell">
                  {isEditing && day.is_open ? (
                    <input
                      type="time"
                      className="form-input"
                      value={normalizeTime(day.break_end)}
                      onChange={e => handleChange(day.day_of_week, 'break_end', e.target.value)}
                    />
                  ) : (
                    formatArabicTime(day.break_end, timezone)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
