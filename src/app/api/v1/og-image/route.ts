import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * API route that serves the OG image dynamically.
 * Bypasses Vercel's static file serving entirely — gives us full control
 * over every response header. No middleware, no edge caching quirks.
 */
export async function GET() {
  const buf = await readFile(join(process.cwd(), 'public', 'meta-image.jpg'));

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
}
