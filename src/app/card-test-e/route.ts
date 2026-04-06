import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

/**
 * Test E: Uses OUR image uploaded to Cloudinary (same domain as working card-test-c).
 * Brand-new URL that X has never cached.
 */
export async function GET() {
  const image = 'https://res.cloudinary.com/demo/image/upload/v1775504263/meta-image_qbcm32.jpg';

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
<body><p>Card test E (our image on Cloudinary)</p></body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
