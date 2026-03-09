// app/test-timezone/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { fromZonedTime } from 'date-fns-tz';  // ← الاسم الجديد في v3+

type AppointmentInput = {
  full_name: string;
  phone: string;
  date: string;   // 'YYYY-MM-DD'
  time: string;   // 'HH:mm'
  reason?: string;
  status?: string;
};

export async function insertAppointmentAction(input: AppointmentInput) {
  try {
    // جلب timezone العيادة
    const { data: settings, error: tzError } = await supabaseServer
      .from('business_settings')
      .select('timezone')
      .single();

    if (tzError || !settings?.timezone) {
      throw new Error('لم يتم العثور على timezone في business_settings');
    }

    const tz = settings.timezone;

    // إنشاء تاريخ محلي كامل
    const localDateTimeStr = `\( {input.date}T \){input.time}:00`;

    // تحويل الوقت المحلي إلى UTC بدقة (الاسم الجديد)
    const localDate = new Date(localDateTimeStr);
    const utcDate = fromZonedTime(localDate, tz);

    const { error } = await supabaseServer.from('appointments').insert({
      full_name: input.full_name,
      phone: input.phone,
      date_time: utcDate.toISOString(),
      reason: input.reason,
      status: input.status || 'confirmed',
    });

    if (error) throw error;

    revalidatePath('/test-timezone');

    return { success: true };
  } catch (err: any) {
    console.error('Insert error:', err);
    return { success: false, error: err.message || 'خطأ أثناء الإضافة' };
  }
}

export async function updateAppointmentAction(id: string, input: AppointmentInput) {
  try {
    const { data: settings } = await supabaseServer
      .from('business_settings')
      .select('timezone')
      .single();

    const tz = settings?.timezone || 'Africa/Cairo';

    const localDateTimeStr = `\( {input.date}T \){input.time}:00`;
    const localDate = new Date(localDateTimeStr);
    const utcDate = fromZonedTime(localDate, tz);

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
    return { success: false, error: err.message || 'خطأ أثناء التعديل' };
  }
}
