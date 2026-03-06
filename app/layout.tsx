// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Tajawal } from 'next/font/google';

// تحميل خط Tajawal (أو استبدليه بخط آخر إذا أردتِ)
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-tajawal',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'نظام إدارة المواعيد',
    template: '%s | نظام إدارة المواعيد',
  },
  description: 'لوحة تحكم بسيطة وسهلة لإدارة حجوزاتك ومتابعة عملائك',
  // يمكن إضافة المزيد: icons, openGraph, twitter, إلخ لاحقًا
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="ar" dir="rtl" className={tajawal.variable}>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          {/* إذا كنت تستخدمين خطوط أخرى يمكن إضافتها هنا كـ <link> */}
        </head>

        <body
          className={`
            min-h-screen antialiased
            bg-gray-50 text-gray-900
            font-sans
            ${tajawal.className}
          `}
          suppressHydrationWarning // مهم جدًا إذا كنت تستخدمين dark mode أو مكتبات تغير الـ class
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
