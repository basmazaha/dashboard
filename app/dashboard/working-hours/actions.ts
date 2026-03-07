// app/dashboard/working-hours/actions.ts
'use server';

import { supabaseServer } from '@/lib/supabaseServer';
import { revalidatePath } from 'next/cache';

export type WorkingHourInput = {
  day_of_week: number;
  is_open: boolean;
  start_time?: string | null;
  end_time?: string | null;
  slot_duration_minutes?: number | null;
  break_start?: string | null;
  break_end?: string | null;
};

export async function upsertWorkingHours(hours: WorkingHourInput[]) {
  try {
    const { error } = await supabaseServer
      .from('working_hours')
      .upsert(
        hours.map(h => ({
          day_of_week: h.day_of_week,
          is_open: h.is_open,
          start_time: h.start_time || null,
          end_time: h.end_time || null,
          slot_duration_minutes: h.slot_duration_minutes || 15,
          break_start: h.break_start || null,
          break_end: h.break_end || null,
        })),
        { onConflict: 'day_of_week' }
      );

    if (error) throw error;

    revalidatePath('/dashboard/working-hours');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ أثناء الحفظ' };
  }
}

export async function addOffDay(formData: FormData) {
  const date = formData.get('date') as string;
  const description = (formData.get('description') as string)?.trim() || null;

  if (!date) {
    return { success: false, error: 'التاريخ مطلوب' };
  }

  try {
    const { error } = await supabaseServer
      .from('off_days')
      .insert({ date, description });

    if (error) throw error;

    revalidatePath('/dashboard/working-hours');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ أثناء إضافة اليوم' };
  }
}

export async function deleteOffDay(id: string) {
  try {
    const { error } = await supabaseServer
      .from('off_days')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/working-hours');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'حدث خطأ أثناء الحذف' };
  }
}

export async function getWorkingHoursAndOffDays() {
  const { data: hours, error: hoursError } = await supabaseServer
    .from('working_hours')
    .select('*')
    .order('day_of_week');

  const { data: offDays, error: offError } = await supabaseServer
    .from('off_days')
    .select('id, date, description')
    .order('date');

  if (hoursError || offError) {
    return { success: false, error: 'فشل جلب البيانات' };
  }

  return {
    success: true,
    workingHours: hours || [],
    offDays: offDays || [],
  };
}
