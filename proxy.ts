// proxy.ts (أو middleware.ts)

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// حددي الـ public routes (اللي مش محتاجة login)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  // أضيفي هنا أي صفحات عامة تانية لو عايزة
]);

export default clerkMiddleware(async (auth, req) => {
  // لو الصفحة مش public → احميها
  if (!isPublicRoute(req)) {
    // ← التصحيح الرئيسي: await auth() أولاً
    const authObj = await auth();
    
    // استخدمي protect() على الـ object المحصل عليه
    authObj.protect();  // أو auth().protect() لو كان متاح، لكن await أفضل
  }
});

export const config = {
  matcher: [
    // ده الـ matcher الافتراضي الجيد لـ Next.js App Router
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
