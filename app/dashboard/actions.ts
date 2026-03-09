// app/dashboard/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';

type Appointment = {
  id: string;
  full_name: string | null;
  date_time: string | null; // ISO string in UTC
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
    return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0') + ':00';
  }
  if (parts.length === 3) return time;
  return '00:00:00';
}

async function getBusinessTimezone() {
  const { data, error } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  if (error) {
    console.error('Error fetching timezone:', error);
    return 'Africa/Cairo';
  }

  return data?.timezone || 'Africa/Cairo';
}

export async function updateAppointment(formData: FormData) {
  const id = formData.get('appointment_id') as string;
  const full_name = (formData.get('full_name') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const date = formData.get('date') as string | null;
  const time = formData.get('time') as string | null;
  const status = formData.get('status') as string | null;

  if (!id) return { error: 'لا يوجد معرف للموعد' };

  const errors: Record<string, string> = {};

  if (!full_name) errors.full_name = 'الاسم مطلوب';
  else if (full_name.length < 3) errors.full_name = 'الاسم يجب أن يكون 3 حروف على الأقل';

  if (!phone) errors.phone = 'رقم التليفون مطلوب';
  else {
    const digits = phone.replace(/\s+/g, '');
    if (!/^\+?[0-9]+$/.test(digits)) errors.phone = 'رقم التليفون يجب أن يحتوي أرقام فقط أو +';
    else if (digits.length > 20) errors.phone = 'رقم التليفون لا يجب أن يتجاوز 20 رقم';
  }

  if (Object.keys(errors).length > 0) return { errors };

  const timezone = await getBusinessTimezone();

  let date_time: string | null = null;
  if (date && time) {
    const fullTime = toFullTimeFormat(time);
    // التاريخ/الوقت المحلي حسب timezone من الجدول
    const localDateTime = new Date(`\( {date}T \){fullTime}`);
    // تحويل إلى UTC ISO
    date_time = localDateTime.toISOString();
  }

  // التحقق من عدم التداخل
  if (status !== 'cancelled' && date_time) {
    const { data: existing, error } = await supabaseServer
      .from('appointments')
      .select('id, status, date_time')
      .eq('date_time', date_time);

    if (error) return { error: 'خطأ في التحقق من توفر الموعد' };

    if (existing?.some(a => a.status !== 'cancelled' && a.id !== id)) {
      return { error: 'هذا الوقت محجوز بالفعل' };
    }
  }

  const updates: Record<string, any> = { full_name, phone };

  if (status === 'cancelled') {
    updates.status = 'cancelled';
    updates.date_time = null;
    updates.reminder_sent_6h = false;
  } else {
    if (date_time) updates.date_time = date_time;
    if (status) {
      updates.status = status;
      if (status === 'rescheduled') updates.reminder_sent_6h = false;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { message: 'لا توجد تغييرات' };
  }

  const { error } = await supabaseServer
    .from('appointments')
    .update(updates)
    .eq('id', id);

  if (error) return { error: error.message || 'فشل التحديث' };

  return { success: true };
}

export async function insertAppointment(formData: FormData) {
  const full_name = (formData.get('full_name') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const date = formData.get('date') as string | null;
  const time = formData.get('time') as string | null;
  const reason = formData.get('reason') as string | null;
  const status = (formData.get('status') as string) || 'confirmed';

  const errors: Record<string, string> = {};

  if (!full_name) errors.full_name = 'الاسم مطلوب';
  else if (full_name.length < 3) errors.full_name = 'الاسم يجب أن يكون 3 حروف على الأقل';

  if (!phone) errors.phone = 'رقم التليفون مطلوب';
  else {
    const digits = phone.replace(/\s+/g, '');
    if (!/^\+?[0-9]+$/.test(digits)) errors.phone = 'رقم التليفون يجب أن يحتوي أرقام فقط أو +';
    else if (digits.length > 20) errors.phone = 'رقم التليفون لا يجب أن يتجاوز 20 رقم';
  }

  if (!date) errors.date = 'التاريخ مطلوب';
  if (!time) errors.time = 'الوقت مطلوب';

  if (Object.keys(errors).length > 0) return { errors };

  const timezone = await getBusinessTimezone();

  let date_time: string | null = null;
  if (date && time) {
    const fullTime = toFullTimeFormat(time);
    const localDateTime = new Date(`\( {date}T \){fullTime}`);
    date_time = localDateTime.toISOString();
  }

  if (date_time) {
    const { data: existing, error } = await supabaseServer
      .from('appointments')
      .select('id, status, date_time')
      .eq('date_time', date_time);

    if (error) return { error: 'خطأ في التحقق من توفر الموعد' };

    if (existing?.length > 0) {
      return { error: 'هذا الوقت محجوز بالفعل' };
    }
  }

  const insertData = {
    full_name,
    phone,
    date_time,
    reason: reason || null,
    status,
    reminder_sent_6h: false,
  };

  const { data, error } = await supabaseServer
    .from('appointments')
    .insert([insertData])
    .select('id, full_name, date_time, phone, reason, status')
    .single();

  if (error) return { error: error.message || 'فشل إضافة الموعد' };

  return { success: true, newAppointment: data };
}

export async function fetchAppointments() {
  const timezone = await getBusinessTimezone();

  const todayLocal = new Date().toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).split('/').reverse().join('-') + 'T00:00:00';

  const todayUTC = new Date(todayLocal).toISOString();

  const { data, error } = await supabaseServer
    .from('appointments')
    .select('id, full_name, date_time, phone, reason, status')
    .gte('date_time', todayUTC)
    .order('date_time', { ascending: true })
    .limit(50);

  if (error) {
    console.error('خطأ في جلب المواعيد:', error);
    return { error: error.message, appointments: [] as Appointment[] };
  }

  return { appointments: data ?? [] };
}
