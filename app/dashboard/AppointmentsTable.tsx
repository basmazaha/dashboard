'use client';

import { useState, useMemo } from 'react';
import { format, parse, addMinutes, isWithinInterval } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { updateAppointment, insertAppointment, fetchAppointments } from './actions';

type Appointment = {
  id: string;
  full_name: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  phone: string | null;
  reason: string | null;
  status: string | null;
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

interface AppointmentsTableProps {
  initialAppointments: Appointment[];
  initialOffDays: string[];
  initialWorkingHours: WorkingHour[];
  timezone: string;
}

function normalizeTime(time: string | null): string {
  if (!time) return '';
  return time.split(':').slice(0, 2).join(':');
}

function toFullTimeFormat(time: string | null): string {
  if (!time) return '00:00:00';
  const parts = time.split(':');
  if (parts.length === 2) {
    return `\( {parts[0].padStart(2, '0')}: \){parts[1].padStart(2, '0')}:00`;
  }
  if (parts.length === 3) return time;
  return '00:00:00';
}

export default function AppointmentsTable({
  initialAppointments,
  initialOffDays,
  initialWorkingHours,
  timezone,
}: AppointmentsTableProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const offDaysSet = useMemo(() => new Set(initialOffDays), [initialOffDays]);

  const workingHoursByDay = useMemo(() => {
    const map: Record<number, WorkingHour> = {};
    initialWorkingHours.forEach((wh) => {
      map[wh.day_of_week] = wh;
    });
    return map;
  }, [initialWorkingHours]);

  // ─── عرض التاريخ بالتوقيت المحلي للنشاط ───
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const zoned = utcToZonedTime(dateStr, timezone);
      return format(zoned, 'EEEE، d MMMM yyyy', { locale: require('date-fns/locale/ar-SA') });
    } catch {
      return dateStr;
    }
  };

  // ─── عرض الوقت بالتوقيت المحلي للنشاط ───
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '—';
    try {
      // نحول الوقت إلى تاريخ وهمي + timezone النشاط
      const zoned = utcToZonedTime(`1970-01-01T${timeStr}Z`, timezone);
      const formatted = format(zoned, 'hh:mm a', { locale: require('date-fns/locale/ar-SA') });
      return formatted.replace('ص', 'صباحاً').replace('م', 'مساءً');
    } catch {
      return normalizeTime(timeStr);
    }
  };

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      if (!a.appointment_date || !b.appointment_date) {
        return Number(!!b.appointment_date) - Number(!!a.appointment_date);
      }
      const dtA = zonedTimeToUtc(`${a.appointment_date} ${a.appointment_time || '00:00:00'}`, timezone);
      const dtB = zonedTimeToUtc(`${b.appointment_date} ${b.appointment_time || '00:00:00'}`, timezone);
      return dtA.getTime() - dtB.getTime();
    });
  }, [appointments, timezone]);

  const availableDates = useMemo(() => {
    const dates: string[] = [];
    const today = utcToZonedTime(new Date(), timezone);

    for (let i = 0; i < 30; i++) {
      const d = addMinutes(today, i * 24 * 60);
      const isoDate = format(d, 'yyyy-MM-dd');

      if (offDaysSet.has(isoDate)) continue;

      const dayOfWeek = d.getDay();
      const wh = workingHoursByDay[dayOfWeek];

      if (wh?.is_open && wh.start_time && wh.end_time) {
        const label = format(d, 'EEEE، d MMMM yyyy', { locale: require('date-fns/locale/ar-SA') });
        dates.push(`\( {isoDate}| \){label}`);
      }
    }
    return dates;
  }, [offDaysSet, workingHoursByDay, timezone]);

  const getAvailableTimesForDate = (selectedDate: string | null) => {
    if (!selectedDate) return [];

    const dateObj = parse(selectedDate, 'yyyy-MM-dd', new Date());
    const dayOfWeek = dateObj.getDay();
    const wh = workingHoursByDay[dayOfWeek];

    if (!wh || !wh.is_open || !wh.start_time || !wh.end_time) return [];

    // بداية ونهاية اليوم بالتوقيت المحلي للنشاط
    const dayStart = zonedTimeToUtc(`${selectedDate} ${wh.start_time}`, timezone);
    const dayEnd = zonedTimeToUtc(`${selectedDate} ${wh.end_time}`, timezone);

    const slotDuration = wh.slot_duration_minutes ?? 15;
    let current = dayStart;

    const times: string[] = [];

    let breakStart = Infinity;
    let breakEnd = -Infinity;
    if (wh.break_start && wh.break_end) {
      breakStart = zonedTimeToUtc(`${selectedDate} ${wh.break_start}`, timezone).getTime();
      breakEnd = zonedTimeToUtc(`${selectedDate} ${wh.break_end}`, timezone).getTime();
    }

    while (current < dayEnd) {
      const slotEnd = addMinutes(current, slotDuration);

      // تجاوز فترة الراحة
      if (slotEnd.getTime() > breakStart && current.getTime() < breakEnd) {
        current = addMinutes(current, slotDuration);
        continue;
      }

      const isoTime = format(current, 'HH:mm');

      const isBooked = appointments.some(
        (a) =>
          a.appointment_date === selectedDate &&
          normalizeTime(a.appointment_time) === isoTime &&
          a.status !== 'cancelled' &&
          a.id !== editingId
      );

      if (!isBooked) {
        const displayTime = formatTime(isoTime);
        times.push(`\( {isoTime}| \){displayTime}`);
      }

      current = slotEnd;
    }

    return times;
  };

  // باقي الكود (toggleEdit, toggleAdd, handleUpdate, handleInsert, getStatusText, JSX) 
  // يبقى كما هو تقريباً مع استبدال formatDate و formatTime في أماكن العرض

  // ... (انسخ باقي الدوال والـ return كما في الكود الأصلي الخاص بك)

  // فقط غيّر في الـ JSX كل مكان يوجد فيه:
  // new Date(...).toLocaleDateString(...)  →  formatDate(...)
  // new Date(...).toLocaleTimeString(...)  →  formatTime(...)

  // مثال في الجدول:
  // <span className="cell-content">{formatDate(appt.appointment_date)}</span>
  // <span className="cell-content">{formatTime(appt.appointment_time)}</span>

  // نفس التعديل في نموذج الإضافة والتعديل
}
