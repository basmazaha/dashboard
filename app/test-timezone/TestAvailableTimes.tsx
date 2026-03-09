// app/test-timezone/TestAvailableTimes.tsx
'use client';

import { useMemo } from 'react';

interface TestAvailableTimesProps {
  timezone: string;
  date: string;
}

export default function TestAvailableTimes({ timezone, date }: TestAvailableTimesProps) {
  const slots = useMemo(() => {
    const startHour = 9;
    const endHour = 21;
    const slotMinutes = 30;

    const result: string[] = [];

    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slotMinutes) {
        const hourStr = h.toString().padStart(2, '0');
        const minStr = m.toString().padStart(2, '0');
        const timeStr = `\( {hourStr}: \){minStr}`;

        const fakeDate = new Date(`1970-01-01T${timeStr}:00`);

        const formatted = new Intl.DateTimeFormat('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: timezone,
        })
          .format(fakeDate)
          .replace('ص', 'صباحاً')
          .replace('م', 'مساءً');

        result.push(`${timeStr} → ${formatted}`);
      }
    }

    return result;
  }, [timezone]);

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>
        عرض توضيحي client-side للأوقات (timezone: {timezone})
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '10px',
        }}
      >
        {slots.map((slot, i) => (
          <div
            key={i}
            style={{
              padding: '10px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              fontSize: '0.95rem',
              textAlign: 'center',
            }}
          >
            {slot}
          </div>
        ))}
      </div>
    </div>
  );
}
