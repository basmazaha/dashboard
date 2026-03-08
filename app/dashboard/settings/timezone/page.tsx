// app/dashboard/settings/timezone/page.tsx
// هذه صفحة Server Component (لا نضع 'use client' هنا)

import { supabaseServer } from '@/lib/supabaseServer';
import TimezoneForm from './TimezoneForm';
import './SettingsPage.css';

export default async function TimezoneSettingsPage() {
  const { data: settings, error } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('خطأ في جلب الإعدادات:', error);
    // يمكنك عرض صفحة خطأ أو fallback
    return <div>حدث خطأ أثناء تحميل الإعدادات</div>;
  }

  const initialTimezone = settings?.timezone || 'Africa/Cairo';

  return (
    <div className="settings-page">
      <div className="settings-page__container">
        <header className="settings-page__header">
          <h1 className="settings-page__title">إعدادات المنطقة الزمنية</h1>
          <p className="settings-page__description">
            اختر التوقيت المحلي الافتراضي للشركة
          </p>
        </header>

        <TimezoneForm initialTimezone={initialTimezone} />
      </div>
    </div>
  );
}
