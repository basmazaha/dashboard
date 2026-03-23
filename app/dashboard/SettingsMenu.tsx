// app/dashboard/SettingsMenu.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';

export default function SettingsMenu() {
  const [openMenu, setOpenMenu] = useState(false);

  return (
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
  );
}
