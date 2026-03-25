// app/dashboard/settings/bookingformsettings/page.tsx

import { supabaseServer } from '@/lib/supabaseServer';
import BookingFormSettingsForm from './BookingFormSettingsForm';
import './BookingFormSettingsPage.css';

export default async function BookingFormSettingsPage() {

  const { data, error } = await supabaseServer
    .from('business_settings')
    .select(`
      min_booking_notice_min,
      min_booking_notice_minutes,
      booking_days_ahead
    `)
    .eq('id', 1)
    .single();

  if (error || !data) {

    console.error(error);

    return (
      <div className="booking-page__error">
        حدث خطأ أثناء تحميل الإعدادات
      </div>
    );

  }

  return (
    <BookingFormSettingsForm
      minBookingNoticeHours={data.min_booking_notice_min ?? 1}
      minBookingNoticeMinutes={data.min_booking_notice_minutes ?? 1}
      bookingDaysAhead={data.booking_days_ahead ?? 30}
    />
  );
}
