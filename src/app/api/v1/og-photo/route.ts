import { NextRequest } from 'next/server';

/**
 * Proxies politician photos from Supabase storage.
 * Supabase sends x-robots-tag: none which causes X to reject images.
 * This route fetches the image and re-serves it with clean headers.
 * 
 * Usage: /api/v1/og-photo?url=https://dpsgvyqicwluogjzgnlt.supabase.co/...
 */
export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // Only allow proxying from our Supabase instance
  if (!imageUrl.includes('supabase.co/')) {
    return new Response('Only Supabase URLs allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(imageUrl, {
      headers: { 'Accept': 'image/*' },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!upstream.ok) {
      return new Response('Upstream image fetch failed', { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(body.byteLength),
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch {
    return new Response('Image proxy error', { status: 500 });
  }
}
