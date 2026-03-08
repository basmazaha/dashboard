// app/test-timezone/page.tsx
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function TestTimezonePage() {
  // جلب timezone الشركة
  const { data: settings } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .eq('id', 1)
    .single();

  const timezone = settings?.timezone || 'Africa/Cairo';

  // جلب آخر 5 مواعيد (للاختبار)
  const { data: appointments } = await supabaseServer
    .from('appointments')
    .select('id, full_name, appointment_datetime')
    .order('appointment_datetime', { ascending: false })
    .limit(5);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', direction: 'rtl' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
        صفحة اختبار التوقيت المحلي
      </h1>

      <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <h2>المنطقة الزمنية الحالية للشركة</h2>
        <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#2563eb' }}>
          {timezone}
        </p>
        <small>(من جدول business_settings)</small>
      </div>

      {/* عرض المواعيد الموجودة بالتوقيت المحلي */}
      <h2>آخر المواعيد المسجلة (بالتوقيت المحلي)</h2>
      {appointments && appointments.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '1rem', border: '1px solid #e5e7eb' }}>الاسم</th>
              <th style={{ padding: '1rem', border: '1px solid #e5e7eb' }}>التاريخ والوقت (محلي)</th>
              <th style={{ padding: '1rem', border: '1px solid #e5e7eb' }}>UTC الأصلي</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map(appt => {
              const localDateTime = appt.appointment_datetime
                ? new Date(appt.appointment_datetime).toLocaleString('ar-EG', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                    timeZone: timezone,
                  })
                : '—';

              return (
                <tr key={appt.id}>
                  <td style={{ padding: '1rem', border: '1px solid #e5e7eb' }}>{appt.full_name || '—'}</td>
                  <td style={{ padding: '1rem', border: '1px solid #e5e7eb' }}>{localDateTime}</td>
                  <td style={{ padding: '1rem', border: '1px solid #e5e7eb' }}>
                    {new Date(appt.appointment_datetime || '').toISOString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p>لا توجد مواعيد بعد.</p>
      )}

      {/* نموذج إضافة موعد جديد */}
      <h2>إضافة موعد جديد (اختبار)</h2>
      <form
        action={async (formData: FormData) => {
          'use server';

          const full_name = formData.get('full_name') as string;
          const datetimeLocal = formData.get('datetime') as string;

          if (!full_name || !datetimeLocal) {
            return { error: 'البيانات ناقصة' };
          }

          // تحويل التوقيت المحلي اللي اختاره المستخدم إلى UTC
          const appointment_datetime = new Date(datetimeLocal).toISOString();

          const { error } = await supabaseServer
            .from('appointments')
            .insert({
              full_name,
              appointment_datetime,
              status: 'confirmed',
            });

          if (error) {
            console.error(error);
            return { error: error.message };
          }

          // إعادة توجيه مع رسالة نجاح
          // أو يمكنك استخدام revalidatePath لو عايز تبقى في نفس الصفحة
          // revalidatePath('/test-timezone');
          // return { success: true };
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      >
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>الاسم الكامل</label>
          <input
            type="text"
            name="full_name"
            required
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            التاريخ والوقت (سيتم حفظه بـ UTC بعد التحويل)
          </label>
          <input
            type="datetime-local"
            name="datetime"
            required
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
          />
          <small style={{ color: '#6b7280' }}>
            اختر بالتوقيت المحلي – النظام هيحفظه بـ UTC تلقائيًا
          </small>
        </div>

        <button
          type="submit"
          style={{
            padding: '1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            cursor: 'pointer',
          }}
        >
          حفظ الموعد الجديد
        </button>
      </form>

      <p style={{ marginTop: '2rem', textAlign: 'center', color: '#6b7280' }}>
        بعد الحفظ، اعمل refresh للصفحة عشان تشوف الموعد الجديد بالتوقيت المحلي
      </p>
    </div>
  );
}
