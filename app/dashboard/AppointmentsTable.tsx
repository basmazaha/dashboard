// app/dashboard/AppointmentsTable.tsx
'use client';

import { useState, useMemo } from 'react';
import { updateAppointment, insertAppointment, fetchAppointments } from './actions';

type Appointment = {
  id: string;
  full_name: string | null;
  date_time: string | null; // ISO string in UTC
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
    initialWorkingHours.forEach(wh => {
      map[wh.day_of_week] = wh;
    });
    return map;
  }, [initialWorkingHours]);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: timezone,
      }).format(new Date(iso));
    } catch {
      return iso.split('T')[0] || '—';
    }
  };

  const formatTime = (input: string | null) => {
    if (!input) return '—';

    let h = 0;
    let m = 0;

    if (input.includes('T')) {
      const time = input.split('T')[1];
      if (time) {
        h = parseInt(time.substring(0, 2), 10);
        m = parseInt(time.substring(3, 5), 10);
      }
    } else if (input.includes(':')) {
      const parts = input.split(':');
      h = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
    }

    if (isNaN(h) || isNaN(m)) return '—';

    const hour12 = h % 12 || 12;
    const period = h < 12 ? 'صباحاً' : 'مساءً';
    const minStr = m < 10 ? '0' + m : m;

    return hour12 + ':' + minStr + ' ' + period;
  };

  const extractDateForForm = (iso: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const extractTimeForForm = (iso: string | null) => {
    if (!iso) return '';
    try {
      const date = new Date(iso);
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      return h + ':' + m;
    } catch {
      return '';
    }
  };

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      if (!a.date_time && !b.date_time) return 0;
      if (!a.date_time) return 1;
      if (!b.date_time) return -1;

      const dtA = new Date(a.date_time);
      const dtB = new Date(b.date_time);

      if (isNaN(dtA.getTime()) && isNaN(dtB.getTime())) return 0;
      if (isNaN(dtA.getTime())) return 1;
      if (isNaN(dtB.getTime())) return -1;

      return dtA.getTime() - dtB.getTime();
    });
  }, [appointments]);

  const availableDates = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();

    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoDate = d.toISOString().split('T')[0];

      if (offDaysSet.has(isoDate)) continue;

      const dayOfWeek = d.getDay();
      const wh = workingHoursByDay[dayOfWeek];

      if (wh?.is_open && wh.start_time && wh.end_time) {
        const formatted = formatDate(isoDate);
        dates.push(isoDate + '|' + formatted);
      }
    }
    return dates;
  }, [offDaysSet, workingHoursByDay, timezone]);

  const getAvailableTimesForDate = (selectedDate: string | null) => {
    if (!selectedDate) return [];

    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay();

    const wh = workingHoursByDay[dayOfWeek];
    if (!wh || !wh.is_open || !wh.start_time || !wh.end_time) return [];

    const start = new Date(`1970-01-01T${wh.start_time}`);
    const end = new Date(`1970-01-01T${wh.end_time}`);

    const slotDuration = wh.slot_duration_minutes ?? 15;
    const slotMs = slotDuration * 60 * 1000;

    let breakStartMs = Infinity;
    let breakEndMs = -Infinity;
    if (wh.break_start && wh.break_end) {
      breakStartMs = new Date(`1970-01-01T${wh.break_start}`).getTime();
      breakEndMs = new Date(`1970-01-01T${wh.break_end}`).getTime();
    }

    const times: string[] = [];

    for (let current = start.getTime(); current < end.getTime(); current += slotMs) {
      const slotStart = current;
      const slotEnd = current + slotMs;

      if (slotStart < breakEndMs && slotEnd > breakStartMs) continue;

      const timeDate = new Date(slotStart);
      const isoTime = timeDate.toTimeString().slice(0, 5); // HH:mm

      const localIso = `\( {selectedDate}T \){isoTime}:00`;
      const localDate = new Date(localIso);
      const utcIso = localDate.toISOString();

      const isBooked = appointments.some(a =>
        a.date_time === utcIso &&
        a.status !== 'cancelled' &&
        a.id !== editingId
      );

      if (!isBooked) {
        const formatted = formatTime(isoTime);
        times.push(isoTime + '|' + formatted);
      }
    }

    return times;
  };

  const toggleEdit = (id: string, initialValues: Appointment) => {
    if (editingId === id) {
      setEditingId(null);
      setFormValues({});
      setFormErrors({});
    } else {
      setEditingId(id);
      setFormValues({
        full_name: initialValues.full_name || '',
        phone: initialValues.phone || '',
        date: extractDateForForm(initialValues.date_time) || '',
        time: extractTimeForForm(initialValues.date_time) || '',
        status: initialValues.status || 'confirmed',
      });
      setFormErrors({});
    }
  };

  const toggleAdd = () => {
    if (isAdding) {
      setIsAdding(false);
      setFormValues({});
      setFormErrors({});
    } else {
      setIsAdding(true);
      setFormValues({
        full_name: '',
        phone: '',
        date: '',
        time: '',
        status: 'confirmed',
        reason: '',
      });
      setFormErrors({});
    }
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

  const handleUpdate = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors({});

    const appointmentId = formData.get('appointment_id') as string;
    const originalAppt = appointments.find(a => a.id === appointmentId);

    const newDate = formData.get('date') as string | null;
    const newTime = formData.get('time') as string | null;
    const newDateTime = newDate && newTime ? `\( {newDate}T \){newTime}:00Z` : null;

    setAppointments(prev =>
      prev.map(appt =>
        appt.id === appointmentId
          ? {
              ...appt,
              full_name: formData.get('full_name') as string | null,
              phone: formData.get('phone') as string | null,
              date_time: newDateTime,
              status: formData.get('status') as string | null,
            }
          : appt
      )
    );

    const result = await updateAppointment(formData);

    if ('errors' in result) {
      setFormErrors(result.errors as Record<string, string>);
      if (originalAppt) {
        setAppointments(prev => prev.map(a => (a.id === appointmentId ? originalAppt : a)));
      }
    } else if ('success' in result) {
      const fetchResult = await fetchAppointments();
      if ('appointments' in fetchResult) {
        setAppointments(fetchResult.appointments ?? []);
      }
      setFormErrors({});
      setEditingId(null);
      setFormValues({});
    } else {
      alert('حدث خطأ أثناء الحفظ: ' + (result.error || 'غير معروف'));
      if (originalAppt) {
        setAppointments(prev => prev.map(a => (a.id === appointmentId ? originalAppt : a)));
      }
    }

    setIsSubmitting(false);
  };

  const handleInsert = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors({});

    const tempId = 'temp-' + Date.now().toString();

    const newDate = formData.get('date') as string | null;
    const newTime = formData.get('time') as string | null;
    const newDateTime = newDate && newTime ? `\( {newDate}T \){newTime}:00Z` : null;

    const optimisticAppt: Appointment = {
      id: tempId,
      full_name: formData.get('full_name') as string | null,
      phone: formData.get('phone') as string | null,
      date_time: newDateTime,
      reason: formData.get('reason') as string | null,
      status: formData.get('status') as string | null ?? 'confirmed',
    };

    setAppointments(prev => [optimisticAppt, ...prev]);

    const result = await insertAppointment(formData);

    if ('errors' in result) {
      setFormErrors(result.errors as Record<string, string>);
      setAppointments(prev => prev.filter(a => a.id !== tempId));
    } else if ('success' in result) {
      const fetchResult = await fetchAppointments();
      if ('appointments' in fetchResult) {
        setAppointments(fetchResult.appointments ?? []);
      }
      setFormErrors({});
      setIsAdding(false);
      setFormValues({});
    } else {
      alert('حدث خطأ أثناء الإضافة: ' + (result.error || 'غير معروف'));
      setAppointments(prev => prev.filter(a => a.id !== tempId));
    }

    setIsSubmitting(false);
  };

  return (
    <>
      <div className="appointments__actions">
        <button
          type="button"
          onClick={toggleAdd}
          className={`btn btn--${isAdding ? 'danger' : 'success'}`}
        >
          {isAdding ? 'إلغاء الإضافة' : '+ إضافة موعد جديد'}
        </button>
      </div>

      {isAdding && (
        <div className="appointment-form appointment-form--new">
          <h3 className="appointment-form__title">إضافة موعد جديد</h3>

          <form action={handleInsert} id="add-appointment-form">
            <div className="form-grid">
              <div className="form-field">
                <label className="form-label">الاسم الكامل</label>
                <input
                  type="text"
                  name="full_name"
                  value={formValues.full_name || ''}
                  onChange={e => {
                    setFormValues({ ...formValues, full_name: e.target.value });
                    setFormErrors(prev => ({ ...prev, full_name: '' }));
                  }}
                  className={`form-input ${formErrors.full_name ? 'form-input--error' : ''}`}
                  placeholder="الاسم الكامل"
                />
                {formErrors.full_name && <p className="form-error">{formErrors.full_name}</p>}
              </div>

              <div className="form-field">
                <label className="form-label">رقم التليفون</label>
                <input
                  type="tel"
                  name="phone"
                  value={formValues.phone || ''}
                  onChange={e => {
                    setFormValues({ ...formValues, phone: e.target.value });
                    setFormErrors(prev => ({ ...prev, phone: '' }));
                  }}
                  className={`form-input ${formErrors.phone ? 'form-input--error' : ''}`}
                  placeholder="01xxxxxxxxx"
                />
                {formErrors.phone && <p className="form-error">{formErrors.phone}</p>}
              </div>

              <div className="form-field">
                <label className="form-label">التاريخ</label>
                <select
                  name="date"
                  value={formValues.date || ''}
                  onChange={e => setFormValues({ ...formValues, date: e.target.value, time: '' })}
                  className={`form-select ${formErrors.date ? 'form-select--error' : ''}`}
                >
                  <option value="">اختر التاريخ</option>
                  {availableDates.map(d => {
                    const [iso, label] = d.split('|');
                    return <option key={iso} value={iso}>{label}</option>;
                  })}
                </select>
                {formErrors.date && <p className="form-error">{formErrors.date}</p>}
              </div>

              <div className="form-field">
                <label className="form-label">الوقت</label>
                <select
                  name="time"
                  value={formValues.time || ''}
                  onChange={e => setFormValues({ ...formValues, time: e.target.value })}
                  className={`form-select ${formErrors.time ? 'form-select--error' : ''}`}
                  disabled={!formValues.date}
                >
                  <option value="">اختر الوقت</option>
                  {getAvailableTimesForDate(formValues.date).map(t => {
                    const [iso, label] = t.split('|');
                    return <option key={iso} value={iso}>{label}</option>;
                  })}
                </select>
                {formErrors.time && <p className="form-error">{formErrors.time}</p>}
              </div>

              <div className="form-field">
                <label className="form-label">السبب (اختياري)</label>
                <input
                  type="text"
                  name="reason"
                  value={formValues.reason || ''}
                  onChange={e => setFormValues({ ...formValues, reason: e.target.value })}
                  className="form-input"
                  placeholder="سبب الحجز"
                />
              </div>

              <div className="form-field">
                <label className="form-label">الحالة</label>
                <select
                  name="status"
                  value={formValues.status || 'confirmed'}
                  onChange={e => setFormValues({ ...formValues, status: e.target.value })}
                  className={`form-select form-select--status-${formValues.status || 'confirmed'}`}
                >
                  <option value="pending">معلق</option>
                  <option value="confirmed">مؤكد</option>
                  <option value="cancelled">ملغي</option>
                  <option value="rescheduled">معاد جدولته</option>
                  <option value="completed">مكتمل</option>
                  <option value="absent">متغيب</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={toggleAdd}
                className="btn btn--secondary"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`btn btn--primary ${isSubmitting ? 'btn--disabled' : ''}`}
              >
                {isSubmitting ? 'جاري الإضافة...' : 'حفظ الموعد'}
              </button>
            </div>
          </form>
        </div>
      )}

      {sortedAppointments.length === 0 && !isAdding ? (
        <div className="no-appointments">
          لا توجد مواعيد مسجلة حاليًا (اليوم أو المستقبل)
        </div>
      ) : (
        <div className="appointments-table-wrapper">
          <div className="table-container">
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
                {sortedAppointments.map(appt => {
                  const isEditing = editingId === appt.id;
                  const formId = `form-${appt.id}`;
                  const currentDate = isEditing ? formValues.date : extractDateForForm(appt.date_time);
                  const availTimes = isEditing ? getAvailableTimesForDate(currentDate) : [];

                  return (
                    <tr key={appt.id} className={`appointment-row ${isEditing ? 'appointment-row--editing' : ''}`}>
                      <td>
                        {isEditing ? (
                          <div className="input-wrapper">
                            <input
                              type="text"
                              name="full_name"
                              form={formId}
                              value={formValues.full_name || ''}
                              onChange={e => {
                                setFormValues({ ...formValues, full_name: e.target.value });
                                setFormErrors(prev => ({ ...prev, full_name: '' }));
                              }}
                              placeholder="الاسم الكامل"
                              className={`form-input ${formErrors.full_name ? 'form-input--error' : ''}`}
                            />
                            {formErrors.full_name && (
                              <span className="form-error">{formErrors.full_name}</span>
                            )}
                          </div>
                        ) : (
                          <span className="cell-content">{appt.full_name || '—'}</span>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <div className="input-wrapper">
                            <input
                              type="tel"
                              name="phone"
                              form={formId}
                              value={formValues.phone || ''}
                              onChange={e => {
                                setFormValues({ ...formValues, phone: e.target.value });
                                setFormErrors(prev => ({ ...prev, phone: '' }));
                              }}
                              placeholder="01xxxxxxxxx أو +201..."
                              className={`form-input ${formErrors.phone ? 'form-input--error' : ''}`}
                            />
                            {formErrors.phone && (
                              <span className="form-error">{formErrors.phone}</span>
                            )}
                          </div>
                        ) : (
                          <span className="cell-content">{appt.phone || '—'}</span>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <select
                            name="date"
                            form={formId}
                            value={formValues.date || ''}
                            onChange={e => setFormValues({ ...formValues, date: e.target.value, time: '' })}
                            className="form-select"
                          >
                            <option value="">اختر تاريخاً</option>
                            {availableDates.map(d => {
                              const [iso, label] = d.split('|');
                              return <option key={iso} value={iso}>{label}</option>;
                            })}
                          </select>
                        ) : (
                          <span className="cell-content">
                            {formatDate(appt.date_time)}
                          </span>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <select
                            name="time"
                            form={formId}
                            value={formValues.time || ''}
                            onChange={e => setFormValues({ ...formValues, time: e.target.value })}
                            className="form-select"
                          >
                            <option value="">اختر وقتاً</option>
                            {availTimes.map(t => {
                              const [iso, label] = t.split('|');
                              return <option key={iso} value={iso}>{label}</option>;
                            })}
                          </select>
                        ) : (
                          <span className="cell-content">
                            {formatTime(appt.date_time)}
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="cell-content">{appt.reason || '—'}</span>
                      </td>

                      <td>
                        {isEditing ? (
                          <select
                            name="status"
                            form={formId}
                            value={formValues.status || 'confirmed'}
                            onChange={e => setFormValues({ ...formValues, status: e.target.value })}
                            className={`form-select form-select--status-${formValues.status || 'confirmed'}`}
                          >
                            <option value="pending">معلق</option>
                            <option value="confirmed">مؤكد</option>
                            <option value="cancelled">ملغي</option>
                            <option value="rescheduled">معاد جدولته</option>
                            <option value="completed">مكتمل</option>
                            <option value="absent">متغيب</option>
                          </select>
                        ) : (
                          <span className={`status-badge status-badge--${appt.status || 'confirmed'}`}>
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
                              disabled={isSubmitting}
                              className={`btn btn--save ${isSubmitting ? 'btn--disabled' : ''}`}
                            >
                              {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleEdit(appt.id, appt)}
                              className="btn btn--cancel"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleEdit(appt.id, appt)}
                            className="btn btn--edit"
                          >
                            تعديل
                          </button>
                        )}

                        <form id={formId} action={handleUpdate} className="form--hidden">
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
      )}
    </>
  );
}
