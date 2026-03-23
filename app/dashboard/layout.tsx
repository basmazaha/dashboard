// app/dashboard/layout.tsx

import type { ReactNode } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import SidebarNav from './SidebarNav';
import SettingsMenu from './SettingsMenu';
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

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div className="header-container">
          <h1 className="dashboard-logo">لوحة التحكم</h1>

          <div className="user-info">
            <div className="current-user-info">
              المستخدم الحالي:{' '}
              <strong>{user?.firstName || user?.username || 'غير معروف'}</strong>
              <span className="user-id">
                (ID: {userId?.slice(0, 8)}...)
              </span>
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
