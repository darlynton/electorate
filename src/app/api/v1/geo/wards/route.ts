import { NextRequest, NextResponse } from 'next/server';
import { getWardsByLGA } from 'nigerian-states-lgas-and-polling-units';

export async function GET(request: NextRequest) {
  const lgaId = request.nextUrl.searchParams.get('lga_id');
  if (!lgaId) {
    return NextResponse.json({ error: 'lga_id is required' }, { status: 400 });
  }

  const raw = getWardsByLGA(lgaId) as { id: string; name: string }[];
  const data = raw
    .map((w) => ({ id: w.id, name: toTitleCase(w.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ data });
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
