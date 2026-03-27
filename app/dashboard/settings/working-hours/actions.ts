// app/dashboard/working-hours/actions.ts 


'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';
import type { WorkingHour, OffDay } from './types';

type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function upsertWorkingHours(hours: WorkingHour[]): Promise<ActionResult<null>> {
  try {
    const { error } = await supabaseServer
      .from('working_hours')
      .upsert(
        hours.map((h) => ({
          day_of_week: h.day_of_week,
          is_open: h.is_open,
          start_time: h.start_time || null,
          end_time: h.end_time || null,
          slot_duration_minutes: h.slot_duration_minutes ?? null,
          break_start: h.break_start || null,
          break_end: h.break_end || null,
        })),
        { onConflict: 'day_of_week' }
      );

    if (error) throw error;

    revalidatePath('/dashboard/working-hours');
    return { success: true, data: null };
  } catch (err: any) {
    console.error('upsertWorkingHours error:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء حفظ ساعات العمل' };
  }
}

export async function upsertOffDays(days: OffDay[]): Promise<ActionResult<null>> {
  try {
    const { error } = await supabaseServer
      .from('off_days')
      .upsert(
        days.map((d) => ({
          id: d.id,
          date: d.date,
          description: d.description,
        })),
        { onConflict: 'id' }
      );

    if (error) throw error;

    revalidatePath('/dashboard/working-hours');
    return { success: true, data: null };
  } catch (err: any) {
    console.error('upsertOffDays error:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء حفظ الأيام المغلقة' };
  }
}

export async function addOffDay(formData: FormData): Promise<ActionResult<OffDay>> {
  const date = formData.get('date') as string;
  const description = (formData.get('description') as string)?.trim() || null;

  if (!date) {
    return { success: false, error: 'التاريخ مطلوب' };
  }

  try {
    const { data, error } = await supabaseServer
      .from('off_days')
      .insert({ date, description })
      .select('id, date, description')
      .single();

    if (error) throw error;
    if (!data) throw new Error('لم يتم إرجاع السجل الجديد');

    revalidatePath('/dashboard/working-hours');
    return { success: true, data };
  } catch (err: any) {
    console.error('addOffDay error:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء إضافة اليوم المغلق' };
  }
}

export async function deleteOffDay(id: string): Promise<ActionResult<null>> {
  try {
    const { error } = await supabaseServer
      .from('off_days')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/working-hours');
    return { success: true, data: null };
  } catch (err: any) {
    console.error('deleteOffDay error:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء الحذف' };
  }
}

export async function getWorkingHoursAndOffDays(): Promise<
  ActionResult<{ workingHours: WorkingHour[]; offDays: OffDay[] }>
> {
  const { data: hours, error: hoursError } = await supabaseServer
    .from('working_hours')
    .select('*')
    .order('day_of_week', { ascending: true });

  const { data: offDays, error: offError } = await supabaseServer
    .from('off_days')
    .select('id, date, description')
    .order('date', { ascending: false });

  if (hoursError || offError) {
    console.error('خطأ في جلب البيانات:', { hoursError, offError });
    return { success: false, error: 'فشل جلب البيانات' };
  }

  return {
    success: true,
    data: {
      workingHours: hours ?? [],
      offDays: offDays ?? [],
    },
  };
}
