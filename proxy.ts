// proxy.ts  (أو middleware.ts في الـ root)

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// حددي الـ public routes (اللي مفيش حاجة للـ login عشان يدخلوا)
const isPublicRoute = createRouteMatcher([
  '/',                  // الصفحة الرئيسية
  '/sign-in(.*)',       // صفحة تسجيل الدخول (مع أي params)
  '/sign-up(.*)',       // صفحة التسجيل
  // أضيفي أي routes تانية عامة، مثلاً:
  // '/api/webhook(.*)',   لو عندك webhooks من Stripe أو غيره
]);

export default clerkMiddleware((auth, req) => {
  // لو الـ route مش public → لازم يسجل دخول
  if (!isPublicRoute(req)) {
    auth().protect();   // ده اللي بيحمي الـ route ويحول لـ sign-in لو مش مسجل
  }
});

// Matcher عشان يشتغل الـ middleware على معظم الـ routes (الافتراضي الجيد)
export const config = {
  matcher: [
    // تخطي الـ static files والـ Next.js internals
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // شغل على كل API routes
    '/(api|trpc)(.*)',
  ],
};
