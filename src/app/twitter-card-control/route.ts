import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Electorate Card Control</title>

    <meta property="og:title" content="Electorate Card Control" />
    <meta property="og:description" content="Control endpoint with external image host for debugging X card rendering." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://www.electorate.ng/twitter-card-control" />
    <meta property="og:image" content="https://res.cloudinary.com/demo/image/upload/sample.jpg" />
    <meta property="og:image:secure_url" content="https://res.cloudinary.com/demo/image/upload/sample.jpg" />
    <meta property="og:image:type" content="image/jpeg" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@electorating" />
    <meta name="twitter:creator" content="@electorating" />
    <meta name="twitter:title" content="Electorate Card Control" />
    <meta name="twitter:description" content="Control endpoint with external image host for debugging X card rendering." />
    <meta name="twitter:image" content="https://res.cloudinary.com/demo/image/upload/sample.jpg" />
  </head>
  <body>
    <p>Electorate control card endpoint.</p>
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
