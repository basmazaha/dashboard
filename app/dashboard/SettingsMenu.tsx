// app/dashboard/SettingsMenu.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';

export default function SettingsMenu({
  userName,
  userId,
}: {
  userName: string;
  userId: string;
}) {
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 🔥 يقفل لما تضغطي برا
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="settings-menu-wrapper" ref={menuRef}>
      <button
        className="settings-btn"
        onClick={() => setOpenMenu(prev => !prev)}
      >
        ⚙️
      </button>

      <div className={`settings-dropdown ${openMenu ? 'open' : ''}`}>

  {/* 👤 المستخدم */}
  <div className="dropdown-user-box">
    <div className="current-user-info">
      المستخدم الحالي:{' '}
      <strong>
        {userName}
      </strong>
      <span className="user-id">
        (ID: {userId?.slice(0, 8)}...)
      </span>
    </div>
  </div>

  {/* 🔥 خط */}
  <div className="dropdown-divider" />

  {/* ⚙️ الإعدادات */}
  <Link href="/dashboard/settings" className="dropdown-item">
     الإعدادات
  </Link>

  {/* 🚪 تسجيل الخروج */}
  <SignOutButton>
    <button className="dropdown-item logout-item">
       تسجيل الخروج
    </button>
  </SignOutButton>

</div>
    </div>
  );
}
