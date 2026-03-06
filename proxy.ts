// proxy.ts (أو middleware.ts في الـ root أو src/middleware.ts)

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// حددي الـ public routes (اللي مش محتاجة تسجيل دخول)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  // أضيفي هنا أي صفحات عامة تانية (مثل '/about' أو '/api/public(.*)')
]);

export default clerkMiddleware(async (auth, req) => {
  // لو الصفحة مش public → احميها
  if (!isPublicRoute(req)) {
    // ← التصحيح النهائي: await auth.protect()
    await auth.protect();  // ده بيعمل redirect تلقائي لـ /sign-in لو مش مسجل
  }
});

export const config = {
  matcher: [
    // matcher الافتراضي الجيد لـ App Router
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
