// app/dashboard/SidebarNav.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav">
      <ul className="nav-list">
        <li>
          <Link 
            href="/dashboard" 
            className={`nav-link ${pathname === '/dashboard' ? 'nav-link--active' : ''}`}
          >
            المواعيد
          </Link>
        </li>
        <li>
          <Link 
            href="/dashboard/search" 
            className={`nav-link ${pathname === '/dashboard/search' ? 'nav-link--active' : ''}`}
          >
            بحث
          </Link>
        </li>
        <li>
          <Link 
            href="/dashboard/working-hours" 
            className={`nav-link ${pathname === '/dashboard/working-hours' ? 'nav-link--active' : ''}`}
          >
            ساعات العمل
          </Link>
        </li>
        <li>
          <Link 
            href="/dashboard/settings" 
            className={`nav-link ${pathname === '/dashboard/settings' ? 'nav-link--active' : ''}`}
          >
            الإعدادات
          </Link>
        </li>
      </ul>
    </nav>
  );
}
