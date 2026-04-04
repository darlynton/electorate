import { NextRequest, NextResponse } from 'next/server';
import { getPollingUnitsByWard } from 'nigerian-states-lgas-and-polling-units';

export async function GET(request: NextRequest) {
  const wardId = request.nextUrl.searchParams.get('ward_id');
  if (!wardId) {
    return NextResponse.json({ error: 'ward_id is required' }, { status: 400 });
  }

  const raw = getPollingUnitsByWard(wardId) as { id: string; name: string }[];
  const data = raw
    .map((p) => ({ id: p.id, name: toTitleCase(p.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ data });
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
