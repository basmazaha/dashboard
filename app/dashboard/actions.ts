// app/dashboard/actions.ts (ملف جديد للـ server actions)
'use server';

import { supabaseServer } from '@/lib/supabaseServer';

export async function updateAppointment(formData: FormData) {
  const id = formData.get('appointment_id') as string;
  const full_name = formData.get('full_name') as string | null;
  const phone = formData.get('phone') as string | null;
  const date = formData.get('date') as string | null;
  const time = formData.get('time') as string | null;
  const status = formData.get('status') as string | null;

  if (!id) return;

  const updates: Record<string, string> = {};

  if (full_name?.trim())    updates.full_name = full_name.trim();
  if (phone?.trim())        updates.phone = phone.trim();
  if (date)                 updates.appointment_date = date;
  if (time)                 updates.appointment_time = time;
  if (status)               updates.status = status;

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabaseServer
    .from('appointments')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('خطأ أثناء تحديث الموعد:', error);
  }
}
