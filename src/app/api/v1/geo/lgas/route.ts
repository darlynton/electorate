import { NextRequest, NextResponse } from 'next/server';
import { getLGAsByState } from 'nigerian-states-lgas-and-polling-units';

export async function GET(request: NextRequest) {
  const stateId = request.nextUrl.searchParams.get('state_id');
  if (!stateId) {
    return NextResponse.json({ error: 'state_id is required' }, { status: 400 });
  }

  const raw = getLGAsByState(stateId) as { id: string; name: string }[];
  const data = raw
    .map((l) => ({ id: l.id, name: toTitleCase(l.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ data });
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
