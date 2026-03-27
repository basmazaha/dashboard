// app/dashboard/settings/timezone/page.tsx

import { supabaseServer } from '@/lib/supabaseServer';
import TimezoneForm from './TimezoneForm';
import { DEFAULT_TIMEZONE } from '@/lib/timezone';
import '../SettingsDashboard.css';

export default async function TimezoneSettingsPage() {
  const { data: settings, error } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Error fetching timezone setting:', error);
  }

  const timezone = settings?.timezone || DEFAULT_TIMEZONE;

  return <TimezoneForm initialTimezone={timezone} />;
}
