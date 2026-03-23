// app/dashboard/search/actions.ts
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

export async function getBusinessTimezone() {
  const { data, error } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .limit(1)
    .single();

  if (error) {
    console.error('خطأ في جلب الـ timezone:', error);
    return 'Africa/Cairo'; // fallback قيمة افتراضية شائعة في مصر
  }

  return data?.timezone || 'Africa/Cairo';
}

export async function searchAppointments(
  businessTimezone: string,
  params: {
    full_name?: string;
    phone?: string;
    status?: string;
    start_date?: string;   // YYYY-MM-DD
    end_date?: string;     // YYYY-MM-DD
  },
  page: number = 1,
  pageSize: number = 20
) {
  let query = supabaseServer
    .from('appointments')
    .select(
      'id, full_name, date_time, phone, reason, status',
      { count: 'exact' }
    );

  const { full_name, phone, status, start_date, end_date } = params;

  // فلتر الاسم (بحث جزئي غير حساس لحالة الأحرف)
  if (full_name?.trim()) {
    query = query.ilike('full_name', `%${full_name.trim()}%`);
  }

  // فلتر رقم التليفون (بحث جزئي)
  if (phone?.trim()) {
    query = query.ilike('phone', `%${phone.trim()}%`);
  }

  // فلتر الحالة (دقيق)
  if (status && status.trim() !== '') {
    query = query.eq('status', status);
  }

  // نطاق التاريخ → تحويل إلى UTC
  if (start_date) {
    try {
      const startLocal = parse(`${start_date} 00:00:00`, 'yyyy-MM-dd HH:mm:ss', new Date());
      const startUTC = fromZonedTime(startLocal, businessTimezone).toISOString();
      query = query.gte('date_time', startUTC);
    } catch (err) {
      console.error('خطأ في تحويل start_date إلى UTC:', err);
    }
  }

  if (end_date) {
    try {
      const endLocal = parse(`${end_date} 23:59:59`, 'yyyy-MM-dd HH:mm:ss', new Date());
      const endUTC = fromZonedTime(endLocal, businessTimezone).toISOString();
      query = query.lte('date_time', endUTC);
    } catch (err) {
      console.error('خطأ في تحويل end_date إلى UTC:', err);
    }
  }

  // ترتيب تنازلي حسب التاريخ (الأحدث أولاً)
  query = query.order('date_time', { ascending: false });

  // التقسيم (pagination)
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error('خطأ في تنفيذ استعلام البحث:', error);
    return {
      error: error.message || 'فشل جلب المواعيد',
      appointments: [],
      totalCount: 0,
    };
  }

  return {
    appointments: data ?? [],
    totalCount: count ?? 0,
    page,
    pageSize,
  };
}

export async function updateAppointment(formData: FormData, businessTimezone: string) {
  const id = formData.get('appointment_id') as string;
  const full_name = (formData.get('full_name') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const dateStr = formData.get('date') as string | null;     // YYYY-MM-DD
  const timeStr = formData.get('time') as string | null;     // HH:mm
  const status = formData.get('status') as string | null;

  if (!id) {
    return { error: 'لا يوجد معرف للموعد' };
  }

  // 🚫 منع تعديل المواعيد المقفولة أو الماضية
const { data: existingAppointment, error: fetchError } = await supabaseServer
  .from('appointments')
  .select('date_time, status')
  .eq('id', id)
  .single();

if (fetchError || !existingAppointment) {
  return { error: 'تعذر جلب بيانات الموعد' };
}

// تحقق من الحالة
const lockedStatuses = ['cancelled', 'completed', 'absent'];
if (lockedStatuses.includes(existingAppointment.status)) {
  return { error: 'لا يمكن تعديل هذا الموعد' };
}

// تحقق من أن الموعد لم يمر (حسب timezone)
if (existingAppointment.date_time) {
  const nowZoned = toZonedTime(new Date(), businessTimezone);
  const apptZoned = toZonedTime(existingAppointment.date_time, businessTimezone);

  if (apptZoned.getTime() < nowZoned.getTime()) {
    return { error: 'لا يمكن تعديل موعد سابق' };
  }
}

  const errors: Record<string, string> = {};

  if (!full_name) {
    errors.full_name = 'الاسم مطلوب';
  } else if (full_name.length < 3) {
    errors.full_name = 'الاسم يجب أن يكون 3 حروف على الأقل';
  }

  if (!phone) {
    errors.phone = 'رقم التليفون مطلوب';
  } else {
    const digits = phone.replace(/\s+/g, '');
    if (!/^\+?[0-9]+$/.test(digits)) {
      errors.phone = 'رقم التليفون يجب أن يحتوي أرقام فقط أو +';
    } else if (digits.length > 20) {
      errors.phone = 'رقم التليفون لا يجب أن يتجاوز 20 رقم';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

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

  if (Object.keys(updates).length <= 2) {
    // فقط full_name + phone بدون تغييرات جوهرية
    return { message: 'لا توجد تغييرات جوهرية' };
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
