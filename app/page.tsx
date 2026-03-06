// app/page.tsx
import Link from "next/link";
import "./home.css";   // ← هنجيب الستايل من هنا

export default function Home() {
  return (
    <div className="home-page">
      <main className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            مرحباً بك في نظام إدارة المواعيد
          </h1>

          <p className="hero-subtitle">
            لوحة تحكم بسيطة وقوية تساعدك على تنظيم حجوزاتك ومتابعة عملائك بكفاءة
          </p>

          <div className="hero-buttons">
            <Link href="/dashboard" className="btn btn-primary">
              الدخول إلى لوحة التحكم
            </Link>

            <Link href="/sign-in" className="btn btn-secondary">
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </main>

      <footer className="site-footer">
        © {new Date().getFullYear()} نظام إدارة المواعيد — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
