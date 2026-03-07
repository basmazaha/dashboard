// app/dashboard/SidebarNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav">
      <ul>
        <li>
          <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
            المواعيد
          </Link>
        </li>
        <li>
          <Link href="/dashboard/working-hours" className={pathname === '/dashboard/working-hours' ? 'active' : ''}>
            ساعات العمل
          </Link>
        </li>
        <li>
          <Link href="/dashboard/settings" className={pathname === '/dashboard/settings' ? 'active' : ''}>
            الإعدادات
          </Link>
        </li>
      </ul>
    </nav>
  );
}
