//dashboard/app/dashboard/AppointmentsTable.tsx

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { format, parse, addMinutes } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { updateAppointment, insertAppointment, fetchAppointments } from './actions';
import { DEFAULT_TIMEZONE } from '@/lib/timezone';


type Appointment = {
  id: string;
  full_name: string | null;
  date_time: string | null;   // ISO string in UTC (timestamptz)
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
  currentPage: number;
  pageSize: number;
  totalCount: number;
}

export default function AppointmentsTable({
  initialAppointments,
  initialOffDays,
  initialWorkingHours,
  timezone,
  currentPage,
  pageSize,
  totalCount,
}: AppointmentsTableProps) {
  const tz = timezone || DEFAULT_TIMEZONE;
  const router = useRouter();
  
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
  if (toast) {
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }
}, [toast]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const fresh = await fetchAppointments(timezone, currentPage, pageSize);
      if ('appointments' in fresh) {
        setAppointments(fresh.appointments ?? []);
      }
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const offDaysSet = useMemo(() => new Set(initialOffDays), [initialOffDays]);

  const workingHoursByDay = useMemo(() => {
    const map: Record<number, WorkingHour> = {};
    initialWorkingHours.forEach(wh => map[wh.day_of_week] = wh);
    return map;
  }, [initialWorkingHours]);

  const formatDateLocal = useCallback((iso: string | null) => {
    if (!iso) return '—';
    try {
      const zoned = toZonedTime(iso, tz);
      return format(zoned, 'EEEE، d MMMM yyyy', { locale: ar });
    } catch (e) {
      console.error('خطأ تنسيق التاريخ:', e);
      return iso.split('T')[0] || '—';
    }
  }, [timezone]);

  const formatTimeLocal = useCallback((iso: string | null) => {
    if (!iso) return '—';
    try {
      const zoned = toZonedTime(iso, tz);
      let str = format(zoned, 'hh:mm a');
      str = str.replace('AM', 'صباحاً').replace('PM', 'مساءً');
      return str;
    } catch (e) {
      console.error('خطأ تنسيق الوقت:', e);
      return iso.split('T')[1]?.slice(0, 5) || '—';
    }
  }, [timezone]);

  const getDateOnly = useCallback((iso: string | null) => {
    if (!iso) return '';
    try {
      const zoned = toZonedTime(iso, tz);
      return format(zoned, 'yyyy-MM-dd');
    } catch {
      return '';
    }
  }, [timezone]);

  const getTimeOnly = useCallback((iso: string | null) => {
    if (!iso) return '';
    try {
      const zoned = toZonedTime(iso, tz);
      return format(zoned, 'HH:mm');
    } catch {
      return '';
    }
  }, [timezone]);

  const sortedAppointments = useMemo(() => {
  return [...appointments].sort((a, b) => {
    if (!a.date_time) return 1;
    if (!b.date_time) return -1;

    const ta = toZonedTime(a.date_time, tz).getTime();
    const tb = toZonedTime(b.date_time, tz).getTime();

    return ta - tb;
  });
}, [appointments, timezone]);

  const availableDates = useMemo(() => {
    const dates: string[] = [];
    const today = toZonedTime(new Date(), tz);

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoDate = format(d, 'yyyy-MM-dd');

      if (offDaysSet.has(isoDate)) continue;

      const dayOfWeek = d.getDay();
      const wh = workingHoursByDay[dayOfWeek];

      if (wh?.is_open && wh.start_time && wh.end_time) {
        const zoned = toZonedTime(d, tz);
        const label = format(zoned, 'EEEE d MMMM yyyy', { locale: ar });
        dates.push(isoDate + '|' + label);
      }
    }
    return dates;
  }, [offDaysSet, workingHoursByDay, timezone]);

  const getAvailableTimesForDate = useCallback((selectedDate: string | null) => {
    if (!selectedDate) return [];

    const dateObj = parse(selectedDate, 'yyyy-MM-dd', new Date());
    const dayOfWeek = dateObj.getDay();
    const wh = workingHoursByDay[dayOfWeek];

    if (!wh || !wh.is_open || !wh.start_time || !wh.end_time) return [];

    const startTime = wh.start_time;
    const endTime   = wh.end_time;
    const slotMin   = wh.slot_duration_minutes ?? 15;

    const baseDate = parse(selectedDate, 'yyyy-MM-dd', new Date());

    const start = parse(`${selectedDate} ${startTime}`, 'yyyy-MM-dd HH:mm:ss', baseDate);
    const end   = parse(`${selectedDate} ${endTime}`,   'yyyy-MM-dd HH:mm:ss', baseDate);
    
    let current = start.getTime();
    const endMs = end.getTime();

    const breakStartMs = wh.break_start
     ? parse(`${selectedDate} ${wh.break_start}`, 'yyyy-MM-dd HH:mm:ss', baseDate).getTime()
     : Infinity;

    const breakEndMs = wh.break_end
     ? parse(`${selectedDate} ${wh.break_end}`, 'yyyy-MM-dd HH:mm:ss', baseDate).getTime()
     : -Infinity;

    const times: string[] = [];

    while (current < endMs) {
      const slotEnd = current + slotMin * 60 * 1000;

      if (slotEnd > breakStartMs && current < breakEndMs) {
        current = breakEndMs;
        continue;
      }

      const slotDate = new Date(current);
      const now = toZonedTime(new Date(), tz);
      const selected = parse(selectedDate, 'yyyy-MM-dd', new Date());

      const isToday =
       selected.getFullYear() === now.getFullYear() &&
       selected.getMonth() === now.getMonth() &&
       selected.getDate() === now.getDate();

      if (isToday && slotDate < now) {
       current += slotMin * 60 * 1000;
       continue;
      }
      const timeStr = format(slotDate, 'HH:mm');

      const isBooked = appointments.some(a => {
        if (!a.date_time || a.status === 'cancelled') return false;
        if (editingId && a.id === editingId) return false;

        const apptDate = getDateOnly(a.date_time);
        const apptTime = getTimeOnly(a.date_time);

        return apptDate === selectedDate && apptTime === timeStr;
      });

      if (!isBooked) {
        let display = format(slotDate, 'hh:mm a')
          .replace('AM', 'صباحاً')
          .replace('PM', 'مساءً');
        times.push(timeStr + '|' + display);
      }

      current += slotMin * 60 * 1000;
    }

    return times;
  }, [appointments, editingId, getDateOnly, getTimeOnly, workingHoursByDay]);

  const toggleEdit = (id: string, appt: Appointment) => {
    if (editingId === id) {
      setEditingId(null);
      setFormValues({});
      setFormErrors({});
    } else {
      setEditingId(id);
      setFormValues({
        full_name: appt.full_name || '',
        phone: appt.phone || '',
        date: getDateOnly(appt.date_time),
        time: getTimeOnly(appt.date_time),
        status: appt.status || 'confirmed',
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
    const original = appointments.find(a => a.id === appointmentId);

    setAppointments(prev =>
      prev.map(a =>
        a.id === appointmentId
          ? {
              ...a,
              full_name: formData.get('full_name') as string | null,
              phone: formData.get('phone') as string | null,
              status: formData.get('status') as string | null,
            }
          : a
      )
    );

    const result = await updateAppointment(formData, timezone);

if ('errors' in result) {
  setFormErrors(result.errors as Record<string, string>);

  if (original) {
    setAppointments(prev =>
      prev.map(a => a.id === appointmentId ? original : a)
    );
  }

  // ✅ toast validation
  setToast(Object.values(result.errors ?? {})[0] || 'بيانات غير صحيحة ❌️');

} else if ('success' in result) {
  const fresh = await fetchAppointments(timezone, currentPage, pageSize);

  if ('appointments' in fresh) {
    setAppointments(fresh.appointments ?? []);
  }

  setEditingId(null);
  setFormValues({});
  setFormErrors({});

  // ✅ (اختياري) success toast
  setToast('تم التحديث بنجاح ✅');

} else if ('error' in result) {
  // 🔥 دي الحالة اللي كانت ناقصة
  setToast(result.error || 'حدث خطأ ❗️');

  if (original) {
    setAppointments(prev =>
      prev.map(a => a.id === appointmentId ? original : a)
    );
  }

} else {
  // fallback احتياطي
  setToast('حدث خطأ غير متوقع ❗️');
}
    setIsSubmitting(false);
};

  const handleInsert = async (formData: FormData) => {
    setIsSubmitting(true);
    setFormErrors({});

    const tempId = 'temp-' + Date.now();
    const optimistic = {
      id: tempId,
      full_name: formData.get('full_name') as string | null,
      phone: formData.get('phone') as string | null,
      date_time: null,
      reason: formData.get('reason') as string | null,
      status: formData.get('status') as string | null ?? 'confirmed',
    };

    setAppointments(prev => [optimistic, ...prev]);

    const result = await insertAppointment(formData, timezone);

    if ('errors' in result) {
      setFormErrors(result.errors as Record<string, string>);
      setAppointments(prev => prev.filter(a => a.id !== tempId));
      setToast(Object.values(result.errors ?? {})[0] || 'بيانات غير صحيحة ❌️');
    } else if ('success' in result) {
      const fresh = await fetchAppointments(timezone, currentPage, pageSize);
      if ('appointments' in fresh) setAppointments(fresh.appointments ?? []);
      setIsAdding(false);
      setFormValues({});
      setFormErrors({});
      setToast('تم إضافة الموعد بنجاح ✅');
    } else {
      setToast('خطأ: ' + (result.error || 'غير معروف ❗️'));
      setAppointments(prev => prev.filter(a => a.id !== tempId));
    }

    setIsSubmitting(false);
  };

  // ─── حساب نطاق الصفحات الذكي ───
  const totalPages = Math.ceil(totalCount / pageSize);
  const maxPagesToShow = 7;

  let startPage: number;
  let endPage: number;

  if (totalPages <= maxPagesToShow) {
    startPage = 1;
    endPage = totalPages;
  } else {
    const half = Math.floor(maxPagesToShow / 2);
    startPage = Math.max(1, currentPage - half);
    endPage = Math.min(totalPages, currentPage + half);

    if (startPage === 1) {
      endPage = maxPagesToShow;
    } else if (endPage === totalPages) {
      startPage = totalPages - maxPagesToShow + 1;
    }
  }

  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

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

        <div 
          style={{ 
            width: '44px', 
            height: '44px', 
            minWidth: '44px', 
            minHeight: '44px',
            flexShrink: 0,
            flexGrow: 0,
            display: 'inline-block',
          }}
        >
          <button
            type="button"
            onClick={handleRefresh}
            className={`btn btn--refresh ${isRefreshing ? 'is-loading' : ''}`}
            style={{
              width: '100% !important',
              height: '100% !important',
              minWidth: '100%',
              minHeight: '100%',
              padding: 0,
              margin: 0,
              boxSizing: 'border-box',
            }}
            disabled={isRefreshing}
          >
            <svg
              className="refresh-icon-svg"
              style={{ 
                width: '24px', 
                height: '24px',
                flexShrink: 0,
              }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
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
                  const currentDate = isEditing ? formValues.date : getDateOnly(appt.date_time);
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
                            {formatDateLocal(appt.date_time)}
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
                            {formatTimeLocal(appt.date_time)}
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
                              رجوع
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

      {/* الـ Pagination */}
      {totalCount > 0 && (
        <div className="pagination-container">
          <div className="pagination">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => router.push(`/dashboard?page=1`)}
            >
              الأولى
            </button>

            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => router.push(`/dashboard?page=${currentPage - 1}`)}
            >
              السابق
            </button>

            {startPage > 1 && (
              <>
                <button
                  className="pagination-btn"
                  onClick={() => router.push(`/dashboard?page=1`)}
                >
                  1
                </button>
                {startPage > 2 && <span className="pagination-ellipsis">...</span>}
              </>
            )}

            {pages.map(p => (
              <button
                key={p}
                className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
                onClick={() => router.push(`/dashboard?page=${p}`)}
              >
                {p}
              </button>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
                <button
                  className="pagination-btn"
                  onClick={() => router.push(`/dashboard?page=${totalPages}`)}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => router.push(`/dashboard?page=${currentPage + 1}`)}
            >
              التالي
            </button>

            <button
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => router.push(`/dashboard?page=${totalPages}`)}
            >
              الأخيرة
            </button>
          </div>

          <div className="pagination-info">
            عرض {(currentPage - 1) * pageSize + 1} – {Math.min(currentPage * pageSize, totalCount)} من أصل {totalCount} موعد
          </div>
        </div>
      )}

        {toast && (
        <div className="toast">
         {toast}
        </div>
      )}
      
    </>
  );
        }
