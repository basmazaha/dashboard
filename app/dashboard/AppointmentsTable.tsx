'use client';

import { useState, useMemo } from 'react';
import { updateAppointment, insertAppointment, fetchAppointments, fetchOffDays, fetchWorkingHours } from './actions';

// ────────────────────────────────────────────────
// تعريف الأنواع داخل الملف نفسه (بدون استيراد خارجي)
// ────────────────────────────────────────────────

type Appointment = {
  id: string;
  full_name: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  phone: string | null;
  reason: string | null;
  status: string | null;
};

interface WorkingHour {
  day_of_week: number;
  is_open: boolean;
  start_time: string | null;
  end_time: string | null;
  slot_duration_minutes: number | null;
  break_start: string | null;
  break_end: string | null;
}

// ────────────────────────────────────────────────
// دوال مساعدة
// ────────────────────────────────────────────────

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

function getStatusText(status: string | null): string {
  switch (status) {
    case 'pending': return 'في الانتظار';
    case 'confirmed': return 'مؤكد';
    case 'cancelled': return 'ملغى';
    default: return 'غير معروف';
  }
}

// ────────────────────────────────────────────────
// الكومبوننت الرئيسي
// ────────────────────────────────────────────────

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
  const [offDays, setOffDays] = useState<string[]>(initialOffDays);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>(initialWorkingHours);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalDate, setOriginalDate] = useState<string>('');
  const [formValues, setFormValues] = useState({
    full_name: '',
    phone: '',
    date: '',
    time: '',
    reason: '',
    status: 'pending',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refetchAll() {
    try {
      const [newAppointments, newOffDays, newWorkingHours] = await Promise.all([
        fetchAppointments(),
        fetchOffDays(),
        fetchWorkingHours(),
      ]);
      setAppointments(newAppointments);
      setOffDays(newOffDays);
      setWorkingHours(newWorkingHours);
    } catch (error) {
      console.error('Error refetching data:', error);
    }
  }

  function toggleAdd() {
    const newIsAdding = !isAdding;
    setIsAdding(newIsAdding);
    setFormValues({
      full_name: '',
      phone: '',
      date: '',
      time: '',
      reason: '',
      status: 'pending',
    });
    setFormErrors({});
    if (newIsAdding) {
      refetchAll();
    }
  }

  function toggleEdit(id: string, currentAppt: Appointment) {
    const newEditingId = editingId === id ? null : id;
    setEditingId(newEditingId);
    if (newEditingId) {
      setFormValues({
        full_name: currentAppt.full_name || '',
        phone: currentAppt.phone || '',
        date: currentAppt.appointment_date || '',
        time: normalizeTime(currentAppt.appointment_time),
        reason: currentAppt.reason || '',
        status: currentAppt.status || 'pending',
      });
      setOriginalDate(currentAppt.appointment_date || '');
      setFormErrors({});
      refetchAll();
    } else {
      setFormValues({
        full_name: '',
        phone: '',
        date: '',
        time: '',
        reason: '',
        status: 'pending',
      });
      setOriginalDate('');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    if (editingId) {
      formData.append('appointment_id', editingId);
      formData.append('status', formValues.status);
      const result = await updateAppointment(formData);
      if (result.errors) {
        setFormErrors(result.errors);
      } else if (result.success) {
        await refetchAll();
        setEditingId(null);
        setFormErrors({});
      } else {
        console.error(result.error);
      }
    } else {
      formData.append('status', formValues.status);
      const result = await insertAppointment(formData);
      if (result.errors) {
        setFormErrors(result.errors);
      } else if (result.success) {
        await refetchAll();
        setIsAdding(false);
        setFormErrors({});
      } else {
        console.error(result.error);
      }
    }
    setIsSubmitting(false);
  }

  function getAvailableTimesForDate(date: string | null): string[] {
    if (!date) return [];
    const dayOfWeek = new Date(date).getDay() + 1; // Sunday = 1, Saturday = 7
    const workingHour = workingHours.find(wh => wh.day_of_week === dayOfWeek);
    if (!workingHour || !workingHour.is_open || offDays.includes(date)) return [];

    const start = new Date(`2000-01-01T${workingHour.start_time}`);
    const end = new Date(`2000-01-01T${workingHour.end_time}`);
    const breakStart = workingHour.break_start ? new Date(`2000-01-01T${workingHour.break_start}`) : null;
    const breakEnd = workingHour.break_end ? new Date(`2000-01-01T${workingHour.break_end}`) : null;
    const duration = workingHour.slot_duration_minutes || 30;

    const availableTimes: string[] = [];
    let current = start;

    while (current < end) {
      const currentTimeStr = current.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      const isInBreak =
        breakStart && breakEnd && current >= breakStart && current < breakEnd;

      if (!isInBreak) {
        availableTimes.push(currentTimeStr);
      }

      current = new Date(current.getTime() + duration * 60000);
    }

    const bookedTimes = appointments
      .filter(
        appt =>
          appt.appointment_date === date &&
          !(editingId && appt.id === editingId && date === originalDate)
      )
      .map(appt => normalizeTime(appt.appointment_time));

    return availableTimes.filter(time => !bookedTimes.includes(time));
  }

  const availableTimes = useMemo(
    () => getAvailableTimesForDate(formValues.date),
    [formValues.date, appointments, offDays, workingHours, editingId, originalDate]
  );

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="appointments-table-container">
      <button onClick={toggleAdd} className="btn btn--add">
        {isAdding ? 'إلغاء الإضافة' : '+ إضافة موعد جديد'}
      </button>

      {isAdding && (
        <form onSubmit={handleSubmit} className="add-appointment-form">
          <h3>إضافة موعد جديد</h3>

          <input
            type="text"
            name="full_name"
            value={formValues.full_name}
            onChange={e => {
              setFormValues({ ...formValues, full_name: e.target.value });
              setFormErrors(prev => ({ ...prev, full_name: '' }));
            }}
            className={`form-input ${formErrors.full_name ? 'form-input--error' : ''}`}
            placeholder="الاسم الكامل"
          />
          {formErrors.full_name && <p className="form-error">{formErrors.full_name}</p>}

          <input
            type="tel"
            name="phone"
            value={formValues.phone}
            onChange={e => {
              setFormValues({ ...formValues, phone: e.target.value });
              setFormErrors(prev => ({ ...prev, phone: '' }));
            }}
            className={`form-input ${formErrors.phone ? 'form-input--error' : ''}`}
            placeholder="01xxxxxxxxx"
          />
          {formErrors.phone && <p className="form-error">{formErrors.phone}</p>}

          <input
            type="date"
            name="date"
            value={formValues.date}
            min={minDate}
            onChange={e => {
              setFormValues({ ...formValues, date: e.target.value });
              setFormErrors(prev => ({ ...prev, date: '' }));
            }}
            className={`form-input ${formErrors.date ? 'form-input--error' : ''}`}
          />
          {formErrors.date && <p className="form-error">{formErrors.date}</p>}

          <select
            name="time"
            value={formValues.time}
            onChange={e => {
              setFormValues({ ...formValues, time: e.target.value });
              setFormErrors(prev => ({ ...prev, time: '' }));
            }}
            className={`form-input ${formErrors.time ? 'form-input--error' : ''}`}
          >
            <option value="">اختر الوقت</option>
            {availableTimes.map(time => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          {formErrors.time && <p className="form-error">{formErrors.time}</p>}

          <input
            type="text"
            name="reason"
            value={formValues.reason}
            onChange={e => setFormValues({ ...formValues, reason: e.target.value })}
            className="form-input"
            placeholder="سبب الحجز (اختياري)"
          />

          <div className="form-actions">
            <button type="button" onClick={toggleAdd} className="btn btn--cancel">
              إلغاء
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn--submit">
              {isSubmitting ? 'جاري الإضافة...' : 'حفظ الموعد'}
            </button>
          </div>
        </form>
      )}

      {appointments.length === 0 ? (
        <div className="no-appointments">لا توجد مواعيد مسجلة حاليًا</div>
      ) : (
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
            {appointments.map(appt => {
              const isEditing = editingId === appt.id;
              const availableTimesForEdit = isEditing ? getAvailableTimesForDate(formValues.date) : [];

              return (
                <tr key={appt.id}>
                  <td>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          name="full_name"
                          value={formValues.full_name}
                          onChange={e => {
                            setFormValues({ ...formValues, full_name: e.target.value });
                            setFormErrors(prev => ({ ...prev, full_name: '' }));
                          }}
                          placeholder="الاسم الكامل"
                          className={`form-input ${formErrors.full_name ? 'form-input--error' : ''}`}
                        />
                        {formErrors.full_name && <p className="form-error">{formErrors.full_name}</p>}
                      </>
                    ) : (
                      appt.full_name || '—'
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <>
                        <input
                          type="tel"
                          name="phone"
                          value={formValues.phone}
                          onChange={e => {
                            setFormValues({ ...formValues, phone: e.target.value });
                            setFormErrors(prev => ({ ...prev, phone: '' }));
                          }}
                          placeholder="01xxxxxxxxx"
                          className={`form-input ${formErrors.phone ? 'form-input--error' : ''}`}
                        />
                        {formErrors.phone && <p className="form-error">{formErrors.phone}</p>}
                      </>
                    ) : (
                      appt.phone || '—'
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <>
                        <input
                          type="date"
                          name="date"
                          value={formValues.date}
                          min={minDate}
                          onChange={e => {
                            setFormValues({ ...formValues, date: e.target.value });
                            setFormErrors(prev => ({ ...prev, date: '' }));
                          }}
                          className={`form-input ${formErrors.date ? 'form-input--error' : ''}`}
                        />
                        {formErrors.date && <p className="form-error">{formErrors.date}</p>}
                      </>
                    ) : (
                      appt.appointment_date
                        ? new Date(appt.appointment_date).toLocaleDateString('ar-EG', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : '—'
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <>
                        <select
                          name="time"
                          value={formValues.time}
                          onChange={e => {
                            setFormValues({ ...formValues, time: e.target.value });
                            setFormErrors(prev => ({ ...prev, time: '' }));
                          }}
                          className={`form-input ${formErrors.time ? 'form-input--error' : ''}`}
                        >
                          <option value="">اختر الوقت</option>
                          {availableTimesForEdit.map(time => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                        {formErrors.time && <p className="form-error">{formErrors.time}</p>}
                      </>
                    ) : (
                      appt.appointment_time
                        ? new Date(`2000-01-01T${appt.appointment_time}`).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                            .replace('ص', 'صباحًا')
                            .replace('م', 'مساءً')
                        : '—'
                    )}
                  </td>

                  <td>{appt.reason || '—'}</td>

                  <td>
                    {isEditing ? (
                      <select
                        name="status"
                        value={formValues.status}
                        onChange={e => setFormValues({ ...formValues, status: e.target.value })}
                        className="form-input"
                      >
                        <option value="pending">في الانتظار</option>
                        <option value="confirmed">مؤكد</option>
                        <option value="cancelled">ملغى</option>
                      </select>
                    ) : (
                      getStatusText(appt.status)
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <form onSubmit={handleSubmit}>
                        <button type="submit" disabled={isSubmitting} className="btn btn--submit">
                          {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEdit(appt.id, appt)}
                          className="btn btn--cancel"
                        >
                          إلغاء
                        </button>
                      </form>
                    ) : (
                      <button onClick={() => toggleEdit(appt.id, appt)} className="btn btn--edit">
                        تعديل
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
