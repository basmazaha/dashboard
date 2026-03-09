// app/test-timezone/page.tsx
// Server Component - لا نضع 'use client' هنا

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabaseServer';
import TestTimezoneClient from './TestTimezoneClient';

export const dynamic = 'force-dynamic';

type Appointment = {
  id: string;
  full_name: string | null;
  phone: string | null;
  date_time: string | null; // timestamptz → ISO string (UTC)
  reason: string | null;
  status: string | null;
};

export default async function TestTimezonePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // جلب timezone العيادة
  const { data: settings, error: tzError } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .maybeSingle();

  if (tzError) {
    return <div style={{ padding: '2rem', color: 'red' }}>خطأ في جلب الـ timezone</div>;
  }

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
