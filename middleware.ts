import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/transactions',
  '/assets',
  '/liabilities',
  '/budget',
  '/goals',
  '/family',
  '/settings',
  '/profile',
];

/**
 * Auth routes that should redirect to dashboard if already authenticated
 */
const AUTH_ROUTES = ['/login', '/register'];

/**
 * Check if path matches any of the routes
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname.startsWith(route));
}

/**
 * Middleware to protect routes and handle authentication
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth token from cookies
  const token = request.cookies.get('auth-token')?.value;

  // Verify token if exists
  let isAuthenticated = false;
  if (token) {
    try {
      await verifyToken(token);
      isAuthenticated = true;
    } catch {
      // Token is invalid or expired
      isAuthenticated = false;
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && matchesRoute(pathname, AUTH_ROUTES)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users from protected routes to login
  if (!isAuthenticated && matchesRoute(pathname, PROTECTED_ROUTES)) {
    const loginUrl = new URL('/login', request.url);
    // Add redirect parameter to return after login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow request to proceed
  return NextResponse.next();
}

/**
 * Middleware configuration
 * Specifies which routes should run through middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes (API endpoints)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|api).*)',
  ],
};
