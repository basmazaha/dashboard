// app/dashboard/settings/bookingformsettings/actions.ts

'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export type FormState = {
  success: boolean;
  message: string;
  minNotice?: number;
  daysAhead?: number;
};

export async function updateBookingFormSettings(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {

  const minNotice = Number(formData.get('min_booking_notice_minutes'));
  const daysAhead = Number(formData.get('booking_days_ahead'));

  if (!minNotice || !daysAhead) {
    return {
      success: false,
      message: 'البيانات غير صالحة',
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

    if (error) {
      console.error('Supabase update error:', error);

      return {
        success: false,
        message: 'فشل حفظ الإعدادات',
      };
    }

    revalidatePath('/dashboard/settings/bookingformsettings');

    return {
      success: true,
      message: 'تم حفظ الإعدادات بنجاح',
      minNotice,
      daysAhead,
    };

  } catch (err) {

    console.error(err);

    return {
      success: false,
      message: 'حدث خطأ أثناء الحفظ',
    };
  }
}
