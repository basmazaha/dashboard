// app/dashboard/today-appointments/TodayAppointmentsTable.tsx

'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/timezone';

type Appointment = {
  id: string;
  full_name: string | null;
  date_time: string | null;
  phone: string | null;
  reason: string | null;
  status: string | null;
};

interface Props {
  initialAppointments: Appointment[];
  timezone: string;
}

export default function TodayAppointmentsTable({
  initialAppointments,
  timezone,
}: Props) {

  const tz = timezone || DEFAULT_TIMEZONE;

  const [appointments] = useState(initialAppointments);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';

    const zoned = toZonedTime(iso, tz);

    return format(zoned, 'EEEE d MMMM yyyy', { locale: ar });
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';

    const zoned = toZonedTime(iso, tz);

    return format(zoned, 'hh:mm a')
      .replace('AM', 'صباحاً')
      .replace('PM', 'مساءً');
  };

  const sorted = useMemo(() => {
    return [...appointments].sort((a, b) => {
      if (!a.date_time) return 1;
      if (!b.date_time) return -1;

      return (
        toZonedTime(a.date_time, tz).getTime() -
        toZonedTime(b.date_time, tz).getTime()
      );
    });
  }, [appointments, tz]);

  if (!sorted.length) {
    return (
      <div className="no-appointments">
        لا توجد مواعيد اليوم
      </div>
    );
  }

  return (
    <div className="appointments-table-wrapper">
      <table className="appointments-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>التليفون</th>
            <th>التاريخ</th>
            <th>الوقت</th>
            <th>السبب</th>
            <th>الحالة</th>
          </tr>
        </thead>

        <tbody>
          {sorted.map((appt) => (
            <tr key={appt.id}>
              <td>{appt.full_name || '—'}</td>
              <td>{appt.phone || '—'}</td>
              <td>{formatDate(appt.date_time)}</td>
              <td>{formatTime(appt.date_time)}</td>
              <td>{appt.reason || '—'}</td>
              <td>{appt.status || 'confirmed'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
