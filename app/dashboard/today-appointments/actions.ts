// app/dashboard/today-appointments/actions.ts

'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@/lib/timezone';

export async function fetchTodayAppointments(
  timezone: string,
  page: number,
  pageSize: number
) {
  const tz = timezone || DEFAULT_TIMEZONE;

  try {
    const now = new Date();
    const zoned = toZonedTime(now, tz);

    const start = startOfDay(zoned);
    const end = endOfDay(zoned);

    const startUTC = fromZonedTime(start, tz);
    const endUTC = fromZonedTime(end, tz);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabaseServer
      .from('appointments')
      .select('*', { count: 'exact' })
      .gte('date_time', startUTC.toISOString())
      .lte('date_time', endUTC.toISOString())
      .order('date_time', { ascending: true })
      .range(from, to);

    if (error) {
      return { error: error.message };
    }

    return {
      appointments: data ?? [],
      totalCount: count ?? 0,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function getBusinessTimezone() {
  const { data } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .limit(1)
    .single();

  return data?.timezone || DEFAULT_TIMEZONE;
}
