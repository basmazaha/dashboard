// app/test-timezone/page.tsx
// ملف Server Component (لا نضع 'use client' هنا)

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import TestTimezoneClient from './TestTimezoneClient';

export const dynamic = 'force-dynamic';

type Appointment = {
  id: string;
  full_name: string | null;
  phone: string | null;
  date_time: string | null;
  reason: string | null;
  status: string | null;
};

export default async function TestTimezonePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // جلب timezone
  const { data: settings } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  const timezone = settings?.timezone || 'Africa/Cairo';

  // جلب المواعيد
  const { data: appointments = [] } = await supabaseServer
    .from('appointments')
    .select('id, full_name, phone, date_time, reason, status')
    .order('date_time', { ascending: true })
    .limit(50);

  return (
    <TestTimezoneClient
      initialAppointments={appointments as Appointment[]}
      timezone={timezone}
    />
  );
}
