// proxy.ts (أو middleware.ts في root أو src)

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// حددي الـ public routes (اللي مش محتاجة تسجيل دخول)
const isPublicRoute = createRouteMatcher([
  '/',                    // الصفحة الرئيسية
  '/sign-in(.*)',         // صفحة تسجيل الدخول + أي params
  '/sign-up(.*)',         // صفحة التسجيل + أي params
  // أضيفي أي routes عامة تانية هنا، مثل '/about' أو '/api/webhook(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  // لو الـ route مش public → احميه
  if (!isPublicRoute(req)) {
    // ← ده التصحيح المهم: await auth() ثم protect()
    const { protect } = await auth();
    await protect();  // هيحول لـ sign-in لو مش مسجل دخول
  }
});

// Config للـ matcher (مهم جدًا عشان يشتغل على الصفحات والـ API)
export const config = {
  matcher: [
    // تخطي الـ static files والـ _next internals
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // شغل على كل API و trpc routes
    '/(api|trpc)(.*)',
  ],
};
