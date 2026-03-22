'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { updateAppointment, searchAppointments } from './actions';

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

interface SearchAppointmentsTableProps {
  initialAppointments: Appointment[];
  initialOffDays: string[];
  initialWorkingHours: WorkingHour[];
  timezone: string;
  currentPage: number;
  pageSize: number;
  totalCount: number;
}

export default function SearchAppointmentsTable({
  initialAppointments,
  initialOffDays,
  initialWorkingHours,
  timezone,
  currentPage,
  pageSize,
  totalCount,
}: SearchAppointmentsTableProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // حالة البحث والصفحة (عميلية)
  const [searchValues, setSearchValues] = useState({
    full_name: '',
    phone: '',
    status: '',
    start_date: '',
    end_date: '',
  });
  const [currentPageState, setCurrentPageState] = useState(currentPage);
  const [totalCountState, setTotalCountState] = useState(totalCount);

  const handleFetch = useCallback(async (page: number) => {
    setIsSearching(true);
    const params = {
      full_name: searchValues.full_name || undefined,
      phone: searchValues.phone || undefined,
      status: searchValues.status || undefined,
      start_date: searchValues.start_date || undefined,
      end_date: searchValues.end_date || undefined,
    };

    const fresh = await searchAppointments(timezone, params, page, pageSize);
    if ('appointments' in fresh) {
      setAppointments(fresh.appointments ?? []);
      setTotalCountState(fresh.totalCount);
    }
    setIsSearching(false);
  }, [searchValues, timezone, pageSize]);

  // تحميل أولي عند فتح الصفحة (بحث بدون فلاتر = كل المواعيد)
  useEffect(() => {
    handleFetch(currentPageState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const offDaysSet = useMemo(() => new Set(initialOffDays), [initialOffDays]);

  const workingHoursByDay = useMemo(() => {
    const map: Record<number, WorkingHour> = {};
    initialWorkingHours.forEach(wh => map[wh.day_of_week] = wh);
    return map;
  }, [initialWorkingHours]);

  const formatDateLocal = useCallback((iso: string | null) => {
    if (!iso) return '—';
    try {
      const zoned = toZonedTime(iso, timezone);
      return format(zoned, 'EEEE، d MMMM yyyy', { locale: ar });
    } catch (e) {
      console.error('خطأ تنسيق التاريخ:', e);
      return iso.split('T')[0] || '—';
    }
  }, [timezone]);

  const formatTimeLocal = useCallback((iso: string | null) => {
    if (!iso) return '—';
    try {
      const zoned = toZonedTime(iso, timezone);
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
      const zoned = toZonedTime(iso, timezone);
      return format(zoned, 'yyyy-MM-dd');
    } catch {
      return '';
    }
  }, [timezone]);

  const getTimeOnly = useCallback((iso: string | null) => {
    if (!iso) return '';
    try {
      const zoned = toZonedTime(iso, timezone);
      return format(zoned, 'HH:mm');
    } catch {
      return '';
    }
  }, [timezone]);

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const ta = a.date_time ? new Date(a.date_time).getTime() : Infinity;
      const tb = b.date_time ? new Date(b.date_time).getTime() : Infinity;
      return ta - tb;
    });
  }, [appointments]);

  const availableDates = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoDate = format(d, 'yyyy-MM-dd');

      if (offDaysSet.has(isoDate)) continue;

      const dayOfWeek = d.getDay();
      const wh = workingHoursByDay[dayOfWeek];

      if (wh?.is_open && wh.start_time && wh.end_time) {
        const zoned = toZonedTime(d, timezone);
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

    const start = parse(startTime, 'HH:mm:ss', new Date());
    const end   = parse(endTime,   'HH:mm:ss', new Date());

    let current = start.getTime();
    const endMs = end.getTime();

    const breakStartMs = wh.break_start ? parse(wh.break_start, 'HH:mm:ss', new Date()).getTime() : Infinity;
    const breakEndMs   = wh.break_end   ? parse(wh.break_end,   'HH:mm:ss', new Date()).getTime() : -Infinity;

    const times: string[] = [];

    while (current < endMs) {
      const slotEnd = current + slotMin * 60 * 1000;

      if (slotEnd > breakStartMs && current < breakEndMs) {
        current = breakEndMs;
        continue;
      }

      const slotDate = new Date(current);
      const now = new Date();
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
      if (original) setAppointments(prev => prev.map(a => a.id === appointmentId ? original : a));
    } else if ('success' in result) {
      await handleFetch(currentPageState);
      setEditingId(null);
      setFormValues({});
      setFormErrors({});
    } else {
      alert('خطأ أثناء الحفظ: ' + (result.error || 'غير معروف'));
      if (original) setAppointments(prev => prev.map(a => a.id === appointmentId ? original : a));
    }

    setIsSubmitting(false);
  };

  const handleSearch = () => {
    setCurrentPageState(1);
    handleFetch(1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await handleFetch(currentPageState);
    setIsRefreshing(false);
  };

  const changePage = (newPage: number) => {
    if (newPage === currentPageState) return;
    setCurrentPageState(newPage);
    handleFetch(newPage);
  };

  // ─── حساب نطاق الصفحات الذكي ───
  const totalPages = Math.ceil(totalCountState / pageSize);
  const maxPagesToShow = 7;

  let startPage: number;
  let endPage: number;

  if (totalPages <= maxPagesToShow) {
    startPage = 1;
    endPage = totalPages;
  } else {
    const half = Math.floor(maxPagesToShow / 2);
    startPage = Math.max(1, currentPageState - half);
    endPage = Math.min(totalPages, currentPageState + half);

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
      {/* نموذج البحث */}
      <div className="appointment-form appointment-form--search">
        <h3 className="appointment-form__title">بحث في المواعيد</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">الاسم</label>
            <input
              type="text"
              value={searchValues.full_name}
              onChange={e => setSearchValues({ ...searchValues, full_name: e.target.value })}
              className="form-input"
              placeholder="الاسم"
            />
          </div>

          <div className="form-field">
            <label className="form-label">رقم التليفون</label>
            <input
              type="tel"
              value={searchValues.phone}
              onChange={e => setSearchValues({ ...searchValues, phone: e.target.value })}
              className="form-input"
              placeholder="01xxxxxxxxx"
            />
          </div>


          <div className="form-field">
            <label className="form-label">من تاريخ</label>
            <input
              type="date"
              value={searchValues.start_date}
              onChange={e => setSearchValues({ ...searchValues, start_date: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">إلى تاريخ</label>
            <input
              type="date"
              value={searchValues.end_date}
              onChange={e => setSearchValues({ ...searchValues, end_date: e.target.value })}
              className="form-input"
            />
          </div>

            <div className="form-field">
            <label className="form-label">الحالة</label>
            <select
              value={searchValues.status}
              onChange={e => setSearchValues({ ...searchValues, status: e.target.value })}
              className="form-select"
            >
              <option value="">الكل</option>
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
            onClick={() => {
              setSearchValues({ full_name: '', phone: '', status: '', start_date: '', end_date: '' });
              setCurrentPageState(1);
              handleFetch(1);
            }}
            className="btn btn--secondary"
          >
            مسح البحث
          </button>
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className={`btn btn--primary ${isSearching ? 'btn--disabled' : ''}`}
          >
            {isSearching ? 'جاري البحث...' : 'بحث'}
          </button>
        </div>
      </div>

      <div className="appointments__actions">
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

      {sortedAppointments.length === 0 ? (
        <div className="no-appointments">
          لا توجد نتائج مطابقة للبحث
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
      {totalCountState > 0 && (
        <div className="pagination-container">
          <div className="pagination">
            <button
              className="pagination-btn"
              disabled={currentPageState === 1}
              onClick={() => changePage(1)}
            >
              الأولى
            </button>

            <button
              className="pagination-btn"
              disabled={currentPageState === 1}
              onClick={() => changePage(currentPageState - 1)}
            >
              السابق
            </button>

            {startPage > 1 && (
              <>
                <button
                  className="pagination-btn"
                  onClick={() => changePage(1)}
                >
                  1
                </button>
                {startPage > 2 && <span className="pagination-ellipsis">...</span>}
              </>
            )}

            {pages.map(p => (
              <button
                key={p}
                className={`pagination-btn ${p === currentPageState ? 'active' : ''}`}
                onClick={() => changePage(p)}
              >
                {p}
              </button>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
                <button
                  className="pagination-btn"
                  onClick={() => changePage(totalPages)}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              className="pagination-btn"
              disabled={currentPageState === totalPages}
              onClick={() => changePage(currentPageState + 1)}
            >
              التالي
            </button>

            <button
              className="pagination-btn"
              disabled={currentPageState === totalPages}
              onClick={() => changePage(totalPages)}
            >
              الأخيرة
            </button>
          </div>

          <div className="pagination-info">
            عرض {(currentPageState - 1) * pageSize + 1} – {Math.min(currentPageState * pageSize, totalCountState)} من أصل {totalCountState} موعد
          </div>
        </div>
      )}
    </>
  );
  }
