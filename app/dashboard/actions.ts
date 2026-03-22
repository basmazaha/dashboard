// dashboard/app/dashboard/actions.ts

'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { format, parse } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

type Appointment = {
  id: string;
  full_name: string | null;
  date_time: string | null;   // timestamptz ISO string (UTC)
  phone: string | null;
  reason: string | null;
  status: string | null;
};

type WorkingHour = {
  day_of_week: number;
  is_open: boolean;
  start_time: string | null;
  end_time: string | null;
  slot_duration_minutes: number | null;
  break_start: string | null;
  break_end: string | null;
};

export async function updateAppointment(formData: FormData, businessTimezone: string) {
  const id = formData.get('appointment_id') as string;
  const full_name = (formData.get('full_name') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const dateStr = formData.get('date') as string | null;     // YYYY-MM-DD
  const timeStr = formData.get('time') as string | null;     // HH:mm
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

  let date_time: string | null = null;

  if (dateStr && timeStr && status !== 'cancelled') {
    try {
      const localDateTimeStr = `${dateStr} ${timeStr}:00`;
      const zonedDate = parse(localDateTimeStr, 'yyyy-MM-dd HH:mm:ss', new Date());
      const utcDate = fromZonedTime(zonedDate, businessTimezone);
      date_time = utcDate.toISOString();
    } catch (err) {
      console.error('خطأ في تحويل التاريخ/الوقت إلى UTC:', err);
      return { error: 'صيغة التاريخ أو الوقت غير صحيحة' };
    }
  }

  // التحقق من عدم التداخل في نفس اليوم + نفس الدقيقة
  if (status !== 'cancelled' && date_time) {
    const targetDateLocal = toZonedTime(date_time, businessTimezone);
    const targetDateOnly = format(targetDateLocal, 'yyyy-MM-dd');
    const targetTimeOnly = format(targetDateLocal, 'HH:mm');

    const { data: existing, error } = await supabaseServer
      .from('appointments')
      .select('id, status, date_time')
      .gte('date_time', `${targetDateOnly}T00:00:00Z`)
      .lt('date_time', `${targetDateOnly}T23:59:59Z`);

    if (error) {
      console.error('خطأ في التحقق من التداخل:', error);
      return { error: 'خطأ في التحقق من توفر الموعد' };
    }

    const conflict = existing?.some(a => {
      if (a.status === 'cancelled' || a.id === id) return false;
      if (!a.date_time) return false;

      const existingZoned = toZonedTime(a.date_time, businessTimezone);
      const existingTime = format(existingZoned, 'HH:mm');

      return existingTime === targetTimeOnly;
    });

    if (conflict) {
      return { error: 'هذا الوقت محجوز بالفعل' };
    }
  }

  const updates: Record<string, any> = { full_name, phone };

  if (status === 'cancelled' || status === 'absent') {
    updates.status = status;
    updates.manage_token = null;
    updates.reminder_sent_6h = false;
  } else {
    if (date_time !== null) updates.date_time = date_time;
    if (status) {
      updates.status = status;
      if (status === 'rescheduled') updates.reminder_sent_6h = false;
    }
  }

  if (Object.keys(updates).length <= 2) { // فقط full_name + phone بدون تغييرات جوهرية
    return { message: 'لا توجد تغييرات جوهرية' };
  }

  const { error } = await supabaseServer
    .from('appointments')
    .update(updates)
    .eq('id', id);

  if (error) return { error: error.message || 'فشل التحديث' };

  return { success: true };
}

export async function insertAppointment(formData: FormData, businessTimezone: string) {
  const full_name = (formData.get('full_name') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const dateStr = formData.get('date') as string | null;
  const timeStr = formData.get('time') as string | null;
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

  if (!dateStr) errors.date = 'التاريخ مطلوب';
  if (!timeStr) errors.time = 'الوقت مطلوب';

  if (Object.keys(errors).length > 0) return { errors };

  let date_time: string | null = null;

  try {
    const localDateTimeStr = `${dateStr} ${timeStr}:00`;
    const zonedDate = parse(localDateTimeStr, 'yyyy-MM-dd HH:mm:ss', new Date());
    const utcDate = fromZonedTime(zonedDate, businessTimezone);
    date_time = utcDate.toISOString();
  } catch (err) {
    console.error('خطأ في تحويل التاريخ/الوقت إلى UTC:', err);
    return { error: 'صيغة التاريخ أو الوقت غير صحيحة' };
  }

  // التحقق من عدم التداخل
  if (date_time) {
    const targetDateLocal = toZonedTime(date_time, businessTimezone);
    const targetDateOnly = format(targetDateLocal, 'yyyy-MM-dd');
    const targetTimeOnly = format(targetDateLocal, 'HH:mm');

    const { data: existing, error } = await supabaseServer
      .from('appointments')
      .select('id, status, date_time')
      .gte('date_time', `${targetDateOnly}T00:00:00Z`)
      .lt('date_time', `${targetDateOnly}T23:59:59Z`);

    if (error) return { error: 'خطأ في التحقق من توفر الموعد' };

    const conflict = existing?.some(a => {
      if (a.status === 'cancelled') return false;
      if (!a.date_time) return false;

      const exZoned = toZonedTime(a.date_time, businessTimezone);
      const exTime = format(exZoned, 'HH:mm');

      return exTime === targetTimeOnly;
    });

    if (conflict) return { error: 'هذا الوقت محجوز بالفعل' };
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

export async function fetchAppointments(
  businessTimezone: string,
  page: number = 1,
  pageSize: number = 20
) {
  const today = new Date().toISOString().split('T')[0];

  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  // حساب العدد الكلي للمواعيد (مهم لحساب عدد الصفحات)
  const { count, error: countError } = await supabaseServer
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .gte('date_time', `${today}T00:00:00Z`);

  if (countError) {
    console.error('خطأ في حساب العدد الكلي للمواعيد:', countError);
    return { 
      error: countError.message, 
      appointments: [], 
      totalCount: 0 
    };
  }

  const totalCount = count ?? 0;

  // جلب المواعيد الخاصة بالصفحة المطلوبة فقط
  const { data, error } = await supabaseServer
    .from('appointments')
    .select('id, full_name, date_time, phone, reason, status')
    .gte('date_time', `${today}T00:00:00Z`)
    .order('date_time', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('خطأ في جلب المواعيد:', error);
    return { 
      error: error.message, 
      appointments: [], 
      totalCount: 0 
    };
  }

  return {
    appointments: data ?? [],
    totalCount,
    page,
    pageSize,
  };
  }

// ──────────────────────────────────────────────
// دالة جديدة لجلب الـ timezone من جدول business_settings
// ──────────────────────────────────────────────

export async function getBusinessTimezone() {
  const { data, error } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .limit(1)
    .single();

  if (error) {
    console.error('خطأ في جلب الـ timezone:', error);
    return 'Africa/Cairo'; // fallback إذا حصل خطأ
  }

  return data?.timezone || 'Africa/Cairo';
}
