import type { ReactNode } from 'react';
import './dashboard.css';

export const metadata = {
  title: 'لوحة التحكم',
  description: 'إدارة المواعيد وساعات العمل',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div className="header-container">
          <h1 className="dashboard-logo">لوحة التحكم</h1>
          <div className="user-info">
            <span className="user-status">مستخدم معتمد</span>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <ul>
              <li><a href="/dashboard" className="active">المواعيد</a></li>
              <li><a href="/dashboard/working-hours">ساعات العمل</a></li>
              <li><a href="/dashboard/settings">الإعدادات</a></li>
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
