// app/test-timezone/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

type AppointmentInput = {
  full_name: string;
  phone: string;
  date: string;
  time: string;
  reason?: string;
  status?: string;
};

export async function insertAppointmentAction(input: AppointmentInput) {
  try {
    // جمع التاريخ والوقت كوقت محلي
    const localDateTime = new Date(`\( {input.date}T \){input.time}:00`);

    // تحويل إلى UTC (طريقة بسيطة - قد تحتاج date-fns-tz لاحقًا للدقة مع DST)
    const utcDate = new Date(localDateTime.getTime() - localDateTime.getTimezoneOffset() * 60 * 1000);

    const { error } = await supabaseServer.from('appointments').insert({
      full_name: input.full_name,
      phone: input.phone,
      date_time: utcDate.toISOString(),
      reason: input.reason,
      status: input.status || 'confirmed',
    });

    if (error) throw error;

    // إعادة تحميل البيانات بعد الإضافة
    revalidatePath('/test-timezone');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ أثناء الإضافة' };
  }
}

export async function updateAppointmentAction(id: string, input: AppointmentInput) {
  try {
    const localDateTime = new Date(`\( {input.date}T \){input.time}:00`);
    const utcDate = new Date(localDateTime.getTime() - localDateTime.getTimezoneOffset() * 60 * 1000);

    const { error } = await supabaseServer
      .from('appointments')
      .update({
        full_name: input.full_name,
        phone: input.phone,
        date_time: utcDate.toISOString(),
        reason: input.reason,
        status: input.status,
      })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/test-timezone');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ أثناء التعديل' };
  }
}
