// app/test-timezone/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';

/**
 * جلب الـ timezone المخزن في جدول business_settings
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
 * جلب أيام الإجازة كـ Set
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
    console.error('[test-timezone] استثناء في off_days:', err);
    return new Set<string>();
  }
}

/**
 * جلب ساعات العمل كـ map
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
    console.error('[test-timezone] استثناء في working_hours:', err);
    return {};
  }
}

/**
 * توليد التواريخ المتاحة
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

    dates.push({ iso, label, dayOfWeek: dow });
  }

  return { dates, usedTimezone: tz };
}

/**
 * توليد الأوقات مع جلب المواعيد الحقيقية + debug كامل
 */
export async function testGenerateAvailableTimes(
  dateIso: string,
  excludeAppointmentId?: string | null
): Promise<{
  times: Array<{ time: string; label: string; isBooked: boolean }>;
  usedTimezone: string;
  message?: string;
  bookedCount: number;
  debugInfo: any;
}> {
  const debugInfo: any = {
    queriedDate: dateIso,
    startTime: null,
    endTime: null,
    slotMinutes: null,
    generatedSlotsCount: 0,
    rawAppointments: [],
    normalizedBooked: [],
    error: null,
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return {
      times: [],
      usedTimezone: 'N/A',
      message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)',
      bookedCount: 0,
      debugInfo: { ...debugInfo, error: 'bad date format' },
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
      debugInfo: { ...debugInfo, error: 'invalid date' },
    };
  }

  const dow = d.getDay();
  const wh = whMap[dow];

  if (!wh?.is_open || !wh.start_time || !wh.end_time) {
    return {
      times: [],
      usedTimezone: tz,
      message: 'اليوم غير مفتوح',
      bookedCount: 0,
      debugInfo: { ...debugInfo, dayClosed: true, dayOfWeek: dow },
    };
  }

  debugInfo.startTime = wh.start_time;
  debugInfo.endTime = wh.end_time;
  debugInfo.slotMinutes = wh.slot_duration_minutes ?? 15;

  // جلب المواعيد من الداتابيز
  const { data: appts, error } = await supabaseServer
    .from('appointments')
    .select('id, appointment_time, status')
    .eq('appointment_date', dateIso);

  debugInfo.rawAppointments = appts || [];
  debugInfo.appointmentsError = error ? error.message : null;

  if (error) {
    console.error('[test] appointments query failed:', error);
  }

  const bookedTimes = new Set<string>();

  if (appts && appts.length > 0) {
    appts.forEach(appt => {
      if (appt.status !== 'cancelled' && appt.id !== excludeAppointmentId) {
        let timeStr = appt.appointment_time;
        if (typeof timeStr === 'string') {
          timeStr = timeStr.trim();
          // نحاول نأخذ HH:mm بطرق مختلفة
          const match = timeStr.match(/^(\d{2}):(\d{2})/);
          if (match) {
            const hh = match[1].padStart(2, '0');
            const mm = match[2].padStart(2, '0');
            const normalized = `\( {hh}: \){mm}`;
            bookedTimes.add(normalized);
          }
        }
      }
    });
  }

  debugInfo.normalizedBooked = Array.from(bookedTimes);

  // توليد السلوتات
  const start = new Date(`1970-01-01T${wh.start_time}`);
  const end = new Date(`1970-01-01T${wh.end_time}`);

  const slotMs = debugInfo.slotMinutes * 60 * 1000;

  let breakStartMs = Infinity;
  let breakEndMs = -Infinity;
  if (wh.break_start && wh.break_end) {
    breakStartMs = new Date(`1970-01-01T${wh.break_start}`).getTime();
    breakEndMs = new Date(`1970-01-01T${wh.break_end}`).getTime();
  }

  const times: Array<{ time: string; label: string; isBooked: boolean }> = [];

  let current = start.getTime();
  while (current < end.getTime()) {
    const slotStart = current;
    const slotEnd = current + slotMs;

    if (slotStart < breakEndMs && slotEnd > breakStartMs) {
      current += slotMs;
      continue;
    }

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

    times.push({ time: isoTime, label, isBooked });

    current += slotMs;
    debugInfo.generatedSlotsCount++;
  }

  return {
    times,
    usedTimezone: tz,
    message: bookedTimes.size > 0 ? undefined : 'لا توجد مواعيد محجوزة في هذا اليوم',
    bookedCount: bookedTimes.size,
    debugInfo,
  };
}
