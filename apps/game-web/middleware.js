// apps/game-web/middleware.js
import { NextResponse } from 'next/server';

const DEFAULT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_GAME_SLUG || 'default';
const DEFAULT_CHANNEL = process.env.NEXT_PUBLIC_DEFAULT_CHANNEL || 'published';

export function middleware(req) {
  const { pathname, searchParams } = req.nextUrl;

  // Let API/Next internals/static pass through
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) return NextResponse.next();

  // Optional: allow these debug pages without rewrite
  if (pathname === '/' || pathname === '/env-smoke' || pathname === '/media-smoke') {
    if (pathname === '/') {
      const slug = searchParams.get('slug');
      const channel = searchParams.get('channel');
      if (!slug || !slug.trim() || !channel || !channel.trim()) {
        const url = req.nextUrl.clone();
        url.pathname = '/';
        if (!slug || !slug.trim()) url.searchParams.set('slug', DEFAULT_SLUG);
        if (!channel || !channel.trim()) url.searchParams.set('channel', DEFAULT_CHANNEL);
        return NextResponse.rewrite(url);
      }
    } else if (!searchParams.has('channel')) {
      const url = req.nextUrl.clone();
      url.searchParams.set('channel', DEFAULT_CHANNEL);
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // Pretty URL -> query params
  const url = req.nextUrl.clone();
  const slug = pathname.replace(/^\/+/, '');
  if (!searchParams.has('slug') || !slug) url.searchParams.set('slug', slug || DEFAULT_SLUG);
  if (!searchParams.has('channel')) url.searchParams.set('channel', DEFAULT_CHANNEL);
  url.pathname = '/';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
