// app/dashboard/working-hours/WorkingHoursForm.tsx
'use client';

import { useState } from 'react';
import { upsertWorkingHours } from './actions';
import './working-hours.css';

const DAY_NAMES = [
  'السبت',    // 6
  'الأحد',    // 0
  'الإثنين',  // 1
  'الثلاثاء', // 2
  'الأربعاء', // 3
  'الخميس',   // 4
  'الجمعة',   // 5
];

type WorkingHour = {
  day_of_week: number;
  is_open: boolean;
  start_time: string | null;
  end_time: string | null;
  slot_duration_minutes: number | null;
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
          ? { ...h, slot_duration_minutes: isNaN(num) ? null : num }
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
    setIsEditing(!isEditing);
    setMessage(null);
  };

  return (
    <section className="working-hours-section">
      <div className="section-header">
        <h2 className="section-title">ساعات العمل الأسبوعية</h2>
        <div className="header-buttons">
          {isEditing ? (
            <>
              <button
                onClick={toggleEdit}
                className="btn btn-cancel"
                disabled={saving}
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="btn btn-save"
                disabled={saving}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </>
          ) : (
            <button
              onClick={toggleEdit}
              className="btn btn-edit"
            >
              تعديل
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className={`message ${message.type}`}>{message.text}</p>
      )}

      <div className="table-container">
        <table className="working-hours-table">
          <thead>
            <tr>
              <th>يوم الأسبوع</th>
              <th>مفتوح</th>
              <th>وقت البداية</th>
              <th>وقت النهاية</th>
              <th>مدة الفتحة (دقائق)</th>
              <th>بداية الاستراحة</th>
              <th>نهاية الاستراحة</th>
            </tr>
          </thead>
          <tbody>
            {hours.sort((a, b) => a.day_of_week - b.day_of_week).map((day) => (
              <tr key={day.day_of_week}>
                <td>{DAY_NAMES[day.day_of_week]}</td>
                <td>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={day.is_open}
                      onChange={() => handleToggleOpen(day.day_of_week)}
                    />
                  ) : (
                    day.is_open ? 'نعم' : 'لا'
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="time"
                      value={day.start_time || ''}
                      onChange={(e) => handleTimeChange(day.day_of_week, 'start_time', e.target.value)}
                    />
                  ) : (
                    day.start_time || '—'
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="time"
                      value={day.end_time || ''}
                      onChange={(e) => handleTimeChange(day.day_of_week, 'end_time', e.target.value)}
                    />
                  ) : (
                    day.end_time || '—'
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      value={day.slot_duration_minutes || ''}
                      onChange={(e) => handleDurationChange(day.day_of_week, e.target.value)}
                    />
                  ) : (
                    day.slot_duration_minutes || '—'
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="time"
                      value={day.break_start || ''}
                      onChange={(e) => handleTimeChange(day.day_of_week, 'break_start', e.target.value)}
                    />
                  ) : (
                    day.break_start || '—'
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="time"
                      value={day.break_end || ''}
                      onChange={(e) => handleTimeChange(day.day_of_week, 'break_end', e.target.value)}
                    />
                  ) : (
                    day.break_end || '—'
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
