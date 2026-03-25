// app/dashboard/settings/bookingformsettings/actions.ts

'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function updateBookingFormSettings(
  formData: FormData
): Promise<ActionResult<null>> {
  const minNotice = Number(formData.get('min_booking_notice_minutes'));
  const daysAhead = Number(formData.get('booking_days_ahead'));

  if (!minNotice || !daysAhead) {
    return {
      success: false,
      error: 'البيانات غير صالحة',
    };
  }

  try {
    const { error } = await supabaseServer
      .from('business_settings')
      .update({
        min_booking_notice_minutes: minNotice,
        booking_days_ahead: daysAhead,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) throw error;

    revalidatePath('/dashboard/settings/bookingformsettings');

    return {
      success: true,
      data: null,
    };
  } catch (err: any) {
    console.error('updateBookingFormSettings error:', err);
    return {
      success: false,
      error: err.message || 'حدث خطأ أثناء حفظ الإعدادات',
    };
  }
}
