'use client';

import { useState, useMemo } from 'react';
import { updateAppointment, fetchAppointments } from './actions';

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

// ── Server Action لإضافة موعد جديد ────────────────────────────────────────
async function createAppointment(formData: FormData) {
  'use server';

  const full_name = (formData.get('full_name') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  let appointment_date = formData.get('date') as string | null;
  let appointment_time = formData.get('time') as string | null;
  const reason = (formData.get('reason') as string)?.trim() || null;

  const errors: Record<string, string> = {};

  if (!full_name) errors.full_name = 'الاسم مطلوب';
  else if (full_name.length < 3) errors.full_name = 'الاسم يجب أن يكون 3 حروف على الأقل';

  if (!phone) errors.phone = 'رقم التليفون مطلوب';
  else {
    const cleaned = phone.replace(/\s+/g, '');
    if (!/^\+?[0-9]+$/.test(cleaned)) {
      errors.phone = 'رقم التليفون يجب أن يحتوي أرقام فقط أو + في البداية';
    } else if (cleaned.length > 20) {
      errors.phone = 'رقم التليفون لا يجب أن يتجاوز 20 رقم';
    }
  }

  if (!appointment_date) errors.date = 'التاريخ مطلوب';
  if (!appointment_time) errors.time = 'الوقت مطلوب';

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  // تحويل الوقت إلى صيغة PostgreSQL time
  if (appointment_time) {
    appointment_time = toFullTimeFormat(appointment_time);
  }

  const { error } = await supabaseServer
    .from('appointments')
    .insert({
      full_name,
      phone,
      appointment_date,
      appointment_time,
      reason,
      status: 'pending',
      reminder_sent_6h: false,
    });

  if (error) {
    console.error('خطأ إضافة الموعد:', error);
    return { error: error.message || 'فشل في إضافة الموعد' };
  }

  return { success: true };
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // حالة نافذة إضافة موعد جديد
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    phone: '',
    date: '',
    time: '',
    reason: '',
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

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
        date: initialValues.appointment_date || '',
        time: normalizeTime(initialValues.appointment_time),
        status: initialValues.status || 'confirmed',
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

  const handleUpdateSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors({});

    const full_name = (formData.get('full_name') as string)?.trim() || '';
    const phone = (formData.get('phone') as string)?.trim() || '';

    const localErrors: Record<string, string> = {};

    if (!full_name) localErrors.full_name = 'الاسم مطلوب';
    else if (full_name.length < 3) localErrors.full_name = 'الاسم يجب أن يكون 3 حروف على الأقل';

    if (!phone) localErrors.phone = 'رقم التليفون مطلوب';
    else {
      const cleaned = phone.replace(/\s+/g, '');
      if (!/^\+?[0-9]+$/.test(cleaned)) {
        localErrors.phone = 'رقم التليفون يجب أن يحتوي أرقام فقط أو +';
      } else if (cleaned.length > 20) {
        localErrors.phone = 'رقم التليفون لا يجب أن يتجاوز 20 رقم';
      }
    }

    if (Object.keys(localErrors).length > 0) {
      setFormErrors(localErrors);
      setIsSubmitting(false);
      return;
    }

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
      alert('حدث خطأ أثناء الحفظ: ' + ((result as any).error || 'غير معروف'));
      if (originalAppt) {
        setAppointments(prev => prev.map(a => (a.id === appointmentId ? originalAppt : a)));
      }
    }

    setIsSubmitting(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddErrors({});

    const formData = new FormData();
    formData.append('full_name', addForm.full_name);
    formData.append('phone', addForm.phone);
    formData.append('date', addForm.date);
    formData.append('time', addForm.time);
    formData.append('reason', addForm.reason);

    const result = await createAppointment(formData);

    if ('success' in result) {
      const freshData = await fetchAppointments();
      if ('appointments' in freshData) {
        setAppointments(freshData.appointments ?? []);
      }
      setShowAddModal(false);
      setAddForm({ full_name: '', phone: '', date: '', time: '', reason: '' });
      setAddErrors({});
    } else if ('errors' in result) {
      setAddErrors(result.errors as Record<string, string>);
    } else {
      alert('حدث خطأ: ' + ((result as any).error || 'غير معروف'));
    }
  };

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="
            px-6 py-2.5
            bg-indigo-600
            hover:bg-indigo-700
            text-white
            font-medium
            rounded-md
            shadow-sm
            transition-all
          "
        >
          + إضافة حجز جديد
        </button>
      </div>

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
                  const currentDate = isEditing ? formValues.date : appt.appointment_date;
                  const availTimes = isEditing ? getAvailableTimesForDate(currentDate) : [];

                  return (
                    <tr key={appt.id} className={isEditing ? 'editing-row' : ''}>
                      <td>
                        {isEditing ? (
                          <div className="input-wrapper">
                            <input
                              type="text"
                              name="full_name"
                              form={formId}
                              value={formValues.full_name}
                              onChange={e => {
                                setFormValues({ ...formValues, full_name: e.target.value });
                                setFormErrors(prev => ({ ...prev, full_name: '' }));
                              }}
                              placeholder="الاسم الكامل"
                              className={formErrors.full_name ? 'input-error' : ''}
                            />
                            {formErrors.full_name && (
                              <span className="error-message">{formErrors.full_name}</span>
                            )}
                          </div>
                        ) : (
                          <span className="readable-cell">{appt.full_name || '—'}</span>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <div className="input-wrapper">
                            <input
                              type="tel"
                              name="phone"
                              form={formId}
                              value={formValues.phone}
                              onChange={e => {
                                setFormValues({ ...formValues, phone: e.target.value });
                                setFormErrors(prev => ({ ...prev, phone: '' }));
                              }}
                              placeholder="01xxxxxxxxx أو +20..."
                              className={formErrors.phone ? 'input-error' : ''}
                            />
                            {formErrors.phone && (
                              <span className="error-message">{formErrors.phone}</span>
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
                            className={`status-${formValues.status || 'confirmed'}`}
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

                      <td className="actions-cell whitespace-nowrap min-w-[190px] text-center align-middle px-3 py-2">
                        {isEditing ? (
                          <div className="edit-actions flex items-center justify-center gap-4 flex-nowrap">
                            <button
                              type="submit"
                              form={formId}
                              disabled={isSubmitting}
                              className="
                                save-btn
                                px-5 py-2
                                text-sm font-medium
                                rounded-md
                                bg-emerald-600
                                hover:bg-emerald-700
                                text-white
                                disabled:opacity-50
                                disabled:cursor-not-allowed
                                transition-all
                              "
                            >
                              {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
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

                        <form id={formId} action={handleUpdateSubmit} className="hidden">
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

      {/* نافذة إضافة موعد جديد */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-5 text-gray-800">إضافة موعد جديد</h3>

              <form onSubmit={handleAddSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الاسم الكامل <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.full_name}
                    onChange={e => setAddForm({ ...addForm, full_name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      addErrors.full_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {addErrors.full_name && (
                    <p className="mt-1 text-sm text-red-600">{addErrors.full_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    رقم التليفون <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="01xxxxxxxxx أو +201..."
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      addErrors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {addErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{addErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    التاريخ <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={addForm.date}
                    onChange={e => setAddForm({ ...addForm, date: e.target.value, time: '' })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      addErrors.date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">اختر التاريخ</option>
                    {availableDates.map(d => {
                      const [iso, label] = d.split('|');
                      return <option key={iso} value={iso}>{label}</option>;
                    })}
                  </select>
                  {addErrors.date && (
                    <p className="mt-1 text-sm text-red-600">{addErrors.date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الوقت <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={addForm.time}
                    onChange={e => setAddForm({ ...addForm, time: e.target.value })}
                    disabled={!addForm.date}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      addErrors.time ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">اختر الوقت</option>
                    {getAvailableTimesForDate(addForm.date).map(t => {
                      const [iso, label] = t.split('|');
                      return <option key={iso} value={iso}>{label}</option>;
                    })}
                  </select>
                  {addErrors.time && (
                    <p className="mt-1 text-sm text-red-600">{addErrors.time}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السبب (اختياري)</label>
                  <textarea
                    value={addForm.reason}
                    onChange={e => setAddForm({ ...addForm, reason: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'جاري الإضافة...' : 'إضافة الموعد'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
