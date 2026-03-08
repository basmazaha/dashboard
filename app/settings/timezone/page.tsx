// app/settings/timezone/page.tsx
import { supabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import './SettingsPage.css';

const COMMON_TIMEZONES = [
  { value: 'Africa/Cairo', label: 'القاهرة (UTC+2/+3)' },
  { value: 'Asia/Riyadh', label: 'الرياض (UTC+3)' },
  { value: 'Asia/Dubai', label: 'دبي (UTC+4)' },
  { value: 'Europe/Istanbul', label: 'إسطنبول (UTC+3)' },
  { value: 'America/New_York', label: 'نيويورك (UTC-5/-4)' },
  { value: 'UTC', label: 'UTC' },
  // يمكنك إضافة المزيد حسب الحاجة
];

export default async function SettingsPage() {
  const supabase = supabaseServer;

  const { data: settings } = await supabase
    .from('business_settings')
    .select('timezone')
    .eq('id', 1)
    .single();

  const currentTz = settings?.timezone || 'Africa/Cairo';

  return (
    <div className="settings-page">
      <div className="settings-page__container">
        <header className="settings-page__header">
          <h1 className="settings-page__title">إعدادات الشركة</h1>
          <p className="settings-page__description">
            تعديل المنطقة الزمنية الافتراضية للأعمال
          </p>
        </header>

        <form
          className="settings-form"
          action={async (formData: FormData) => {
            'use server';

            const newTz = formData.get('timezone') as string;

            const { error } = await supabaseServer
              .from('business_settings')
              .update({ timezone: newTz })
              .eq('id', 1);

            if (!error) {
              redirect('/settings/timezone?success=true');
            } else {
              console.error('خطأ أثناء حفظ الإعدادات:', error);
              // يمكنك إضافة طريقة عرض خطأ لاحقًا (مثل إعادة توجيه مع ?error)
            }
          }}
        >
          <div className="settings-form__group">
            <label htmlFor="timezone" className="settings-form__label">
              المنطقة الزمنية
            </label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={currentTz}
              className="settings-form__select"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="settings-form__submit">
            حفظ التغييرات
          </button>
        </form>
      </div>
    </div>
  );
}
