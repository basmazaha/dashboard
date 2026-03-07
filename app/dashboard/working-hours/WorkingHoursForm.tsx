'use client';

import { useState } from 'react';
import { upsertWorkingHours } from './actions';

const DAY_NAMES = [
  'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء',
  'الخميس', 'الجمعة', 'السبت'
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
  const [hours, setHours] = useState(initialHours);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggleOpen = (day: number) => {
    setHours(prev => prev.map(h =>
      h.day_of_week === day ? { ...h, is_open: !h.is_open } : h
    ));
  };

  const handleTimeChange = (day: number, field: keyof WorkingHour, value: string) => {
    setHours(prev => prev.map(h =>
      h.day_of_week === day ? { ...h, [field]: value || null } : h
    ));
  };

  const handleDurationChange = (day: number, value: string) => {
    const num = parseInt(value, 10);
    setHours(prev => prev.map(h =>
      h.day_of_week === day ? { ...h, slot_duration_minutes: isNaN(num) ? 15 : num } : h
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const result = await upsertWorkingHours(hours);

    if (result.success) {
      setMessage({ type: 'success', text: 'تم حفظ ساعات العمل بنجاح' });
    } else {
      setMessage({ type: 'error', text: result.error || 'حدث خطأ' });
    }

    setSaving(false);
  };

  return (
    <section className="working-hours-section">
      <h3>ساعات العمل الأسبوعية</h3>

      <div className="hours-grid">
        {hours.map((h) => (
          <div key={h.day_of_week} className="day-card">
            <div className="day-header">
              <strong>{DAY_NAMES[h.day_of_week]}</strong>
              <label>
                <input
                  type="checkbox"
                  checked={h.is_open}
                  onChange={() => handleToggleOpen(h.day_of_week)}
                />
                مفتوح
              </label>
            </div>

            {h.is_open && (
              <div className="day-times">
                <div>
                  <label>من</label>
                  <input
                    type="time"
                    value={h.start_time || ''}
                    onChange={e => handleTimeChange(h.day_of_week, 'start_time', e.target.value)}
                  />
                </div>

                <div>
                  <label>إلى</label>
                  <input
                    type="time"
                    value={h.end_time || ''}
                    onChange={e => handleTimeChange(h.day_of_week, 'end_time', e.target.value)}
                  />
                </div>

                <div>
                  <label>مدة الكشف (دقيقة)</label>
                  <input
                    type="number"
                    min="5"
                    max="60"
                    step="5"
                    value={h.slot_duration_minutes}
                    onChange={e => handleDurationChange(h.day_of_week, e.target.value)}
                  />
                </div>

                <div>
                  <label>استراحة من</label>
                  <input
                    type="time"
                    value={h.break_start || ''}
                    onChange={e => handleTimeChange(h.day_of_week, 'break_start', e.target.value)}
                  />
                </div>

                <div>
                  <label>استراحة إلى</label>
                  <input
                    type="time"
                    value={h.break_end || ''}
                    onChange={e => handleTimeChange(h.day_of_week, 'break_end', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="actions">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`save-btn ${saving ? 'saving' : ''}`}
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      {message && (
        <p className={`message ${message.type}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
