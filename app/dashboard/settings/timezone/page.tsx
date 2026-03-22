// app/dashboard/settings/timezone/page.tsx
import { supabaseServer } from '@/lib/supabaseServer';
import TimezoneForm from './TimezoneForm';
import './TimezonePage.css';

export default async function TimezoneSettingsPage() {
  const { data: settings, error } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .eq('id', 1)
    .single();

  if (error || !settings) {
    console.error('Error fetching timezone setting:', error);
    // fallback
    return (
      <div className="settings-page__error">
        حدث خطأ أثناء تحميل الإعدادات، حاول مرة أخرى لاحقًا.
      </div>
    );
  }

  return <TimezoneForm initialTimezone={settings.timezone || 'Africa/Cairo'} />;
}
