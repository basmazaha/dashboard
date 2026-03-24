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
            مواعيد اليوم
          </Link>
        </li>
        <li>
          <Link 
            href="/dashboard" 
            className={`nav-link ${pathname === '/dashboard' ? 'nav-link--active' : ''}`}
          >
            المواعيد القادمة
          </Link>
        </li>
        <li>
          <Link 
            href="/dashboard/search" 
            className={`nav-link ${pathname === '/dashboard/search' ? 'nav-link--active' : ''}`}
          >
            كل المواعيد
          </Link>
        </li>
        
      </ul>
    </nav>
  );
}
