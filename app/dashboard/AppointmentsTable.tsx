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

function normalizeTime(time: string | null): string {
  if (!time) return '';
  return time.split(':').slice(0, 2).join(':');
}

function toFullTimeFormat(time: string | null): string {
  if (!time) return '00:00:00';
  const parts = time.split(':');
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  }
  if (parts.length === 3) return time;
  return '00:00:00';
}

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
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
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
        normalizeTime(a.appointment_time) === isoTime &&
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

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formValues.full_name?.trim()) {
      errors.full_name = 'الاسم الكامل مطلوب';
    } else if (formValues.full_name.trim().length < 3) {
      errors.full_name = 'الاسم قصير جدًا';
    }

    if (!formValues.phone?.trim()) {
      errors.phone = 'رقم التليفون مطلوب';
    } else if (!/^01[0125][0-9]{8}$/.test(formValues.phone.trim())) {
      errors.phone = 'رقم التليفون غير صالح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toggleEdit = (id: string, initialValues: Appointment) => {
    if (editingId === id) {
      setEditingId(null);
      setFormValues({});
      setFieldErrors({});
    } else {
      setEditingId(id);
      setFormValues({
        full_name: initialValues.full_name || '',
        phone: initialValues.phone || '',
        date: initialValues.appointment_date || '',
        time: normalizeTime(initialValues.appointment_time),
        status: initialValues.status || 'confirmed',
      });
      setFieldErrors({});
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

  const handleSubmit = (formData: FormData) => {
    // التحقق قبل الإرسال
    if (!validateForm()) {
      return;
    }

    startTransition(async () => {
      const appointmentId = formData.get('appointment_id') as string;
      const originalAppt = appointments.find(a => a.id === appointmentId);

      setAppointments(prev =>
        prev.map(appt =>
          appt.id === appointmentId
            ? {
                ...appt,
                full_name: formData.get('full_name') as string | null,
                phone: formData.get('phone') as string | null,
                appointment_date: formData.get('date') as string | null,
                appointment_time: formData.get('time') as string | null,
                status: formData.get('status') as string | null,
              }
            : appt
        )
      );

      const result = await updateAppointment(formData);

      if ('success' in result) {
        const fetchResult = await fetchAppointments();
        if ('appointments' in fetchResult) {
          setAppointments(fetchResult.appointments ?? []);
        }
        setFieldErrors({});
      } else {
        const serverError = result.error || 'حدث خطأ أثناء الحفظ';

        if (serverError.includes('اسم')) {
          setFieldErrors(prev => ({ ...prev, full_name: serverError }));
        } else if (serverError.includes('تليفون')) {
          setFieldErrors(prev => ({ ...prev, phone: serverError }));
        } else {
          setFieldErrors(prev => ({ ...prev, general: serverError }));
        }

        if (originalAppt) {
          setAppointments(prev => prev.map(a => a.id === appointmentId ? originalAppt : a));
        }
      }

      setEditingId(null);
      setFormValues({});
    });
  };

  const hasErrors = Object.values(fieldErrors).some(Boolean);
  const isFormValid = formValues.full_name?.trim() && formValues.phone?.trim() && !hasErrors;

  return (
    <>
      {appointments.length > 0 ? (
        <div className="appointments-table-container">
          {fieldErrors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center">
              {fieldErrors.general}
            </div>
          )}

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
                  const currentDate = isEditing ? formValues.date : appt.appointment_date;
                  const availTimes = isEditing ? getAvailableTimesForDate(currentDate) : [];

                  return (
                    <tr key={appt.id} className={isEditing ? 'editing-row' : ''}>
                      <td>
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              name="full_name"
                              form={formId}
                              value={formValues.full_name}
                              onChange={e => {
                                setFormValues({ ...formValues, full_name: e.target.value });
                                setFieldErrors(prev => ({ ...prev, full_name: undefined }));
                              }}
                              placeholder="الاسم الكامل"
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                fieldErrors.full_name ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {fieldErrors.full_name && (
                              <p className="text-xs text-red-600 mt-1">{fieldErrors.full_name}</p>
                            )}
                          </div>
                        ) : (
                          <span className="readable-cell">{appt.full_name || '—'}</span>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="tel"
                              name="phone"
                              form={formId}
                              value={formValues.phone}
                              onChange={e => {
                                setFormValues({ ...formValues, phone: e.target.value });
                                setFieldErrors(prev => ({ ...prev, phone: undefined }));
                              }}
                              placeholder="01xxxxxxxxx"
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                fieldErrors.phone ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {fieldErrors.phone && (
                              <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>
                            )}
                          </div>
                        ) : (
                          <span className="readable-cell">{appt.phone || '—'}</span>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <select
                            name="date"
                            form={formId}
                            value={formValues.date}
                            onChange={e => setFormValues({ ...formValues, date: e.target.value, time: '' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                            value={formValues.time}
                            onChange={e => setFormValues({ ...formValues, time: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                            value={formValues.status}
                            onChange={e => setFormValues({ ...formValues, status: e.target.value })}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 status-${formValues.status || 'confirmed'}`}
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

                      <td
                        className="
                          actions-cell
                          whitespace-nowrap
                          min-w-[190px]
                          text-center
                          align-middle
                          px-3
                          py-2
                        "
                      >
                        {isEditing ? (
                          <div className="edit-actions flex items-center justify-center gap-4 flex-nowrap">
                            <button
                              type="submit"
                              form={formId}
                              disabled={isPending || !isFormValid}
                              className={`
                                save-btn
                                px-5 py-2
                                text-sm font-medium
                                rounded-md
                                text-white
                                transition-all
                                ${isFormValid 
                                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                                  : 'bg-gray-400 cursor-not-allowed opacity-70'}
                              `}
                            >
                              {isPending ? 'جاري الحفظ...' : 'حفظ'}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleEdit(appt.id, appt)}
                              className="
                                cancel-btn
                                px-5 py-2
                                text-sm font-medium
                                rounded-md
                                bg-red-600
                                hover:bg-red-700
                                text-white
                                transition-all
                              "
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleEdit(appt.id, appt)}
                            className="
                              edit-btn
                              px-6 py-2
                              text-sm font-medium
                              rounded-md
                              bg-blue-600
                              hover:bg-blue-700
                              text-white
                              transition-all
                            "
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
