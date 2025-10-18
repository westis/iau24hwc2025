import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Allow large file uploads for media endpoint
  if (request.nextUrl.pathname === '/api/upload/media') {
    // Create a new response that bypasses the default body size limit
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-middleware-prefetch', 'skip');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/upload/media',
};
