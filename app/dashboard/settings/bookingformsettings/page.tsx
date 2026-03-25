/* app/dashboard/settings/bookingformsettings/page.tsx */

import { supabaseServer } from '@/lib/supabaseServer';
import BookingFormSettingsForm from './BookingFormSettingsForm';
import './BookingFormSettingsPage.css';

export default async function BookingFormSettingsPage() {
  const { data: settings, error } = await supabaseServer
    .from('business_settings')
    .select('min_booking_notice_minutes, booking_days_ahead')
    .eq('id', 1)
    .single();

  if (error || !settings) {
    console.error('Error fetching booking form settings:', error);

    return (
      <div className="bookingform-page__error">
        حدث خطأ أثناء تحميل الإعدادات، حاول مرة أخرى لاحقًا.
      </div>
    );
  }

  return (
    <BookingFormSettingsForm
      initialMinNotice={settings.min_booking_notice_minutes || 1}
      initialDaysAhead={settings.booking_days_ahead || 30}
    />
  );
}
