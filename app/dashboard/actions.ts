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
  const full_name_input = formData.get('full_name') as string | null;
  const phone_input = formData.get('phone') as string | null;
  const date = formData.get('date') as string | null;
  const time = formData.get('time') as string | null;
  const status = formData.get('status') as string | null;

  if (!id) {
    return { error: 'لا يوجد معرف للموعد' };
  }

  // تنظيف المدخلات
  const full_name = full_name_input ? full_name_input.trim() : '';
  const phone = phone_input ? phone_input.trim() : '';

  // ── Validation ───────────────────────────────────────────────────────
  const errors: Record<string, string> = {};

  if (!full_name) {
    errors.full_name = 'الاسم مطلوب';
  } else if (full_name.length < 3) {
    errors.full_name = 'الاسم يجب أن يكون 3 حروف على الأقل';
  }

  if (!phone) {
    errors.phone = 'رقم التليفون مطلوب';
  } else {
    const phoneDigits = phone.replace(/\s+/g, '');
    if (!/^\+?[0-9]+$/.test(phoneDigits)) {
      errors.phone = 'رقم التليفون يجب أن يحتوي أرقام فقط أو + في البداية';
    } else if (phoneDigits.length > 20) {
      errors.phone = 'رقم التليفون لا يجب أن يتجاوز 20 رقم';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  // تحويل الوقت إلى صيغة PostgreSQL time
  const dbTime = time ? toFullTimeFormat(time) : null;

  // التحقق من عدم التداخل في الحجز (double booking)
  if (status !== 'cancelled' && date && dbTime) {
    const { data: existing, error: checkError } = await supabaseServer
      .from('appointments')
      .select('id, status, appointment_time')
      .eq('appointment_date', date);

    if (checkError) {
      console.error('خطأ أثناء التحقق من التداخل:', checkError);
      return { error: 'خطأ في التحقق من توفر الموعد' };
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

  // بناء كائن التحديث
  const updates: Record<string, any> = {
    full_name,
    phone,
  };

  if (status === 'cancelled') {
    updates.status = 'cancelled';
    updates.appointment_date = null;
    updates.appointment_time = null;
    updates.reminder_sent_6h = false;
  } else {
    if (date) updates.appointment_date = date;
    if (dbTime) updates.appointment_time = dbTime;
    if (status) {
      updates.status = status;
      // إعادة ضبط تذكير الـ 6 ساعات عند إعادة الجدولة
      if (status === 'rescheduled') {
        updates.reminder_sent_6h = false;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return { message: 'لا توجد تغييرات للحفظ' };
  }

  const { error } = await supabaseServer
    .from('appointments')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('خطأ أثناء تحديث الموعد:', error);
    return { error: error.message || 'فشل تحديث الموعد' };
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
    console.error('خطأ أثناء جلب المواعيد:', error);
    return { error: error.message, appointments: [] as Appointment[] };
  }

  const normalized = (data ?? []).map(appt => ({
    ...appt,
    appointment_time: normalizeTime(appt.appointment_time),
  }));

  return { appointments: normalized as Appointment[] };
}
