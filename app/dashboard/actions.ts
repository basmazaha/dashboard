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
  return time.split(':').slice(0, 2).join(':');
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
  const date = formData.get('date') as string | null;
  const time = formData.get('time') as string | null;
  const status = formData.get('status') as string | null;

  if (!id) {
    return { error: 'لا يوجد معرف للموعد' };
  }

  // تنظيف وتحقق من الحقول الإجبارية
  full_name = full_name?.trim() ?? null;
  phone = phone?.trim() ?? null;

  if (!full_name || full_name.length < 2) {
    return { error: 'اسم المريض مطلوب ويجب أن يكون أكثر من حرفين' };
  }

  if (!phone || phone.length < 10) {
    return { error: 'رقم التليفون مطلوب ويجب أن يكون صالحًا (10 أرقام على الأقل)' };
  }

  const updates: Record<string, any> = {};

  if (status === 'cancelled') {
    updates.status = 'cancelled';
    updates.appointment_date = null;
    updates.appointment_time = null;
  } else if (status === 'rescheduled') {
    updates.status = 'rescheduled';
    updates.reminder_sent_6h = false;  // ← إعادة تعيين التنبيه عند إعادة الجدولة
    if (date) updates.appointment_date = date;
    if (time) updates.appointment_time = toFullTimeFormat(time);
  } else {
    if (full_name) updates.full_name = full_name;
    if (phone) updates.phone = phone;
    if (date) updates.appointment_date = date;
    if (time) updates.appointment_time = toFullTimeFormat(time);
    if (status) updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return { message: 'لا توجد تغييرات' };
  }

  const { error } = await supabaseServer
    .from('appointments')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('خطأ أثناء تحديث الموعد:', error);
    return { error: error.message };
  }

  return { success: true };
}

export async function fetchAppointments() {
  const { data: appointments, error } = await supabaseServer
    .from('appointments')
    .select('id, full_name, appointment_date, appointment_time, phone, reason, status')
    .order('appointment_date', { ascending: true })
    .limit(50);

  if (error) {
    console.error('خطأ في جلب المواعيد:', error);
    return { error: error.message, appointments: [] as Appointment[] };
  }

  return { appointments: (appointments ?? []) as Appointment[] };
}
