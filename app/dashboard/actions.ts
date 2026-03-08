// app/dashboard/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { type Appointment, type WorkingHour } from './types';

// ────────────────────────────────────────────────
// تعريف الأنواع هنا مباشرة داخل الملف
// ────────────────────────────────────────────────

export type Appointment = {
  id: string;
  full_name: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  phone: string | null;
  reason: string | null;
  status: string | null;
};

export interface WorkingHour {
  day_of_week: number;
  is_open: boolean;
  start_time: string | null;
  end_time: string | null;
  slot_duration_minutes: number | null;
  break_start: string | null;
  break_end: string | null;
}

// ────────────────────────────────────────────────
// دوال مساعدة لتنسيق الوقت
// ────────────────────────────────────────────────

function normalizeTime(time: string | null): string {
  if (!time) return '';
  return time.split(':').slice(0, 2).join(':');
}

function toFullTimeFormat(time: string | null): string {
  if (!time) return '00:00:00';
  const parts = time.split(':');
  if (parts.length === 2) {
    return `\( {parts[0].padStart(2, '0')}: \){parts[1].padStart(2, '0')}:00`;
  }
  if (parts.length === 3) return time;
  return '00:00:00';
}

// ────────────────────────────────────────────────
// تعديل موعد موجود
// ────────────────────────────────────────────────

export async function updateAppointment(formData: FormData) {
  const id = formData.get('appointment_id') as string;
  const full_name = (formData.get('full_name') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const date = formData.get('date') as string | null;
  const time = formData.get('time') as string | null;
  const status = formData.get('status') as string | null;

  if (!id) {
    return { error: 'لا يوجد معرف للموعد' };
  }

  const errors: Record<string, string> = {};

  if (!full_name) errors.full_name = 'الاسم الكامل مطلوب';
  if (!phone) errors.phone = 'رقم التليفون مطلوب';
  if (!date) errors.date = 'التاريخ مطلوب';
  if (!time) errors.time = 'الوقت مطلوب';

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const { error } = await supabaseServer
    .from('appointments')
    .update({
      full_name,
      phone,
      appointment_date: date,
      appointment_time: toFullTimeFormat(time),
      status: status || 'pending',
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// ────────────────────────────────────────────────
// إضافة موعد جديد
// ────────────────────────────────────────────────

export async function insertAppointment(formData: FormData) {
  const full_name = (formData.get('full_name') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const date = formData.get('date') as string | null;
  const time = formData.get('time') as string | null;
  const reason = formData.get('reason') as string | null;

  const errors: Record<string, string> = {};

  if (!full_name) errors.full_name = 'الاسم الكامل مطلوب';
  if (!phone) errors.phone = 'رقم التليفون مطلوب';
  if (!date) errors.date = 'التاريخ مطلوب';
  if (!time) errors.time = 'الوقت مطلوب';

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const { data, error } = await supabaseServer
    .from('appointments')
    .insert({
      full_name,
      phone,
      appointment_date: date,
      appointment_time: toFullTimeFormat(time),
      reason,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  return { success: true, id: data?.id };
}

// ────────────────────────────────────────────────
// جلب جميع المواعيد
// ────────────────────────────────────────────────

export async function fetchAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabaseServer
    .from('appointments')
    .select('id, full_name, appointment_date, appointment_time, phone, reason, status')
    .order('appointment_date', { ascending: true })
    .limit(100);   // يمكنك تعديل الحد حسب الحاجة

  if (error) {
    console.error('خطأ في جلب المواعيد:', error);
    return [];
  }

  return data || [];
}

// ────────────────────────────────────────────────
// جلب أيام العطل
// ────────────────────────────────────────────────

export async function fetchOffDays(): Promise<string[]> {
  const { data, error } = await supabaseServer
    .from('off_days')
    .select('date')
    .order('date', { ascending: true });

  if (error) {
    console.error('خطأ في جلب أيام العطل:', error);
    return [];
  }

  return data?.map(row => row.date) || [];
}

// ────────────────────────────────────────────────
// جلب ساعات العمل
// ────────────────────────────────────────────────

export async function fetchWorkingHours(): Promise<WorkingHour[]> {
  const { data, error } = await supabaseServer
    .from('working_hours')
    .select('day_of_week, is_open, start_time, end_time, slot_duration_minutes, break_start, break_end')
    .order('day_of_week', { ascending: true });

  if (error) {
    console.error('خطأ في جلب ساعات العمل:', error);
    return [];
  }

  return data || [];
}
