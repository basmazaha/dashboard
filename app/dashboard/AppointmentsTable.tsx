'use client';

import { useState, useMemo } from 'react';
import { updateAppointment, insertAppointment, fetchAppointments } from './actions';

type Appointment = {
  id: string;
  full_name: string | null;
  email: string | null;
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
  const [isAdding, setIsAdding] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const offDaysSet = useMemo(() => new Set(initialOffDays), [initialOffDays]);

  const workingHoursByDay = useMemo(() => {
    const map: Record<number, WorkingHour> = {};
    initialWorkingHours.forEach(wh => map[wh.day_of_week] = wh);
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

    if (!wh || !wh.is_open || !wh.start_time || !wh.end_time) return [];

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

    for (let current = start.getTime(); current < end.getTime(); current += slotMs) {
      const slotStart = current;
      const slotEnd = current + slotMs;
      if (slotStart < breakEndMs && slotEnd > breakStartMs) continue;

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
        }).replace('ص', 'صباحاً').replace('م', 'مساءً');

        times.push(`${isoTime}|${formatted}`);
      }
    }
    return times;
  };

  const toggleEdit = (id: string, appt: Appointment) => {
    if (editingId === id) {
      setEditingId(null);
      setFormValues({});
      setFormErrors({});
    } else {
      setEditingId(id);
      setFormValues({
        full_name: appt.full_name || '',
        email: appt.email || '',
        phone: appt.phone || '',
        date: appt.appointment_date || '',
        time: normalizeTime(appt.appointment_time),
        reason: appt.reason || '',
        status: appt.status || 'confirmed',
      });
      setFormErrors({});
    }
  };

  const toggleAdd = () => {
    setIsAdding(!isAdding);
    if (!isAdding) {
      setFormValues({
        full_name: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        reason: '',
        status: 'confirmed',
      });
      setFormErrors({});
    } else {
      setFormValues({});
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

    const id = formData.get('appointment_id') as string;
    const original = appointments.find(a => a.id === id);

    // optimistic
    setAppointments(prev =>
      prev.map(a =>
        a.id === id
          ? {
              ...a,
              full_name: formData.get('full_name') as string | null,
              email: formData.get('email') as string | null,
              phone: formData.get('phone') as string | null,
              appointment_date: formData.get('date') as string | null,
              appointment_time: formData.get('time') as string | null,
              reason: formData.get('reason') as string | null,
              status: formData.get('status') as string | null,
            }
          : a
      )
    );

    const result = await updateAppointment(formData);

    if ('errors' in result) {
      setFormErrors(result.errors as Record<string, string>);
      if (original) setAppointments(prev => prev.map(a => a.id === id ? original : a));
    } else if ('success' in result) {
      const fresh = await fetchAppointments();
      if ('appointments' in fresh) setAppointments(fresh.appointments ?? []);
      setEditingId(null);
      setFormValues({});
      setFormErrors({});
    } else {
      alert('خطأ أثناء الحفظ: ' + (result.error || 'غير معروف'));
      if (original) setAppointments(prev => prev.map(a => a.id === id ? original : a));
    }

    setIsSubmitting(false);
  };

  const handleInsert = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors({});

    const tempId = 'temp-' + Date.now();
    const optimistic: Appointment = {
      id: tempId,
      full_name: formData.get('full_name') as string | null,
      email: formData.get('email') as string | null,
      phone: formData.get('phone') as string | null,
      appointment_date: formData.get('date') as string | null,
      appointment_time: formData.get('time') as string | null,
      reason: formData.get('reason') as string | null,
      status: formData.get('status') as string | null ?? 'confirmed',
    };

    setAppointments(prev => [optimistic, ...prev]);

    const result = await insertAppointment(formData);

    if ('errors' in result) {
      setFormErrors(result.errors as Record<string, string>);
      setAppointments(prev => prev.filter(a => a.id !== tempId));
    } else if ('success' in result) {
      const fresh = await fetchAppointments();
      if ('appointments' in fresh) setAppointments(fresh.appointments ?? []);
      setIsAdding(false);
      setFormValues({});
      setFormErrors({});
    } else {
      alert('خطأ أثناء الإضافة: ' + (result.error || 'غير معروف'));
      setAppointments(prev => prev.filter(a => a.id !== tempId));
    }

    setIsSubmitting(false);
  };

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button
          onClick={toggleAdd}
          type="button"
          className={`
            px-6 py-3 text-base font-medium rounded-xl shadow-md transition-all
            ${isAdding
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'}
          `}
        >
          {isAdding ? 'إلغاء الإضافة' : '+ إضافة موعد جديد'}
        </button>
      </div>

      {isAdding && (
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h3 className="text-xl font-bold mb-5 text-gray-800">إضافة موعد جديد</h3>

          <form action={handleInsert} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الكامل *</label>
                <input
                  name="full_name"
                  value={formValues.full_name || ''}
                  onChange={e => {
                    setFormValues(v => ({ ...v, full_name: e.target.value }));
                    setFormErrors(e => ({ ...e, full_name: '' }));
                  }}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${formErrors.full_name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  placeholder="الاسم الكامل"
                />
                {formErrors.full_name && <p className="mt-1.5 text-sm text-red-600">{formErrors.full_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني (اختياري)</label>
                <input
                  name="email"
                  type="email"
                  value={formValues.email || ''}
                  onChange={e => {
                    setFormValues(v => ({ ...v, email: e.target.value }));
                    setFormErrors(e => ({ ...e, email: '' }));
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم التليفون *</label>
                <input
                  name="phone"
                  value={formValues.phone || ''}
                  onChange={e => {
                    setFormValues(v => ({ ...v, phone: e.target.value }));
                    setFormErrors(e => ({ ...e, phone: '' }));
                  }}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${formErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  placeholder="01xxxxxxxxx"
                />
                {formErrors.phone && <p className="mt-1.5 text-sm text-red-600">{formErrors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">التاريخ *</label>
                <select
                  name="date"
                  value={formValues.date || ''}
                  onChange={e => setFormValues(v => ({ ...v, date: e.target.value, time: '' }))}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${formErrors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                >
                  <option value="">اختر التاريخ</option>
                  {availableDates.map(d => {
                    const [iso, label] = d.split('|');
                    return <option key={iso} value={iso}>{label}</option>;
                  })}
                </select>
                {formErrors.date && <p className="mt-1.5 text-sm text-red-600">{formErrors.date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الوقت *</label>
                <select
                  name="time"
                  value={formValues.time || ''}
                  onChange={e => setFormValues(v => ({ ...v, time: e.target.value }))}
                  disabled={!formValues.date}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${formErrors.time ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                >
                  <option value="">اختر الوقت</option>
                  {getAvailableTimesForDate(formValues.date).map(t => {
                    const [iso, label] = t.split('|');
                    return <option key={iso} value={iso}>{label}</option>;
                  })}
                </select>
                {formErrors.time && <p className="mt-1.5 text-sm text-red-600">{formErrors.time}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">الحالة</label>
                <select
                  name="status"
                  value={formValues.status || 'confirmed'}
                  onChange={e => setFormValues(v => ({ ...v, status: e.target.value }))}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition status-${formValues.status || 'confirmed'}`}
                >
                  <option value="pending">معلق</option>
                  <option value="confirmed">مؤكد</option>
                  <option value="cancelled">ملغي</option>
                  <option value="rescheduled">معاد جدولته</option>
                  <option value="completed">مكتمل</option>
                  <option value="absent">متغيب</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">السبب / الملاحظات (اختياري)</label>
                <input
                  name="reason"
                  value={formValues.reason || ''}
                  onChange={e => setFormValues(v => ({ ...v, reason: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  placeholder="سبب الحجز أو ملاحظات إضافية"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={toggleAdd}
                className="px-8 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition font-medium order-2 sm:order-1"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`
                  px-10 py-3 rounded-xl text-white font-medium transition order-1 sm:order-2
                  ${isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-md'}
                `}
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الموعد'}
              </button>
            </div>
          </form>
        </div>
      )}

      {appointments.length === 0 && !isAdding ? (
        <div className="text-center py-16 text-gray-500 text-lg font-medium">
          لا توجد مواعيد مسجلة حاليًا
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full min-w-[1000px] text-right">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">الاسم</th>
                <th className="px-6 py-4 font-semibold text-gray-700">الإيميل</th>
                <th className="px-6 py-4 font-semibold text-gray-700">التليفون</th>
                <th className="px-6 py-4 font-semibold text-gray-700">التاريخ</th>
                <th className="px-6 py-4 font-semibold text-gray-700">الوقت</th>
                <th className="px-6 py-4 font-semibold text-gray-700">السبب</th>
                <th className="px-6 py-4 font-semibold text-gray-700">الحالة</th>
                <th className="px-6 py-4 font-semibold text-gray-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {appointments.map(appt => {
                const isEditing = editingId === appt.id;
                const formId = `edit-form-${appt.id}`;
                const currentDate = isEditing ? formValues.date : appt.appointment_date;
                const availTimes = isEditing ? getAvailableTimesForDate(currentDate) : [];

                return (
                  <tr key={appt.id} className={isEditing ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          name="full_name"
                          form={formId}
                          value={formValues.full_name || ''}
                          onChange={e => setFormValues(v => ({ ...v, full_name: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      ) : (
                        appt.full_name || '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          name="email"
                          type="email"
                          form={formId}
                          value={formValues.email || ''}
                          onChange={e => setFormValues(v => ({ ...v, email: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      ) : (
                        appt.email || '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          name="phone"
                          form={formId}
                          value={formValues.phone || ''}
                          onChange={e => setFormValues(v => ({ ...v, phone: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      ) : (
                        appt.phone || '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          name="date"
                          form={formId}
                          value={formValues.date || ''}
                          onChange={e => setFormValues(v => ({ ...v, date: e.target.value, time: '' }))}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">اختر</option>
                          {availableDates.map(d => {
                            const [iso, label] = d.split('|');
                            return <option key={iso} value={iso}>{label}</option>;
                          })}
                        </select>
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
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          name="time"
                          form={formId}
                          value={formValues.time || ''}
                          onChange={e => setFormValues(v => ({ ...v, time: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="">اختر</option>
                          {availTimes.map(t => {
                            const [iso, label] = t.split('|');
                            return <option key={iso} value={iso}>{label}</option>;
                          })}
                        </select>
                      ) : (
                        appt.appointment_time
                          ? new Date(`2000-01-01T${appt.appointment_time}`).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            }).replace('ص', 'صباحاً').replace('م', 'مساءً')
                          : '—'
                      )}
                    </td>
                    <td className="px-6 py-4">{appt.reason || '—'}</td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          name="status"
                          form={formId}
                          value={formValues.status || 'confirmed'}
                          onChange={e => setFormValues(v => ({ ...v, status: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-lg status-${formValues.status || 'confirmed'}`}
                        >
                          <option value="pending">معلق</option>
                          <option value="confirmed">مؤكد</option>
                          <option value="cancelled">ملغي</option>
                          <option value="rescheduled">معاد جدولته</option>
                          <option value="completed">مكتمل</option>
                          <option value="absent">متغيب</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium status-badge status-${appt.status || 'confirmed'}`}>
                          {getStatusText(appt.status)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                          <button
                            type="submit"
                            form={formId}
                            disabled={isSubmitting}
                            className={`
                              px-5 py-2 rounded-lg text-white font-medium transition
                              ${isSubmitting ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}
                            `}
                          >
                            {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleEdit(appt.id, appt)}
                            className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleEdit(appt.id, appt)}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                        >
                          تعديل
                        </button>
                      )}

                      <form id={formId} action={handleUpdate} className="hidden">
                        <input type="hidden" name="appointment_id" value={appt.id} />
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
