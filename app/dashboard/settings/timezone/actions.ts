// app/dashboard/settings/timezone/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export async function updateTimezone(formData: FormData) {
  const newTz = formData.get('timezone') as string;

  // التحقق البسيط من الإدخال
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
      console.error('خطأ من Supabase أثناء التحديث:', error);
      return {
        success: false,
        message: error.message || 'فشل تحديث المنطقة الزمنية',
      };
    }

    // نجاح → تحديث الصفحة
    revalidatePath('/dashboard/settings/timezone');

    return {
      success: true,
      message: 'تم حفظ المنطقة الزمنية بنجاح',
    };
  } catch (err: any) {
    console.error('خطأ غير متوقع أثناء حفظ المنطقة الزمنية:', err);
    return {
      success: false,
      message: 'حدث خطأ أثناء المحاولة، حاول مرة أخرى',
    };
  }
}
