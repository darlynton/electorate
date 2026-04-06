import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

/**
 * Test G: Self-hosted re-encoded image (116KB, clean headers).
 * Previous self-hosted tests used the old 353KB image AND had X-Frame-Options: DENY.
 * Now both issues are fixed. This tests if self-hosting works.
 */
export async function GET() {
  const image = 'https://www.electorate.ng/meta-image.jpg';

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
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Electorate — Know Who Represents You" />
<meta name="twitter:description" content="Nigeria's definitive politician accountability platform." />
<meta name="twitter:image" content="${image}" />
</head>
<body><p>Card test G (self-hosted re-encoded image)</p></body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
