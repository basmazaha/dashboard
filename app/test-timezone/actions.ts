// app/test-timezone/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';

/**
 * جلب الـ timezone المخزن في جدول business_settings
 * إرجاع قيمة افتراضية إذا لم يوجد أو حدث خطأ
 */
export async function testGetBusinessTimezone(): Promise<string> {
  try {
    const { data, error } = await supabaseServer
      .from('business_settings')
      .select('timezone')
      .maybeSingle();

    if (error) {
      console.error('[test-timezone] خطأ في جلب timezone:', error.message);
      return 'Africa/Cairo';
    }

    return data?.timezone || 'Africa/Cairo';
  } catch (err) {
    console.error('[test-timezone] استثناء أثناء جلب timezone:', err);
    return 'Africa/Cairo';
  }
}

/**
 * جلب أيام الإجازة كـ Set<string> لتسهيل التحقق السريع
 */
export async function testGetOffDaysSet(): Promise<Set<string>> {
  try {
    const { data, error } = await supabaseServer
      .from('off_days')
      .select('date');

    if (error) {
      console.error('[test-timezone] خطأ في جلب off_days:', error.message);
      return new Set<string>();
    }

    return new Set(data?.map(row => row.date) || []);
  } catch (err) {
    console.error('[test-timezone] استثناء في جلب off_days:', err);
    return new Set<string>();
  }
}

/**
 * جلب ساعات العمل لكل يوم من الأسبوع كـ Record<day_of_week, WorkingHour>
 */
export async function testGetWorkingHoursMap(): Promise<Record<number, any>> {
  try {
    const { data, error } = await supabaseServer
      .from('working_hours')
      .select('day_of_week, is_open, start_time, end_time, slot_duration_minutes, break_start, break_end');

    if (error) {
      console.error('[test-timezone] خطأ في جلب working_hours:', error.message);
      return {};
    }

    const map: Record<number, any> = {};
    data?.forEach(wh => {
      map[wh.day_of_week] = wh;
    });

    return map;
  } catch (err) {
    console.error('[test-timezone] استثناء في جلب working_hours:', err);
    return {};
  }
}

/**
 * توليد قائمة التواريخ المتاحة خلال الأيام القادمة
 * يتم استبعاد أيام الإجازة + الأيام غير المفتوحة
 */
export async function testGenerateAvailableDates(
  daysCount: number = 30
): Promise<{
  dates: Array<{ iso: string; label: string; dayOfWeek: number }>;
  usedTimezone: string;
}> {
  const tz = await testGetBusinessTimezone();
  const offDays = await testGetOffDaysSet();
  const whMap = await testGetWorkingHoursMap();

  const dates: Array<{ iso: string; label: string; dayOfWeek: number }> = [];
  const today = new Date();

  for (let i = 0; i < daysCount; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const iso = d.toISOString().split('T')[0];

    if (offDays.has(iso)) continue;

    const dow = d.getDay();
    const wh = whMap[dow];

    if (!wh?.is_open || !wh.start_time || !wh.end_time) continue;

    const formatter = new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: tz,
    });

    const label = formatter.format(d);

    dates.push({
      iso,
      label,
      dayOfWeek: dow,
    });
  }

  return {
    dates,
    usedTimezone: tz,
  };
}

/**
 * توليد الأوقات المتاحة ليوم محدد مع استبعاد المواعيد المحجوزة من جدول appointments
 */
export async function testGenerateAvailableTimes(
  dateIso: string,
  excludeAppointmentId?: string | null
): Promise<{
  times: Array<{ time: string; label: string; isBooked: boolean }>;
  usedTimezone: string;
  message?: string;
  bookedCount: number;
}> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return {
      times: [],
      usedTimezone: 'N/A',
      message: 'صيغة التاريخ غير صحيحة (يجب YYYY-MM-DD)',
      bookedCount: 0,
    };
  }

  const tz = await testGetBusinessTimezone();
  const whMap = await testGetWorkingHoursMap();

  const d = new Date(dateIso);
  if (isNaN(d.getTime())) {
    return {
      times: [],
      usedTimezone: 'N/A',
      message: 'التاريخ غير صالح',
      bookedCount: 0,
    };
  }

  const dow = d.getDay();
  const wh = whMap[dow];

  if (!wh?.is_open || !wh.start_time || !wh.end_time) {
    return {
      times: [],
      usedTimezone: tz,
      message: 'اليوم غير مفتوح حسب جدول ساعات العمل',
      bookedCount: 0,
    };
  }

  const start = new Date(`1970-01-01T${wh.start_time}`);
  const end = new Date(`1970-01-01T${wh.end_time}`);

  const slotMinutes = wh.slot_duration_minutes ?? 15;
  const slotMs = slotMinutes * 60 * 1000;

  let breakStartMs = Infinity;
  let breakEndMs = -Infinity;
  if (wh.break_start && wh.break_end) {
    breakStartMs = new Date(`1970-01-01T${wh.break_start}`).getTime();
    breakEndMs = new Date(`1970-01-01T${wh.break_end}`).getTime();
  }

  // جلب المواعيد المسجلة في هذا اليوم
  const { data: appts, error } = await supabaseServer
    .from('appointments')
    .select('id, appointment_time, status')
    .eq('appointment_date', dateIso);

  if (error) {
    console.error('[test-timezone] خطأ في قراءة appointments:', error.message);
    return {
      times: [],
      usedTimezone: tz,
      message: 'خطأ في جلب المواعيد المحجوزة',
      bookedCount: 0,
    };
  }

  const bookedTimes = new Set<string>();
  appts?.forEach(appt => {
    if (appt.status !== 'cancelled' && appt.id !== excludeAppointmentId) {
      const normalizedTime = appt.appointment_time?.slice(0, 5) || '';
      if (normalizedTime) bookedTimes.add(normalizedTime);
    }
  });

  const times: Array<{ time: string; label: string; isBooked: boolean }> = [];

  for (let current = start.getTime(); current < end.getTime(); current += slotMs) {
    const slotStart = current;
    const slotEnd = current + slotMs;

    if (slotStart < breakEndMs && slotEnd > breakStartMs) continue;

    const slotDate = new Date(slotStart);
    const isoTime = slotDate.toTimeString().slice(0, 5);

    const isBooked = bookedTimes.has(isoTime);

    const formatter = new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: tz,
    });

    let label = formatter.format(slotDate);
    label = label.replace('ص', 'صباحاً').replace('م', 'مساءً');

    times.push({
      time: isoTime,
      label,
      isBooked,
    });
  }

  return {
    times,
    usedTimezone: tz,
    bookedCount: bookedTimes.size,
  };
}
