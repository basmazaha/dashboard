// proxy.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware({
  publicRoutes: ['/', '/sign-in', '/sign-up'],
  // ignoredRoutes: ['/api/(.*)'],   // أضفها لو عندك webhooks أو API عامة
});

export const config = {
  matcher: [
    // matcher آمن وموصى به في Next.js 16
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};
