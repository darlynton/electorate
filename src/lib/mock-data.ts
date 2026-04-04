/**
 * Shared mock data used across pages and the search API fallback.
 * This is used when Supabase is not configured (development / demo mode).
 */

export const mockPoliticiansData = [
  {
    id: '1', full_name: 'Godswill Obot Akpabio', slug: 'godswill-obot-akpabio', photo_url: undefined as string | undefined,
    state_of_origin: 'Akwa Ibom',
    position: { id: 'p1', title: 'Senate President', chamber: 'Senate', office_level: 'federal', party: 'APC', state: 'Akwa Ibom' },
  },
  {
    id: '2', full_name: 'Michael Opeyemi Bamidele', slug: 'michael-opeyemi-bamidele', photo_url: undefined as string | undefined,
    state_of_origin: 'Ekiti',
    position: { id: 'p2', title: 'Senate Majority Leader', chamber: 'Senate', office_level: 'federal', party: 'APC', state: 'Ekiti' },
  },
  {
    id: '3', full_name: 'Abba Patrick Moro', slug: 'abba-patrick-moro', photo_url: undefined as string | undefined,
    state_of_origin: 'Benue',
    position: { id: 'p3', title: 'Senator', chamber: 'Senate', office_level: 'federal', party: 'PDP', state: 'Benue' },
  },
  {
    id: '4', full_name: 'Mohammed Ali Ndume', slug: 'mohammed-ali-ndume', photo_url: undefined as string | undefined,
    state_of_origin: 'Borno',
    position: { id: 'p4', title: 'Senator', chamber: 'Senate', office_level: 'federal', party: 'APC', state: 'Borno' },
  },
  {
    id: '5', full_name: 'Abbas Tajudeen', slug: 'abbas-tajudeen', photo_url: undefined as string | undefined,
    state_of_origin: 'Kaduna',
    position: { id: 'p5', title: 'Speaker', chamber: 'House', office_level: 'federal', party: 'APC', state: 'Kaduna' },
  },
  {
    id: '6', full_name: 'Benjamin Okezie Kalu', slug: 'benjamin-okezie-kalu', photo_url: undefined as string | undefined,
    state_of_origin: 'Abia',
    position: { id: 'p6', title: 'Deputy Speaker', chamber: 'House', office_level: 'federal', party: 'APC', state: 'Abia' },
  },
  {
    id: '7', full_name: 'Leke Joseph Abejide', slug: 'leke-joseph-abejide', photo_url: undefined as string | undefined,
    state_of_origin: 'Kogi',
    position: { id: 'p7', title: 'House Representative', chamber: 'House', office_level: 'federal', party: 'ADC', state: 'Kogi' },
  },
  {
    id: '8', full_name: 'Babajide Sanwo-Olu', slug: 'babajide-sanwo-olu', photo_url: undefined as string | undefined,
    state_of_origin: 'Lagos',
    position: { id: 'p8', title: 'Governor', chamber: 'Executive', office_level: 'state', party: 'APC', state: 'Lagos' },
  },
  {
    id: '9', full_name: 'Alex Otti', slug: 'alex-otti', photo_url: undefined as string | undefined,
    state_of_origin: 'Abia',
    position: { id: 'p9', title: 'Governor', chamber: 'Executive', office_level: 'state', party: 'LP', state: 'Abia' },
  },
  {
    id: '10', full_name: 'Bala Muhammed', slug: 'bala-muhammed', photo_url: undefined as string | undefined,
    state_of_origin: 'Bauchi',
    position: { id: 'p10', title: 'Governor', chamber: 'Executive', office_level: 'state', party: 'PDP', state: 'Bauchi' },
  },
  {
    id: '15', full_name: 'Seyi Makinde', slug: 'seyi-makinde', photo_url: undefined as string | undefined,
    state_of_origin: 'Oyo',
    position: { id: 'p15', title: 'Governor', chamber: 'Executive', office_level: 'state', party: 'PDP', state: 'Oyo' },
  },
  {
    id: '11', full_name: 'Mudashiru Obasa', slug: 'mudashiru-obasa', photo_url: undefined as string | undefined,
    state_of_origin: 'Lagos',
    position: { id: 'p11', title: 'Speaker, Lagos State Assembly', chamber: 'State Assembly', office_level: 'state', party: 'APC', state: 'Lagos' },
  },
  {
    id: '12', full_name: 'Kabiru Alhassan Rurum', slug: 'kabiru-rurum', photo_url: undefined as string | undefined,
    state_of_origin: 'Kano',
    position: { id: 'p12', title: 'Speaker, Kano State Assembly', chamber: 'State Assembly', office_level: 'state', party: 'NNPP', state: 'Kano' },
  },
  {
    id: '16', full_name: 'Adewale Remo', slug: 'adewale-remo', photo_url: undefined as string | undefined,
    state_of_origin: 'Ogun',
    position: { id: 'p16', title: 'Assembly Member', chamber: 'State Assembly', office_level: 'state', party: 'APC', state: 'Ogun' },
  },
  {
    id: '13', full_name: 'Segun Oniru', slug: 'segun-oniru', photo_url: undefined as string | undefined,
    state_of_origin: 'Lagos',
    position: { id: 'p13', title: 'LGA Chairman, Eti-Osa', chamber: 'Executive', office_level: 'local', party: 'APC', state: 'Lagos' },
  },
  {
    id: '14', full_name: 'Ibrahim Musa Gaiwa', slug: 'ibrahim-gaiwa', photo_url: undefined as string | undefined,
    state_of_origin: 'Kano',
    position: { id: 'p14', title: 'LGA Chairman, Fagge', chamber: 'Executive', office_level: 'local', party: 'NNPP', state: 'Kano' },
  },
  {
    id: '17', full_name: 'Adekunle Adeyemi', slug: 'adekunle-adeyemi', photo_url: undefined as string | undefined,
    state_of_origin: 'Oyo',
    position: { id: 'p17', title: 'LGA Chairman, Ibadan North', chamber: 'Executive', office_level: 'local', party: 'PDP', state: 'Oyo' },
  },
];

/** Returns true when Supabase is not configured (env vars are placeholders or empty) */
export function isSupabaseMock(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return !url || url.includes('your-project') || url === 'https://your-project.supabase.co';
}

/** Search mock data by name or state, returns results shaped for the search API */
export function searchMockPoliticians(query: string, limit = 10) {
  const q = query.toLowerCase();
  return mockPoliticiansData
    .filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.state_of_origin.toLowerCase().includes(q) ||
        p.position.title.toLowerCase().includes(q) ||
        p.position.party.toLowerCase().includes(q)
    )
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      full_name: p.full_name,
      state_of_origin: p.state_of_origin,
      photo_url: p.photo_url,
      position: {
        title: p.position.title,
        party: p.position.party,
        chamber: p.position.chamber,
      },
    }));
}
