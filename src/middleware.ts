import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware that intercepts Twitterbot requests and serves a minimal HTML page
 * with just the OG meta tags. This bypasses all React/RSC streaming complexity
 * that may interfere with Twitter's card crawler.
 */

const BOT_UA = /Twitterbot|twitter\.com/i;

// Default OG metadata for the homepage
const DEFAULT_OG = {
  title: 'Electorate — Know Who Represents You',
  description:
    "Nigeria's definitive politician accountability and transparency platform.",
  image: 'https://iili.io/BRvekCJ.jpg',
  url: 'https://www.electorate.ng',
};

function buildMinimalHtml(og: {
  title: string;
  description: string;
  image: string;
  url: string;
}) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${og.title}</title>
<meta property="og:title" content="${og.title}" />
<meta property="og:description" content="${og.description}" />
<meta property="og:image" content="${og.image}" />
<meta property="og:image:secure_url" content="${og.image}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${og.url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Electorate" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@electorating" />
<meta name="twitter:creator" content="@electorating" />
<meta name="twitter:title" content="${og.title}" />
<meta name="twitter:description" content="${og.description}" />
<meta name="twitter:image" content="${og.image}" />
<meta name="twitter:image:alt" content="Electorate — Know Who Represents You" />
</head>
<body></body>
</html>`;
}

const IS_ASSET = /\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff2?)$/i;

// Security headers that should only be applied to HTML pages, NOT images/assets.
// Twitter's image fetcher rejects images with X-Frame-Options: DENY.
function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  return response;
}

export function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent') || '';
  const { pathname } = request.nextUrl;

  // For non-bots: add security headers to HTML pages only, skip images/assets
  if (!BOT_UA.test(ua)) {
    const response = NextResponse.next();
    if (!IS_ASSET.test(pathname) && !pathname.startsWith('/api/v1/og-image')) {
      addSecurityHeaders(response);
    }
    return response;
  }

  // Don't intercept actual image/asset requests — let them through
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/twitter-card' ||
    pathname.startsWith('/twitter-card/') ||
    pathname === '/twitter-card-control' ||
    pathname.startsWith('/twitter-card-control/') ||
    pathname === '/og-card-test' ||
    pathname.startsWith('/og-card-test/') ||
    pathname.startsWith('/card-test-') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff2?)$/i) ||
    pathname.includes('opengraph-image')
  ) {
    return NextResponse.next();
  }

  // Politician detail pages: /politicians/[slug]
  const politicianMatch = pathname.match(/^\/politicians\/([^/]+)\/?$/);
  if (politicianMatch) {
    const slug = politicianMatch[1];
    const og = {
      title: `${slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} | Electorate`,
      description:
        "Track their voting record, promises, and accountability score on Electorate.",
      image: DEFAULT_OG.image,
      url: `https://www.electorate.ng/politicians/${slug}`,
    };
    return new NextResponse(buildMinimalHtml(og), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // All other pages: serve the default homepage OG
  return new NextResponse(buildMinimalHtml(DEFAULT_OG), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon files
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon).*)',
  ],
};
