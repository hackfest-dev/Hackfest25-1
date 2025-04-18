import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Silence unnecessary debug logs in development
if (process.env.NODE_ENV === 'development') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Filter out some common Next.js development logs
    const message = args.length > 0 ? args[0]?.toString() : '';
    if (message.includes('Fast Refresh')) return;
    if (message.includes('useLayoutEffect does nothing on the server')) return;
    if (message.includes('Warning: ReactDOM.render')) return;
    if (message.includes('Warning: Expected server HTML')) return;
    originalConsoleError(...args);
  };
  
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    // Filter out commonly repeated warnings
    const message = args.length > 0 ? args[0]?.toString() : '';
    if (message.includes('Using Router() is deprecated')) return;
    originalConsoleWarn(...args);
  };
}

export function middleware(request: NextRequest) {
  // This middleware doesn't modify requests but initializes the console overrides
  return NextResponse.next();
}

// Configure to run on all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 