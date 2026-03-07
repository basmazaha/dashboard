// app/dashboard/layout.tsx
import type { ReactNode } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { SignOutButton } from '@clerk/nextjs';
import SidebarNav from './SidebarNav'; // ← استيراد مكون الـ Sidebar الجديد
import './dashboard.css';

export const metadata = {
  title: 'لوحة التحكم',
  description: 'إدارة المواعيد وساعات العمل',
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    return null; // أو يمكنك استخدام redirect('/sign-in') إذا أردت توجيه المستخدم
  }

  const user = await currentUser();

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div className="header-container">
          <h1 className="dashboard-logo">لوحة التحكم</h1>

          <div className="user-info flex items-center gap-4">
            <div className="current-user-info">
              المستخدم الحالي: <strong>{user?.firstName || user?.username || 'غير معروف'}</strong> 
              (ID: {userId?.slice(0, 8)}...)
            </div>

            <SignOutButton>
              <button
                className="
                  px-5 py-2
                  text-sm font-medium
                  rounded-md
                  bg-red-600
                  hover:bg-red-700
                  text-white
                  transition-all
                "
              >
                تسجيل الخروج
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <SidebarNav />  {/* ← تم استدعاء المكون هنا بدلاً من كتابة <nav> مباشرة */}
        </aside>

        <main className="dashboard-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
