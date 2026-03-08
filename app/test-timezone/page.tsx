// app/test-timezone/page.tsx
import { supabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache'; // ← أضف هذا الاستيراد (كان مفقودًا)

export const dynamic = 'force-dynamic';

export default async function TestTimezonePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // جلب timezone الشركة
  const { data: settings } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .eq('id', 1)
    .single();

  const timezone = settings?.timezone || 'Africa/Cairo';

  // جلب آخر 5 مواعيد للعرض
  const { data: appointments } = await supabaseServer
    .from('appointments')
    .select('id, full_name, appointment_datetime')
    .order('appointment_datetime', { ascending: false })
    .limit(5);

  // رسائل النجاح أو الخطأ من query params
  const success = searchParams.success === 'true';
  const error = typeof searchParams.error === 'string' ? searchParams.error : null;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2.5rem', color: '#1f2937' }}>
        صفحة اختبار التوقيت المحلي
      </h1>

      {/* حالة الإعدادات */}
      <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #bfdbfe' }}>
        <h2 style={{ marginTop: 0, color: '#1d4ed8' }}>المنطقة الزمنية الحالية للشركة</h2>
        <p style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#2563eb' }}>
          {timezone}
        </p>
        <small style={{ color: '#6b7280' }}>
          (من جدول business_settings – يمكن تغييرها من صفحة الإعدادات)
        </small>
      </div>

      {/* رسائل النجاح / الخطأ */}
      {success && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          background: '#ecfdf5',
          color: '#065f46',
          borderRadius: '8px',
          border: '1px solid #6ee7b7',
          textAlign: 'center',
          fontWeight: 500,
        }}>
          تم حفظ الموعد بنجاح! (اعمل refresh إذا لم يظهر فوراً)
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          background: '#fef2f2',
          color: '#991b1b',
          borderRadius: '8px',
          border: '1px solid #fca5a5',
          textAlign: 'center',
          fontWeight: 500,
        }}>
          خطأ: {error}
        </div>
      )}

      {/* جدول المواعيد الموجودة */}
      <h2 style={{ margin: '2rem 0 1rem', color: '#1f2937' }}>
        آخر المواعيد المسجلة (بالتوقيت المحلي)
      </h2>

      {appointments && appointments.length > 0 ? (
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '1rem', borderBottom: '2px solid #d1d5db', textAlign: 'right' }}>الاسم</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #d1d5db', textAlign: 'right' }}>التاريخ والوقت (محلي)</th>
                <th style={{ padding: '1rem', borderBottom: '2px solid #d1d5db', textAlign: 'right' }}>UTC الأصلي</th>
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
                  <tr key={appt.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>{appt.full_name || 'غير محدد'}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>{localDateTime}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.9rem', color: '#6b7280' }}>
                      {appt.appointment_datetime || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
          لا توجد مواعيد مسجلة بعد.
        </p>
      )}

      {/* نموذج إضافة موعد جديد */}
      <h2 style={{ margin: '3rem 0 1.5rem', color: '#1f2937' }}>إضافة موعد جديد (اختبار)</h2>

      <form
        action={async (formData: FormData) => {
          'use server';

          const full_name = (formData.get('full_name') as string)?.trim();
          const datetimeLocal = formData.get('datetime') as string;

          if (!full_name || full_name.length < 3) {
            redirect('/test-timezone?error=' + encodeURIComponent('الاسم مطلوب ويجب أن يكون 3 حروف على الأقل'));
          }

          if (!datetimeLocal) {
            redirect('/test-timezone?error=' + encodeURIComponent('التاريخ والوقت مطلوب'));
          }

          // تحويل التوقيت المحلي إلى UTC
          const appointment_datetime = new Date(datetimeLocal).toISOString();

          const { error } = await supabaseServer
            .from('appointments')
            .insert({
              full_name,
              appointment_datetime,
              status: 'confirmed',
            });

          if (error) {
            console.error('خطأ حفظ:', error);
            redirect('/test-timezone?error=' + encodeURIComponent(error.message || 'فشل في حفظ الموعد'));
          }

          // نجاح: تحديث البيانات وإعادة توجيه مع رسالة
          revalidatePath('/test-timezone');
          redirect('/test-timezone?success=true');
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          background: '#ffffff',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}
      >
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            الاسم الكامل
          </label>
          <input
            type="text"
            name="full_name"
            required
            minLength={3}
            style={{
              width: '100%',
              padding: '0.8rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '1rem',
            }}
            placeholder="اكتب الاسم الكامل"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
            التاريخ والوقت
          </label>
          <input
            type="datetime-local"
            name="datetime"
            required
            style={{
              width: '100%',
              padding: '0.8rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '1rem',
            }}
          />
          <small style={{ color: '#6b7280', display: 'block', marginTop: '0.4rem' }}>
            اختر بالتوقيت المحلي – النظام سيحفظ الوقت بـ UTC تلقائيًا
          </small>
        </div>

        <button
          type="submit"
          style={{
            padding: '1rem',
            background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          حفظ الموعد الجديد
        </button>
      </form>

      <p style={{ marginTop: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.95rem' }}>
        بعد الضغط على حفظ، ستتم إعادة التوجيه مع رسالة النتيجة.
        <br />
        إذا نجح الحفظ، اعمل refresh لترى الموعد الجديد في الجدول أعلاه.
      </p>
    </div>
  );
}
