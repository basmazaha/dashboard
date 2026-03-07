// app/dashboard/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';

export async function updateAppointment(formData: FormData) {
  const id = formData.get('appointment_id') as string;
  const full_name = formData.get('full_name') as string | null;
  const phone = formData.get('phone') as string | null;
  const date = formData.get('date') as string | null;
  const time = formData.get('time') as string | null;
  const status = formData.get('status') as string | null;

  if (!id) {
    return { error: 'لا يوجد معرف للموعد' };
  }

  const updates: Record<string, any> = {};

  if (status === 'cancelled') {
    updates.status = 'cancelled';
    updates.appointment_date = null;
    updates.appointment_time = null;
  } else {
    if (full_name?.trim())    updates.full_name = full_name.trim();
    if (phone?.trim())        updates.phone = phone.trim();
    if (date)                 updates.appointment_date = date;
    if (time)                 updates.appointment_time = time;
    if (status)               updates.status = status;
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

// إضافة action جديد لإعادة جلب المواعيد
export async function fetchAppointments() {
  const { data: appointments, error } = await supabaseServer
    .from('appointments')
    .select('id, full_name, appointment_date, appointment_time, phone, reason, status')
    .order('appointment_date', { ascending: true })
    .limit(50);

  if (error) {
    console.error('خطأ في جلب المواعيد:', error);
    return { error: error.message };
  }

  return { appointments };
}
