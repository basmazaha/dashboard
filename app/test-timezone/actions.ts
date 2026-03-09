// app/test-timezone/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { fromZonedTime } from 'date-fns-tz';  // الدالة الصحيحة في v3+

type AppointmentInput = {
  full_name: string;
  phone: string;
  date: string;   // '2026-03-09'
  time: string;   // '12:00'
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

    // بناء التاريخ والوقت يدويًا لتجنب أي مشاكل في new Date()
    const [year, month, day] = input.date.split('-').map(Number);
    const [hour, minute] = input.time.split(':').map(Number);

    // إنشاء Date محلي باستخدام Date.UTC (آمن في السيرفر)
    const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

    // تحويل الوقت المحلي إلى UTC بدقة
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

    const [year, month, day] = input.date.split('-').map(Number);
    const [hour, minute] = input.time.split(':').map(Number);

    const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
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
