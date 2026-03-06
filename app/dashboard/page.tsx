import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

async function updateAppointment(formData: FormData) {
  'use server';

  const id = formData.get('appointment_id') as string;
  const full_name = formData.get('full_name') as string | null;
  const phone = formData.get('phone') as string | null;
  const date = formData.get('date') as string | null;
  const time = formData.get('time') as string | null;
  const status = formData.get('status') as string | null;

  if (!id) return;

  const updates: Record<string, string> = {};

  if (full_name?.trim())    updates.full_name = full_name.trim();
  if (phone?.trim())        updates.phone = phone.trim();
  if (date)                 updates.appointment_date = date;
  if (time)                 updates.appointment_time = time;
  if (status)               updates.status = status;

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabaseServer
    .from('appointments')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('خطأ أثناء تحديث الموعد:', error);
  }
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await currentUser();

  const { data: appointments, error } = await supabaseServer
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

  return (
    <div>
      <div className="dashboard-page-header">
        <h2 className="dashboard-page-title">المواعيد</h2>
        <div className="current-user-info">
          المستخدم الحالي: <strong>{user?.firstName || 'غير معروف'}</strong> 
          (ID: {userId.slice(0, 8)}...)
        </div>
      </div>

      {appointments && appointments.length > 0 ? (
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
                  <th>حفظ التعديلات</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => {
                  const formId = `form-${appt.id}`;

                  return (
                    <tr key={appt.id}>
                      <td data-label="الاسم">
                        <input
                          form={formId}
                          type="text"
                          name="full_name"
                          defaultValue={appt.full_name || ''}
                          placeholder="الاسم الكامل"
                        />
                      </td>

                      <td data-label="التليفون">
                        <input
                          form={formId}
                          type="tel"
                          name="phone"
                          defaultValue={appt.phone || ''}
                          placeholder="01xxxxxxxxx"
                        />
                      </td>

                      <td data-label="التاريخ">
                        <input
                          form={formId}
                          type="date"
                          name="date"
                          defaultValue={appt.appointment_date ?? ''}
                        />
                      </td>

                      <td data-label="الوقت">
                        <input
                          form={formId}
                          type="time"
                          name="time"
                          defaultValue={appt.appointment_time ?? ''}
                        />
                      </td>

                      <td data-label="السبب">
                        {appt.reason || '—'}
                      </td>

                      <td data-label="الحالة">
                        <select
                          form={formId}
                          name="status"
                          defaultValue={appt.status || 'confirmed'}
                          className={`status-${appt.status || 'confirmed'}`}
                        >
                          <option value="confirmed">مؤكد</option>
                          <option value="cancelled">ملغي</option>
                          <option value="rescheduled">معدل</option>
                          <option value="completed">مكتمل</option>
                          <option value="absent">متغيب</option>
                        </select>
                      </td>

                      <td data-label="">
                        <form id={formId} action={updateAppointment}>
                          <input type="hidden" name="appointment_id" value={appt.id} />
                          <button type="submit" className="save-btn">
                            حفظ
                          </button>
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
