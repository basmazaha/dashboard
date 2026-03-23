// app/dashboard/layout.tsx

'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { SignOutButton, useUser } from '@clerk/nextjs';
import SidebarNav from './SidebarNav';
import './dashboard.css';

export const metadata = {
  title: 'لوحة التحكم',
  description: 'إدارة المواعيد وساعات العمل',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const [openMenu, setOpenMenu] = useState(false);

  if (!isLoaded) return null;

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div className="header-container">
          <h1 className="dashboard-logo">لوحة التحكم</h1>

          <div className="user-info">
            <div className="current-user-info">
              المستخدم الحالي: <strong>{user?.firstName || user?.username || 'غير معروف'}</strong>
              <span className="user-id">(ID: {user?.id?.slice(0, 8)}...)</span>
            </div>

            <div className="settings-menu-wrapper">
              <button
                className="settings-btn"
                onClick={() => setOpenMenu(prev => !prev)}
              >
                ⚙️
              </button>

              {openMenu && (
                <div className="settings-dropdown">
                  <Link href="/dashboard/settings" className="dropdown-item">
                    الإعدادات
                  </Link>

                  <SignOutButton>
                    <button className="dropdown-item logout-item">
                      تسجيل الخروج
                    </button>
                  </SignOutButton>
                </div>
              )}
            </div>
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
