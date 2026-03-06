'use client';

import { useState, useTransition, useMemo } from 'react';
import { updateAppointment } from './actions';

type Appointment = {
  id: string;
  full_name: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  phone: string | null;
  reason: string | null;
  status: string | null;
};

type OffDay = { date: string };

type WorkingHour = {
  day: string;
  start_time: string;
  end_time: string;
  interval_minutes: number;
};

export default function AppointmentsTable({
  initialAppointments,
  initialOffDays,
  initialWorkingHours,
}: {
  initialAppointments: Appointment[];
  initialOffDays: OffDay[];
  initialWorkingHours: WorkingHour[];
}) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const offDaysSet = useMemo(
    () => new Set(initialOffDays.map((od) => od.date)),
    [initialOffDays]
  );

  const workingHoursByDay = useMemo(() => {
    const map: Record<string, WorkingHour> = {};
    initialWorkingHours.forEach((wh) => {
      map[wh.day] = wh;
    });
    return map;
  }, [initialWorkingHours]);

  // التواريخ المتاحة (30 يومًا قادمة)
  const availableDates = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const iso = date.toISOString().split('T')[0];
      const dayName = date.toLocaleString('en-US', { weekday: 'long' });
      if (!offDaysSet.has(iso) && workingHoursByDay[dayName]) {
        const formatted = date.toLocaleDateString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        dates.push(`${iso}|${formatted}`);
      }
    }
    return dates;
  }, [offDaysSet, workingHoursByDay]);

  const getAvailableTimesForDate = (dateStr: string | null) => {
    if (!dateStr) return [];

    const dateObj = new Date(dateStr);
    const dayName = dateObj.toLocaleString('en-US', { weekday: 'long' });
    const wh = workingHoursByDay[dayName];

    if (!wh) return [];

    const start = new Date(`2000-01-01T${wh.start_time}`);
    const end = new Date(`2000-01-01T${wh.end_time}`);
    
    // الفاصل الزمني: نأخذ من الجدول إن وجد، وإلا 15 دقيقة
    const intervalMs = (wh.interval_minutes || 15) * 60 * 1000;

    const times: string[] = [];
    for (
      let current = start.getTime();
      current < end.getTime();
      current += intervalMs
    ) {
      const timeDate = new Date(current);
      const isoTime = timeDate.toTimeString().slice(0, 5); // HH:mm

      // هل الوقت محجوز؟
      const isBooked = appointments.some(
        (a) =>
          a.appointment_date === dateStr && a.appointment_time === isoTime
      );

      if (!isBooked) {
        const formatted = timeDate.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).replace('ص', 'صباحاً').replace('م', 'مساءً');
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
      const result = await updateAppointment(formData);
      if ('success' in result) {
        window.location.reload(); // تحديث بسيط – يمكن تحسينه لاحقاً
      } else if ('error' in result) {
        alert('خطأ: ' + result.error);
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
                  const availTimes = isEditing
                    ? getAvailableTimesForDate(appt.appointment_date)
                    : [];

                  return (
                    <tr key={appt.id} className={isEditing ? 'editing-row' : ''}>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            name="full_name"
                            form={formId}
                            defaultValue={appt.full_name || ''}
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
                          />
                        ) : (
                          <span className="readable-cell">{appt.phone || '—'}</span>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <select name="date" form={formId} defaultValue={appt.appointment_date ?? ''}>
                            <option value="">اختر تاريخاً</option>
                            {availableDates.map((d) => {
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
                          <select name="time" form={formId} defaultValue={appt.appointment_time ?? ''}>
                            <option value="">اختر وقتاً</option>
                            {availTimes.map((t) => {
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
        <div className="no-appointments">لا توجد مواعيد مسجلة حاليًا</div>
      )}
    </>
  );
}
