import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

/**
 * Test B: Uses our own API route to serve the image (bypasses static file serving).
 * Brand-new URL that X has never cached.
 */
export async function GET() {
  // Image served by our own API route — full control over headers, no middleware
  const image = 'https://www.electorate.ng/api/v1/og-image';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Electorate</title>
<meta property="og:title" content="Electorate — Know Who Represents You" />
<meta property="og:description" content="Nigeria's definitive politician accountability and transparency platform." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://www.electorate.ng" />
<meta property="og:image" content="${image}" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Electorate — Know Who Represents You" />
<meta name="twitter:description" content="Nigeria's definitive politician accountability platform." />
<meta name="twitter:image" content="${image}" />
</head>
<body><p>Card test B (API-served image)</p></body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
