// app/dashboard/settings/page.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // لست بحاجة إليه هنا، لكن يمكن إضافته لاحقًا
import './SettingsDashboard.css'; // ملف CSS منفصل إذا أردت

export default function SettingsDashboard() {
  return (
    <div className="settings-dashboard">
      <div className="settings-dashboard__container">
        <header className="settings-dashboard__header">
          <h1 className="settings-dashboard__title">الإعدادات</h1>
          <p className="settings-dashboard__description">
            إدارة إعدادات النظام والشركة
          </p>
        </header>

        <div className="settings-dashboard__sections">
          <div className="settings-card">
            <h2 className="settings-card__title">المنطقة الزمنية</h2>
            <p className="settings-card__description">
              تحديد التوقيت المحلي الافتراضي للشركة (يؤثر على عرض المواعيد وحساب الأوقات المتاحة).
            </p>
            <Link href="/dashboard/settings/timezone" className="settings-card__link">
              تعديل المنطقة الزمنية →
            </Link>
          </div>

          {/* يمكنك إضافة بطاقات أخرى لاحقًا */}
          <div className="settings-card settings-card--disabled">
            <h2 className="settings-card__title">إعدادات الحجز</h2>
            <p className="settings-card__description">
              (قريبًا) تعديل مدة الفتحة، الحد الأقصى للحجوزات، إلخ.
            </p>
          </div>

          <div className="settings-card settings-card--disabled">
            <h2 className="settings-card__title">إشعارات وبريد إلكتروني</h2>
            <p className="settings-card__description">
              (قريبًا) إعدادات الإشعارات والقوالب.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
