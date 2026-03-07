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

// نفس الدالة المساعدة
const normalizeTimeForDb = (time: string | null): string | null => {
  if (!time) return null;
  if (time.length === 5) return `${time}:00`;
  if (time.length === 8) return time;
  return time;
};

export async function updateAppointment(formData: FormData) {
  const id = formData.get('appointment_id') as string;
  let full_name = formData.get('full_name') as string | null;
  let phone = formData.get('phone') as string | null;
  let date = formData.get('date') as string | null;
  let time = formData.get('time') as string | null; // يأتي كـ "HH:MM"
  const status = formData.get('status') as string | null;

  if (!id) return { error: 'لا يوجد معرف للموعد' };

  // تحويل الوقت إلى صيغة Supabase (time → HH:MM:00)
  const dbTime = normalizeTimeForDb(time);

  // التحقق من عدم التداخل
  if (status !== 'cancelled' && date && dbTime) {
    const { data: existing, error: checkError } = await supabaseServer
      .from('appointments')
      .select('id, status')
      .eq('appointment_date', date)
      .eq('appointment_time', dbTime)
      .neq('id', id);

    if (checkError) {
      console.error('خطأ في التحقق من التداخل:', checkError);
      return { error: 'خطأ في التحقق من توفر الموعد' };
    }

    const isDoubleBooked = existing?.some(appt => appt.status !== 'cancelled');

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
    console.error('خطأ تحديث الموعد:', error);
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
    console.error('خطأ جلب المواعيد:', error);
    return { error: error.message, appointments: [] as Appointment[] };
  }

  // اختياري: نُقصّر الوقت عند الجلب ليتوافق مع الـ client
  const normalized = (data ?? []).map(row => ({
    ...row,
    appointment_time: normalizeTimeForDb(row.appointment_time),
  }));

  return { appointments: normalized as Appointment[] };
}
