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
  if (!time?.trim()) return '00:00:00';
  const cleaned = time.trim().replace(/\s+/g, '');
  const parts = cleaned.split(':');

  if (parts.length === 2) {
    return `\( {parts[0].padStart(2, '0')}: \){parts[1].padStart(2, '0')}:00`;
  }
  if (parts.length === 3) {
    return `\( {parts[0].padStart(2, '0')}: \){parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  }
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
  console.log('───── updateAppointment called ─────');
  console.log('FormData:', Object.fromEntries(formData));

  const id = formData.get('appointment_id') as string;
  const full_name = (formData.get('full_name') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const date = (formData.get('date') as string)?.trim() || null;
  const time = (formData.get('time') as string)?.trim() || null;
  const status = formData.get('status') as string | null;

  console.log({ id, full_name, phone, date, time, status });

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

  let date_time: string | null = null;
  if (date && time) {
    const fullTime = toFullTimeFormat(time);
    const localStr = `\( {date}T \){fullTime}`;

    console.log('محاولة تحويل →', { date, time, fullTime, localStr });

    const localDate = new Date(localStr);
    if (isNaN(localDate.getTime())) {
      console.error('فشل تحويل التاريخ:', localStr);
      return { error: 'صيغة التاريخ أو الوقت غير صالحة' };
    }

    date_time = localDate.toISOString();
    console.log('تم التحويل بنجاح →', date_time);
  }

  // التحقق من عدم التداخل
  if (status !== 'cancelled' && date_time) {
    const { data: existing, error } = await supabaseServer
      .from('appointments')
      .select('id, status, date_time')
      .eq('date_time', date_time);

    if (error) {
      console.error('خطأ في التحقق من التداخل:', error);
      return { error: 'خطأ في التحقق من توفر الموعد' };
    }

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

  if (error) {
    console.error('خطأ تحديث الموعد:', error);
    return { error: error.message || 'فشل التحديث' };
  }

  return { success: true };
}

export async function insertAppointment(formData: FormData) {
  console.log('───── insertAppointment called ─────');
  console.log('FormData:', Object.fromEntries(formData));

  const full_name = (formData.get('full_name') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const date = (formData.get('date') as string)?.trim() || null;
  const time = (formData.get('time') as string)?.trim() || null;
  const reason = (formData.get('reason') as string)?.trim() || null;
  const status = (formData.get('status') as string)?.trim() || 'confirmed';

  console.log({ full_name, phone, date, time, reason, status });

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

  if (Object.keys(errors).length > 0) {
    console.log('أخطاء التحقق:', errors);
    return { errors };
  }

  let date_time: string | null = null;
  if (date && time) {
    const fullTime = toFullTimeFormat(time);
    const localStr = `\( {date}T \){fullTime}`;

    console.log('محاولة تحويل →', { date, time, fullTime, localStr });

    const localDate = new Date(localStr);
    if (isNaN(localDate.getTime())) {
      console.error('فشل تحويل التاريخ:', localStr);
      return { error: 'صيغة التاريخ أو الوقت غير صالحة' };
    }

    date_time = localDate.toISOString();
    console.log('تم التحويل بنجاح →', date_time);
  }

  if (date_time) {
    const { data: existing, error } = await supabaseServer
      .from('appointments')
      .select('id, status, date_time')
      .eq('date_time', date_time);

    if (error) {
      console.error('خطأ في التحقق من التداخل:', error);
      return { error: 'خطأ في التحقق من توفر الموعد' };
    }

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

  console.log('البيانات التي سيتم إدراجها:', insertData);

  const { data, error } = await supabaseServer
    .from('appointments')
    .insert([insertData])
    .select('id, full_name, date_time, phone, reason, status')
    .single();

  if (error) {
    console.error('خطأ إدراج الموعد:', error);
    return { error: error.message || 'فشل إضافة الموعد' };
  }

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

  console.log('fetchAppointments → من:', todayUTC);

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
