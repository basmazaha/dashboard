'use server';

import { supabaseServer } from '@/lib/supabaseServer';

type Appointment = {
  id: string;
  full_name: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  phone: string | null;
  reason: string | null;
  status: string | null;
};

function normalizeTime(time: string | null): string {
  if (!time) return '';
  return time.split(':').slice(0, 2).join(':'); // HH:MM:SS → HH:MM
}

function toFullTimeFormat(time: string | null): string {
  if (!time) return '00:00:00';
  const parts = time.split(':');
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  }
  if (parts.length === 3) return time;
  return '00:00:00';
}

export async function updateAppointment(formData: FormData) {
  const id = formData.get('appointment_id') as string;
  let full_name = formData.get('full_name') as string | null;
  let phone = formData.get('phone') as string | null;
  let date = formData.get('date') as string | null;
  let time = formData.get('time') as string | null;
  let status = formData.get('status') as string | null;

  if (!id) return { error: 'لا يوجد معرف للموعد' };

  // تحويل الوقت إلى صيغة time كاملة (HH:MM:00)
  const dbTime = time ? toFullTimeFormat(time) : null;

  // التحقق من عدم الحجز المزدوج
  if (status !== 'cancelled' && date && dbTime) {
    const { data: existing, error: checkError } = await supabaseServer
      .from('appointments')
      .select('id, status, appointment_time')
      .eq('appointment_date', date);

    if (checkError) {
      console.error('خطأ في التحقق:', checkError);
      return { error: 'خطأ في التحقق من التوفر' };
    }

    const isDoubleBooked = existing?.some(appt => 
      appt.status !== 'cancelled' &&
      appt.id !== id &&
      normalizeTime(appt.appointment_time) === normalizeTime(time)
    );

    if (isDoubleBooked) {
      return { error: 'هذا الوقت محجوز بالفعل في التاريخ المحدد' };
    }
  }

  const updates: Record<string, any> = {};

  if (status === 'cancelled') {
    updates.status = 'cancelled';
    updates.appointment_date = null;
    updates.appointment_time = null;
  } else {
    if (full_name?.trim()) updates.full_name = full_name.trim();
    if (phone?.trim())     updates.phone = phone.trim();
    if (date)              updates.appointment_date = date;
    if (dbTime)            updates.appointment_time = dbTime;
    if (status)            updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return { message: 'لا توجد تغييرات' };
  }

  const { error } = await supabaseServer
    .from('appointments')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('خطأ تحديث:', error);
    return { error: error.message };
  }

  return { success: true };
}

export async function fetchAppointments() {
  const { data, error } = await supabaseServer
    .from('appointments')
    .select('id, full_name, appointment_date, appointment_time, phone, reason, status')
    .order('appointment_date', { ascending: true })
    .limit(50);

  if (error) {
    console.error('خطأ جلب:', error);
    return { error: error.message, appointments: [] as Appointment[] };
  }

  // نُرجع البيانات مع تنظيف الوقت (اختياري – للتوافق)
  const normalized = (data ?? []).map(appt => ({
    ...appt,
    appointment_time: normalizeTime(appt.appointment_time),
  }));

  return { appointments: normalized as Appointment[] };
}
