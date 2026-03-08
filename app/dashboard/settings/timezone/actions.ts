// app/dashboard/settings/timezone/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export type FormState = {
  success: boolean;
  message: string;
};

export async function updateTimezone(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const newTz = formData.get('timezone') as string;

  // تحقق بسيط
  if (!newTz || !newTz.trim()) {
    return {
      success: false,
      message: 'يرجى اختيار منطقة زمنية صالحة',
    };
  }

  try {
    const { error } = await supabaseServer
      .from('business_settings')
      .update({
        timezone: newTz,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      console.error('خطأ Supabase:', error.message);
      return {
        success: false,
        message: error.message || 'فشل في تحديث الإعدادات',
      };
    }

    revalidatePath('/dashboard/settings/timezone');

    return {
      success: true,
      message: 'تم حفظ المنطقة الزمنية بنجاح',
    };
  } catch (err: any) {
    console.error('خطأ غير متوقع:', err);
    return {
      success: false,
      message: 'حدث خطأ أثناء المحاولة، حاول مرة أخرى',
    };
  }
}
