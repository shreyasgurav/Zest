import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Activity-related paths that should be blocked
const BLOCKED_PATHS = [
  '/activities',
  '/activity-profile',
  '/create/activity',
  '/activity-dashboard',
  '/book-activity',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path starts with any of the blocked paths
  const isBlockedPath = BLOCKED_PATHS.some(path => pathname.startsWith(path));

  if (isBlockedPath) {
    // Redirect to home page or show a 404 page
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/activities/:path*',
    '/activity-profile/:path*',
    '/create/activity/:path*',
    '/activity-dashboard/:path*',
    '/book-activity/:path*',
  ],
}; 