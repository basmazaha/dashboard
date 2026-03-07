'use client';

import { useState, useTransition, useMemo } from 'react';
import { updateAppointment, fetchAppointments } from './actions';

// تعريف النوع هنا أيضًا للـ client component
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

export default function AppointmentsTable({
  initialAppointments,
  initialOffDays,
  initialWorkingHours,
}: {
  initialAppointments: Appointment[];
  initialOffDays: string[];
  initialWorkingHours: WorkingHour[];
}) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const offDaysSet = useMemo(() => new Set(initialOffDays), [initialOffDays]);

  const workingHoursByDay = useMemo(() => {
    const map: Record<number, WorkingHour> = {};
    initialWorkingHours.forEach(wh => {
      map[wh.day_of_week] = wh;
    });
    return map;
  }, [initialWorkingHours]);

  const availableDates = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoDate = d.toISOString().split('T')[0];

      if (offDaysSet.has(isoDate)) continue;

      const dayOfWeek = d.getDay();
      const wh = workingHoursByDay[dayOfWeek];

      if (wh?.is_open && wh.start_time && wh.end_time) {
        const formatted = d.toLocaleDateString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        dates.push(`${isoDate}|${formatted}`);
      }
    }
    return dates;
  }, [offDaysSet, workingHoursByDay]);

  const getAvailableTimesForDate = (selectedDate: string | null) => {
    if (!selectedDate) return [];

    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay();

    const wh = workingHoursByDay[dayOfWeek];
    if (!wh || !wh.is_open || !wh.start_time || !wh.end_time) {
      return [];
    }

    const start = new Date(`2000-01-01T${wh.start_time}`);
    const end = new Date(`2000-01-01T${wh.end_time}`);

    const slotDuration = wh.slot_duration_minutes ?? 15;
    const slotMs = slotDuration * 60 * 1000;

    let breakStartMs = Infinity;
    let breakEndMs = -Infinity;
    if (wh.break_start && wh.break_end) {
      breakStartMs = new Date(`2000-01-01T${wh.break_start}`).getTime();
      breakEndMs = new Date(`2000-01-01T${wh.break_end}`).getTime();
    }

    const times: string[] = [];

    for (
      let current = start.getTime();
      current < end.getTime();
      current += slotMs
    ) {
      const slotStart = current;
      const slotEnd = current + slotMs;

      if (slotStart < breakEndMs && slotEnd > breakStartMs) {
        continue;
      }

      const timeDate = new Date(slotStart);
      const isoTime = timeDate.toTimeString().slice(0, 5);

      const isBooked = appointments.some(a =>
        a.appointment_date === selectedDate &&
        a.appointment_time === isoTime &&
        a.status !== 'cancelled' &&
        a.id !== editingId
      );

      if (!isBooked) {
        const formatted = timeDate.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
          .replace('ص', 'صباحاً')
          .replace('م', 'مساءً');

        times.push(`${isoTime}|${formatted}`);
      }
    }

    return times;
  };

  const toggleEdit = (id: string) => {
    setEditingId(editingId === id ? null : id);
  };

  const getStatusText = (status: string | null) => {
    const map: Record<string, string> = {
      pending: 'معلق',
      confirmed: 'مؤكد',
      cancelled: 'ملغي',
      rescheduled: 'معاد جدولته',
      completed: 'مكتمل',
      absent: 'متغيب',
    };
    return map[status ?? 'confirmed'] ?? 'مؤكد';
  };

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const appointmentId = formData.get('appointment_id') as string;
      const newStatus = formData.get('status') as string;
      const newDate = formData.get('date') as string | null;
      const newTime = formData.get('time') as string | null;

      // Optimistic update
      setAppointments(prev =>
        prev.map(appt =>
          appt.id === appointmentId
            ? {
                ...appt,
                status: newStatus,
                appointment_date: newStatus === 'cancelled' ? null : (newDate || appt.appointment_date),
                appointment_time: newStatus === 'cancelled' ? null : (newTime || appt.appointment_time),
              }
            : appt
        )
      );

      const result = await updateAppointment(formData);

      if ('success' in result) {
        // إعادة جلب البيانات من السيرفر
        const fetchResult = await fetchAppointments();

        if ('appointments' in fetchResult) {
          setAppointments(fetchResult.appointments ?? []);
        } else {
          console.error('فشل في إعادة جلب المواعيد بعد التحديث');
        }
      } else {
        alert('حدث خطأ أثناء الحفظ: ' + (result.error || 'غير معروف'));
        window.location.reload();
      }

      setEditingId(null);
    });
  };

  return (
    <>
      {appointments.length > 0 ? (
        <div className="appointments-table-container">
          <div className="overflow-x-auto">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>التليفون</th>
                  <th>التاريخ</th>
                  <th>الوقت</th>
                  <th>السبب</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => {
                  const isEditing = editingId === appt.id;
                  const formId = `form-${appt.id}`;
                  const availTimes = isEditing ? getAvailableTimesForDate(appt.appointment_date) : [];

                  return (
                    <tr key={appt.id} className={isEditing ? 'editing-row' : ''}>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            name="full_name"
                            form={formId}
                            defaultValue={appt.full_name || ''}
                            placeholder="الاسم الكامل"
                          />
                        ) : (
                          <span className="readable-cell">{appt.full_name || '—'}</span>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            type="tel"
                            name="phone"
                            form={formId}
                            defaultValue={appt.phone || ''}
                            placeholder="01xxxxxxxxx"
                          />
                        ) : (
                          <span className="readable-cell">{appt.phone || '—'}</span>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <select
                            name="date"
                            form={formId}
                            defaultValue={appt.appointment_date ?? ''}
                          >
                            <option value="">اختر تاريخاً</option>
                            {availableDates.map(d => {
                              const [iso, label] = d.split('|');
                              return <option key={iso} value={iso}>{label}</option>;
                            })}
                          </select>
                        ) : (
                          <span className="readable-cell">
                            {appt.appointment_date
                              ? new Date(appt.appointment_date).toLocaleDateString('ar-EG', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })
                              : '—'}
                          </span>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <select
                            name="time"
                            form={formId}
                            defaultValue={appt.appointment_time ?? ''}
                          >
                            <option value="">اختر وقتاً</option>
                            {availTimes.map(t => {
                              const [iso, label] = t.split('|');
                              return <option key={iso} value={iso}>{label}</option>;
                            })}
                          </select>
                        ) : (
                          <span className="readable-cell">
                            {appt.appointment_time
                              ? new Date(`2000-01-01T${appt.appointment_time}`).toLocaleTimeString('ar-EG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                }).replace('ص', 'صباحاً').replace('م', 'مساءً')
                              : '—'}
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="readable-cell">{appt.reason || '—'}</span>
                      </td>

                      <td>
                        {isEditing ? (
                          <select
                            name="status"
                            form={formId}
                            defaultValue={appt.status || 'confirmed'}
                            className={`status-${appt.status || 'confirmed'}`}
                          >
                            <option value="pending">معلق</option>
                            <option value="confirmed">مؤكد</option>
                            <option value="cancelled">ملغي</option>
                            <option value="rescheduled">معاد جدولته</option>
                            <option value="completed">مكتمل</option>
                            <option value="absent">متغيب</option>
                          </select>
                        ) : (
                          <span className={`status-badge status-${appt.status || 'confirmed'}`}>
                            {getStatusText(appt.status)}
                          </span>
                        )}
                      </td>

                      <td className="actions-cell">
                        {isEditing ? (
                          <div className="edit-actions">
                            <button
                              type="submit"
                              form={formId}
                              className="save-btn"
                              disabled={isPending}
                            >
                              {isPending ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="cancel-btn"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleEdit(appt.id)}
                            className="edit-btn"
                          >
                            تعديل
                          </button>
                        )}

                        <form id={formId} action={handleSubmit} className="hidden">
                          <input type="hidden" name="appointment_id" value={appt.id} />
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="no-appointments">
          لا توجد مواعيد مسجلة حاليًا
        </div>
      )}
    </>
  );
}
