// app/test-timezone/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import { zonedTimeToUtc } from 'date-fns-tz';

type AppointmentInput = {
  full_name: string;
  phone: string;
  date: string;   // '2026-03-09'
  time: string;   // '12:00'
  reason?: string;
  status?: string;
};

function parseLocalDateTime(dateStr: string, timeStr: string, tz: string): Date {
  // تقسيم التاريخ والوقت يدويًا عشان نتجنب مشاكل new Date() في السيرفر
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // إنشاء Date object باستخدام UTC أولاً، ثم نطبق الـ timezone
  const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  // تحويل الوقت المحلي إلى UTC بدقة
  return zonedTimeToUtc(localDate, tz);
}

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

    // تحويل يدوي آمن
    const utcDate = parseLocalDateTime(input.date, input.time, tz);

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

    const utcDate = parseLocalDateTime(input.date, input.time, tz);

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
