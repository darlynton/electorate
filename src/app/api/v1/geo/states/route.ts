import { NextResponse } from 'next/server';
import { getStates } from 'nigerian-states-lgas-and-polling-units';

export const dynamic = 'force-static';

export async function GET() {
  const raw = getStates() as { id: string; name: string }[];
  // Sort by name, normalise to title case for display
  const data = raw
    .map((s) => ({ id: s.id, name: toTitleCase(s.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ data });
}

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
