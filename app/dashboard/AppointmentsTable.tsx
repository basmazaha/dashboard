'use client';

import { useState, useTransition } from 'react';
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

export default function AppointmentsTable({
  initialAppointments,
}: {
  initialAppointments: Appointment[];
}) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    return map[status ?? 'confirmed'] ?? status ?? 'مؤكد';
  };

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateAppointment(formData);

      if ('success' in result) {
        // إعادة جلب البيانات بعد التحديث (بسيط وموثوق)
        // بديل: يمكنك تحديث الحالة محليًا بشكل متفائل (optimistic)
        window.location.reload(); // حل مؤقت – يمكن تحسينه لاحقًا
      } else if ('error' in result) {
        alert('حدث خطأ: ' + result.error);
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
                          <input
                            type="date"
                            name="date"
                            form={formId}
                            defaultValue={appt.appointment_date ?? ''}
                          />
                        ) : (
                          <span className="readable-cell">{appt.appointment_date || '—'}</span>
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            type="time"
                            name="time"
                            form={formId}
                            defaultValue={appt.appointment_time ?? ''}
                          />
                        ) : (
                          <span className="readable-cell">{appt.appointment_time || '—'}</span>
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

                        <form
                          id={formId}
                          action={handleSubmit}
                          className="hidden"
                        >
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
