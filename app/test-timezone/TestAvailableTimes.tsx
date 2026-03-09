// app/test-timezone/TestAvailableTimes.tsx
'use client';

import { useMemo } from 'react';

interface Props {
  timezone: string;
  date: string;
}

export default function TestAvailableTimes({ timezone, date }: Props) {
  const slots = useMemo(() => {
    const start = new Date(`1970-01-01T09:00:00`);
    const end = new Date(`1970-01-01T21:00:00`);
    const slotMs = 30 * 60 * 1000;
    const breakStart = new Date(`1970-01-01T14:00:00`).getTime();
    const breakEnd = new Date(`1970-01-01T15:00:00`).getTime();

    const result: string[] = [];

    for (let t = start.getTime(); t < end.getTime(); t += slotMs) {
      if (t >= breakStart && t < breakEnd) continue;

      const slotDate = new Date(t);
      const timeStr = slotDate.toTimeString().slice(0, 5);

      const formatted = new Intl.DateTimeFormat('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone,
      })
        .format(slotDate)
        .replace('ص', 'صباحاً')
        .replace('م', 'مساءً');

      result.push(`${timeStr} → ${formatted}`);
    }

    return result;
  }, [timezone]);

  return (
    <div>
      <h3>الأوقات المتاحة ليوم {date} (timezone: {timezone})</h3>
      <ul style={{ columns: '3', listStyle: 'none', padding: 0, fontSize: '0.95rem' }}>
        {slots.map((slot, i) => (
          <li key={i} style={{ marginBottom: '0.4rem' }}>
            {slot}
          </li>
        ))}
      </ul>
    </div>
  );
}
