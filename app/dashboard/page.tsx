// app/dashboard/page.tsx
'use client';

import { useState, useTransition } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import { updateAppointment } from './actions';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await currentUser();

  const { data: appointmentsData, error } = await supabaseServer
    .from('appointments')
    .select('id, full_name, appointment_date, appointment_time, phone, reason, status')
    .order('appointment_date', { ascending: true })
    .limit(50);

  if (error) {
    console.error('خطأ في جلب المواعيد:', error);
    return (
      <div className="no-appointments">
        حدث خطأ أثناء جلب المواعيد: {error.message}
      </div>
    );
  }

  const appointments = appointmentsData || [];

  // الآن، بما أننا في client component، سنستخدم useState للـ appointments إذا أردنا تحديثًا محليًا، لكن للبداية، نستخدم البيانات المجلوبة
  // لتحديث محلي، يمكننا استخدام useState(appointments)

  const [localAppointments, setLocalAppointments] = useState(appointments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // دالة للتبديل بين وضع العرض والتعديل
  const toggleEdit = (id: string) => {
    setEditingId(editingId === id ? null : id);
  };

  // عند الضغط على حفظ
  const handleSave = async (formData: FormData) => {
    startTransition(async () => {
      await updateAppointment(formData);
      // إعادة جلب البيانات أو تحديث الحالة المحلية
      // للبساطة، نفترض إعادة جلب، لكن يمكن تحديث محلي
      const { data: updatedData } = await supabaseServer
        .from('appointments')
        .select('id, full_name, appointment_date, appointment_time, phone, reason, status')
        .order('appointment_date', { ascending: true })
        .limit(50);
      setLocalAppointments(updatedData || []);
      setEditingId(null);
    });
  };

  // دالة لتحويل الحالة إلى نص عربي
  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'pending': return 'معلق';
      case 'confirmed': return 'مؤكد';
      case 'cancelled': return 'ملغي';
      case 'completed': return 'مكتمل';
      case 'absent': return 'متغيب';
      default: return 'مؤكد';
    }
  };

  return (
    <div>
      <div className="dashboard-page-header">
        <h2 className="dashboard-page-title">المواعيد</h2>
        <div className="current-user-info">
          المستخدم الحالي: <strong>{user?.firstName || 'غير معروف'}</strong> 
          (ID: {userId.slice(0, 8)}...)
        </div>
      </div>

      {localAppointments.length > 0 ? (
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
                {localAppointments.map((appt) => {
                  const isEditing = editingId === appt.id;

                  return (
                    <tr key={appt.id} className={isEditing ? 'editing-row' : ''}>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            name="full_name"
                            form={`form-${appt.id}`}
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
                            form={`form-${appt.id}`}
                            defaultValue={appt.phone || ''}
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
                            form={`form-${appt.id}`}
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
                            form={`form-${appt.id}`}
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
                            form={`form-${appt.id}`}
                            defaultValue={appt.status || 'confirmed'}
                            className={`status-${appt.status || 'confirmed'}`}
                          >
                            <option value="pending">معلق</option>
                            <option value="confirmed">مؤكد</option>
                            <option value="cancelled">ملغي</option>
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
                              form={`form-${appt.id}`}
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
                        {/* form مخفي لكل صف */}
                        <form
                          id={`form-${appt.id}`}
                          action={handleSave}
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
    </div>
  );
}
