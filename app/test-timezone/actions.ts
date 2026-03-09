// app/test-timezone/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';

/**
 * جلب الـ timezone المخزن في جدول business_settings
 */
export async function testGetBusinessTimezone() {
  try {
    const { data, error } = await supabaseServer
      .from('business_settings')
      .select('timezone')
      .maybeSingle();

    if (error) {
      console.error('[test] خطأ في جلب timezone:', error);
      return 'Africa/Cairo';
    }

    return data?.timezone || 'Africa/Cairo';
  } catch (err) {
    console.error('[test] exception في جلب timezone:', err);
    return 'Africa/Cairo';
  }
}

/**
 * جلب أيام الإجازة كـ Set لتسهيل التحقق
 */
export async function testGetOffDaysSet() {
  try {
    const { data, error } = await supabaseServer
      .from('off_days')
      .select('date');

    if (error) {
      console.error('[test] خطأ في جلب off_days:', error);
      return new Set<string>();
    }

    return new Set(data?.map(row => row.date) || []);
  } catch (err) {
    console.error('[test] exception في off_days:', err);
    return new Set<string>();
  }
}

/**
 * جلب ساعات العمل كـ map (key = day_of_week)
 */
export async function testGetWorkingHoursMap() {
  try {
    const { data, error } = await supabaseServer
      .from('working_hours')
      .select('day_of_week, is_open, start_time, end_time, slot_duration_minutes, break_start, break_end');

    if (error) {
      console.error('[test] خطأ في جلب working_hours:', error);
      return {} as Record<number, any>;
    }

    const map: Record<number, any> = {};
    data?.forEach(wh => {
      map[wh.day_of_week] = wh;
    });

    return map;
  } catch (err) {
    console.error('[test] exception في working_hours:', err);
    return {} as Record<number, any>;
  }
}

/**
 * توليد قائمة التواريخ المتاحة (للاختبار)
 * يُرجع iso + label منسق حسب timezone العيادة
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

    // تنسيق التاريخ باستخدام timezone العيادة
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
 * توليد الأوقات المتاحة ليوم معين (نسخة اختبارية مبسطة)
 * لا تقوم حالياً بفحص الحجوزات الموجودة لتبسيط الاختبار
 */
export async function testGenerateAvailableTimes(
  dateIso: string
): Promise<{
  times: Array<{ time: string; label: string }>;
  usedTimezone: string;
  message?: string;
}> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return { times: [], usedTimezone: 'N/A', message: 'صيغة تاريخ غير صحيحة' };
  }

  const tz = await testGetBusinessTimezone();
  const whMap = await testGetWorkingHoursMap();

  const d = new Date(dateIso);
  if (isNaN(d.getTime())) {
    return { times: [], usedTimezone: 'N/A', message: 'تاريخ غير صالح' };
  }

  const dow = d.getDay();
  const wh = whMap[dow];

  if (!wh?.is_open || !wh.start_time || !wh.end_time) {
    return {
      times: [],
      usedTimezone: tz,
      message: 'اليوم غير مفتوح حسب ساعات العمل',
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

  const times: Array<{ time: string; label: string }> = [];

  for (let current = start.getTime(); current < end.getTime(); current += slotMs) {
    const slotStart = current;
    const slotEnd = current + slotMs;

    if (slotStart < breakEndMs && slotEnd > breakStartMs) continue;

    const slotDate = new Date(slotStart);
    const isoTime = slotDate.toTimeString().slice(0, 5);

    const formatter = new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: tz,
    });

    let label = formatter.format(slotDate);
    label = label.replace('ص', 'صباحاً').replace('م', 'مساءً');

    times.push({ time: isoTime, label });
  }

  return {
    times,
    usedTimezone: tz,
  };
}
