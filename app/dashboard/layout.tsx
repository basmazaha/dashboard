// app/dashboard/layout.tsx

import type { ReactNode } from 'react';
import { supabaseServer } from '@/lib/supabaseServer';
import { DEFAULT_TIMEZONE, TIMEZONE_LABELS } from '@/lib/timezone';
import { auth, currentUser } from '@clerk/nextjs/server';
import SidebarNav from './SidebarNav';
import SettingsMenu from './SettingsMenu';
import Link from 'next/link';
import './dashboard.css';

export const metadata = {
  title: 'لوحة التحكم',
  description: 'إدارة المواعيد وساعات العمل',
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    return null; // أو redirect('/sign-in')
  }

  const user = await currentUser();

  const { data: settings } = await supabaseServer
    .from('business_settings')
    .select('timezone')
    .eq('id', 1)
    .single();

  const tz = settings?.timezone || DEFAULT_TIMEZONE;
  const timezoneLabel = TIMEZONE_LABELS[tz] || tz;

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div className="header-container">
          <Link href="/dashboard/today-appointments">
           <h1 className="dashboard-logo">لوحة التحكم</h1>
           </Link>

          <div className="user-info">
            <div className="current-user-info">
              🕒 توقيت: <strong>{timezoneLabel}</strong>
            </div>

            {/* ⚙️ زر الإعدادات */}
            <SettingsMenu
              userName={user?.firstName || user?.username || 'غير معروف'}
              userId={userId}
            />
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <SidebarNav />
        </aside>

        <main className="dashboard-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
