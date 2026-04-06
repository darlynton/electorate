import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

/**
 * Brand-new test endpoint that X/Twitter has never seen before.
 * Uses jsDelivr CDN (Cloudflare-backed, clean headers, no CSP sandbox).
 */
export async function GET() {
  const image = 'https://wsrv.nl/?url=cdn.jsdelivr.net/gh/darlynton/electorate@main/public/meta-image.jpg';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Electorate — Know Who Represents You</title>

    <meta property="og:title" content="Electorate — Know Who Represents You" />
    <meta property="og:description" content="Nigeria's definitive politician accountability and transparency platform." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.electorate.ng" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Electorate — Know Who Represents You" />
    <meta name="twitter:description" content="Nigeria's definitive politician accountability and transparency platform." />
    <meta name="twitter:image" content="${image}" />
  </head>
  <body>
    <p>Electorate OG card test.</p>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}
