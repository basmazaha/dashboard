'use client';

import { useState } from 'react';
import { upsertWorkingHours } from './actions';
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

  const handleChange = (
    dayOfWeek: number,
    field: keyof WorkingHour,
    value: string | number | null
  ) => {
    setHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const result = await upsertWorkingHours(hours);

    if (result.success) {
      setMessage({ type: 'success', text: 'تم الحفظ بنجاح' });
      setIsEditing(false);
    } else {
      setMessage({ type: 'error', text: result.error || 'فشل الحفظ' });
    }

    setSaving(false);
  };

  return (
    <div className="working-hours-section">
      <div className="section-header">
        <h2>ساعات العمل الأسبوعية</h2>
        <div>
          {isEditing ? (
            <>
              <button className="btn btn-cancel" onClick={() => setIsEditing(false)} disabled={saving}>
                إلغاء
              </button>
              <button className="btn btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </>
          ) : (
            <button className="btn btn-edit" onClick={() => setIsEditing(true)}>
              تعديل
            </button>
          )}
        </div>
      </div>

      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>يوم الأسبوع</th>
              <th>مفتوح</th>
              <th>start_time</th>
              <th>end_time</th>
              <th>slot_duration_minutes</th>
              <th>break_start</th>
              <th>break_end</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((row) => (
              <tr key={row.day_of_week}>
                <td>{DAY_NAMES[row.day_of_week]}</td>
                <td>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={row.is_open}
                      onChange={() => handleToggleOpen(row.day_of_week)}
                    />
                  ) : row.is_open ? 'TRUE' : 'FALSE'}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="time"
                      value={row.start_time || ''}
                      onChange={(e) => handleChange(row.day_of_week, 'start_time', e.target.value)}
                    />
                  ) : row.start_time || '—'}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="time"
                      value={row.end_time || ''}
                      onChange={(e) => handleChange(row.day_of_week, 'end_time', e.target.value)}
                    />
                  ) : row.end_time || '—'}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      value={row.slot_duration_minutes ?? ''}
                      onChange={(e) =>
                        handleChange(row.day_of_week, 'slot_duration_minutes', e.target.value ? Number(e.target.value) : null)
                      }
                    />
                  ) : row.slot_duration_minutes ?? '—'}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="time"
                      value={row.break_start || ''}
                      onChange={(e) => handleChange(row.day_of_week, 'break_start', e.target.value)}
                    />
                  ) : row.break_start || '—'}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      type="time"
                      value={row.break_end || ''}
                      onChange={(e) => handleChange(row.day_of_week, 'break_end', e.target.value)}
                    />
                  ) : row.break_end || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
