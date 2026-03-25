// app/dashboard/settings/timezone/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function updateTimezone(formData: FormData): Promise<ActionResult<null>> {
  const newTz = formData.get('timezone') as string;

  if (!newTz || !newTz.trim()) {
    return {
      success: false,
      error: 'يرجى اختيار منطقة زمنية صالحة',
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

    if (error) throw error;

    revalidatePath('/dashboard/settings/timezone');

    return {
      success: true,
      data: null,
    };
  } catch (err: any) {
    console.error('updateTimezone error:', err);
    return {
      success: false,
      error: err.message || 'حدث خطأ أثناء حفظ المنطقة الزمنية',
    };
  }
}
