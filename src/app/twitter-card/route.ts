import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Electorate — Know Who Represents You</title>

    <meta property="og:title" content="Electorate — Know Who Represents You" />
    <meta property="og:description" content="Nigeria's definitive politician accountability and transparency platform." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.electorate.ng/twitter-card" />
    <meta property="og:image" content="https://www.electorate.ng/meta-image.png" />
    <meta property="og:image:secure_url" content="https://www.electorate.ng/meta-image.png" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@electorating" />
    <meta name="twitter:creator" content="@electorating" />
    <meta name="twitter:title" content="Electorate — Know Who Represents You" />
    <meta name="twitter:description" content="Nigeria's definitive politician accountability and transparency platform." />
    <meta name="twitter:image" content="https://www.electorate.ng/meta-image.png" />
    <meta name="twitter:image:alt" content="Electorate — Know Who Represents You" />
  </head>
  <body>
    <p>Electorate card endpoint.</p>
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
