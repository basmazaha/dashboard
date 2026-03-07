'use client';

import { useState } from 'react';
import { upsertWorkingHours } from './actions';
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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggleOpen = (dayOfWeek: number) => {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, is_open: !h.is_open } : h
      )
    );
  };

  const handleTimeChange = (
    dayOfWeek: number,
    field: 'start_time' | 'end_time' | 'break_start' | 'break_end',
    value: string
  ) => {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value || null } : h
      )
    );
  };

  const handleDurationChange = (dayOfWeek: number, value: string) => {
    const num = parseInt(value, 10);
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek
          ? { ...h, slot_duration_minutes: isNaN(num) ? 15 : num }
          : h
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

  const toggleEdit = () => {
    if (isEditing) {
      // إلغاء التعديل بدون حفظ
      setIsEditing(false);
      setMessage(null);
    } else {
      setIsEditing(true);
    }
  };

  return (
    <div className="working-hours-container">
      <div className="section-header">
        <h2 className="section-title">ساعات العمل الأسبوعية</h2>
        <div className="header-actions">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={toggleEdit}
                className="btn btn-secondary"
                disabled={saving}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={toggleEdit}
              className="btn btn-edit"
            >
              تعديل ساعات العمل
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="days-list">
        {hours.map((day) => (
          <div key={day.day_of_week} className="day-item">
            <div className="day-header">
              <h3 className="day-name">{DAY_NAMES[day.day_of_week]}</h3>
              {isEditing ? (
                <label className="open-toggle">
                  <input
                    type="checkbox"
                    checked={day.is_open}
                    onChange={() => handleToggleOpen(day.day_of_week)}
                  />
                  <span>مفتوح</span>
                </label>
              ) : (
                <span className={`status-badge ${day.is_open ? 'status-open' : 'status-closed'}`}>
                  {day.is_open ? 'مفتوح' : 'مغلق'}
                </span>
              )}
            </div>

            <div className="day-details">
              <div className="detail-row">
                <span className="label">من:</span>
                {isEditing && day.is_open ? (
                  <input
                    type="time"
                    value={day.start_time || ''}
                    onChange={(e) => handleTimeChange(day.day_of_week, 'start_time', e.target.value)}
                    className="time-input"
                  />
                ) : (
                  <span className="value">{day.start_time || '—'}</span>
                )}
              </div>

              <div className="detail-row">
                <span className="label">إلى:</span>
                {isEditing && day.is_open ? (
                  <input
                    type="time"
                    value={day.end_time || ''}
                    onChange={(e) => handleTimeChange(day.day_of_week, 'end_time', e.target.value)}
                    className="time-input"
                  />
                ) : (
                  <span className="value">{day.end_time || '—'}</span>
                )}
              </div>

              <div className="detail-row">
                <span className="label">مدة الكشف:</span>
                {isEditing && day.is_open ? (
                  <input
                    type="number"
                    min="5"
                    max="60"
                    step="5"
                    value={day.slot_duration_minutes}
                    onChange={(e) => handleDurationChange(day.day_of_week, e.target.value)}
                    className="duration-input"
                  />
                ) : (
                  <span className="value">{day.slot_duration_minutes} دقيقة</span>
                )}
              </div>

              <div className="detail-row">
                <span className="label">استراحة من:</span>
                {isEditing && day.is_open ? (
                  <input
                    type="time"
                    value={day.break_start || ''}
                    onChange={(e) => handleTimeChange(day.day_of_week, 'break_start', e.target.value)}
                    className="time-input"
                  />
                ) : (
                  <span className="value">{day.break_start || '—'}</span>
                )}
              </div>

              <div className="detail-row">
                <span className="label">استراحة إلى:</span>
                {isEditing && day.is_open ? (
                  <input
                    type="time"
                    value={day.break_end || ''}
                    onChange={(e) => handleTimeChange(day.day_of_week, 'break_end', e.target.value)}
                    className="time-input"
                  />
                ) : (
                  <span className="value">{day.break_end || '—'}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
