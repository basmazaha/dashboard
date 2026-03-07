//  app/dashboard/layout.tsx
import type { ReactNode } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { SignOutButton } from '@clerk/nextjs';
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
              المستخدم الحالي: <strong>{user?.firstName || user?.username || 'غير معروف'}</strong> 
              <span className="user-id">(ID: {userId?.slice(0, 8)}...)</span>
            </div>

            <SignOutButton>
              <button className="btn btn--danger btn--logout">
                تسجيل الخروج
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <ul className="nav-list">
              <li><a href="/dashboard" className="nav-link nav-link--active">المواعيد</a></li>
              <li><a href="/dashboard/working-hours" className="nav-link">ساعات العمل</a></li>
              <li><a href="/dashboard/settings" className="nav-link">الإعدادات</a></li>
            </ul>
          </nav>
        </aside>

        <main className="dashboard-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
