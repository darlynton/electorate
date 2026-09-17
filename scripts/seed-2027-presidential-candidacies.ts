import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const overviewSource = 'https://www.premiumtimesng.com/news/top-news/884059-tinubu-atiku-obi-others-emerge-as-presidential-candidates-amid-uncertainties-over-inecs-powers.html';

// Party nominations and candidate identities are recorded from linked reporting.
// Photos use Wikimedia Commons where an appropriate portrait is available; the
// Makinde photo remains served by the reporting outlet that published the nomination.
const candidates = [
  {
    full_name: 'Bola Ahmed Tinubu',
    slug: 'bola-ahmed-tinubu',
    state_of_origin: 'Lagos',
    gender: 'male' as const,
    biography: 'President of Nigeria and presidential candidate of the All Progressives Congress for the 2027 general election.',
    photo_url: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Bola_Tinubu_portrait_%28cropped%29.jpg',
    party: 'All Progressives Congress (APC)',
    source_url: overviewSource,
  },
  {
    full_name: 'Atiku Abubakar',
    slug: 'atiku-abubakar',
    state_of_origin: 'Adamawa',
    gender: 'male' as const,
    biography: 'Former Vice President of Nigeria and presidential candidate of the African Democratic Congress for the 2027 general election.',
    photo_url: 'https://upload.wikimedia.org/wikipedia/commons/5/5d/Atiku_Abubakar_2023.jpg',
    party: 'African Democratic Congress (ADC)',
    source_url: overviewSource,
  },
  {
    full_name: 'Peter Obi',
    slug: 'peter-obi',
    state_of_origin: 'Anambra',
    gender: 'male' as const,
    biography: 'Former Governor of Anambra State and presidential candidate of the Nigeria Democratic Congress for the 2027 general election.',
    photo_url: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Peter_Obi_2022.jpg',
    party: 'Nigeria Democratic Congress (NDC)',
    source_url: 'https://www.premiumtimesng.com/news/top-news/884054-peter-obi-emerges-ndc-presidential-flag-bearer-pledges-10000mw-power-boost.html',
  },
  {
    full_name: 'Adewole Adebayo',
    slug: 'adewole-adebayo',
    state_of_origin: 'Ondo',
    gender: 'male' as const,
    biography: 'Legal practitioner and presidential candidate of the Social Democratic Party for the 2027 general election.',
    photo_url: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/ADEWOLE_ADEBAYO.jpg',
    party: 'Social Democratic Party (SDP)',
    source_url: 'https://www.premiumtimesng.com/news/top-news/908285-2027-sdp-presidential-candidate-unveils-blueprint-to-address-poverty-insecurity.html',
  },
  {
    full_name: 'Omoyele Sowore',
    slug: 'omoyele-sowore',
    state_of_origin: 'Ondo',
    gender: 'male' as const,
    biography: 'Human rights activist and presidential candidate of the African Action Congress for the 2027 general election.',
    photo_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Omoyele_Sowore_%2829682338514%29.jpg',
    party: 'African Action Congress (AAC)',
    source_url: 'https://www.premiumtimesng.com/news/top-news/882985-2027-sowore-emerges-aac-presidential-candidate.html',
  },
  {
    full_name: 'Seyi Makinde',
    slug: 'seyi-makinde',
    state_of_origin: 'Oyo',
    gender: 'male' as const,
    biography: 'Governor of Oyo State and presidential candidate of the Allied People’s Movement for the 2027 general election.',
    photo_url: 'https://i0.wp.com/media.premiumtimesng.com/wp-content/files/2026/05/699830527_1517154496432401_802585764269503322_n.jpg?fit=1000%2C667&ssl=1',
    party: 'Allied People’s Movement (APM)',
    source_url: 'https://www.premiumtimesng.com/regional/ssouth-west/884046-2027-makinde-emerges-apm-presidential-candidate-pledges-to-reform-national-security.html',
  },
];

async function seedCandidacies() {
  const { data: race, error: raceError } = await supabase
    .from('election_races')
    .select('id')
    .eq('slug', '2027-president-national')
    .single();

  if (raceError || !race) {
    throw raceError ?? new Error('The 2027 presidential race was not found');
  }

  for (const candidate of candidates) {
    const { data: politician, error: politicianError } = await supabase
      .from('politicians')
      .upsert(
        {
          full_name: candidate.full_name,
          slug: candidate.slug,
          state_of_origin: candidate.state_of_origin,
          gender: candidate.gender,
          biography: candidate.biography,
          photo_url: candidate.photo_url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug' },
      )
      .select('id, full_name, slug, photo_url')
      .single();

    if (politicianError || !politician) {
      throw politicianError ?? new Error(`Could not save ${candidate.full_name}`);
    }

    const { error: candidacyError } = await supabase.from('candidacies').upsert(
      {
        election_race_id: race.id,
        politician_id: politician.id,
        party: candidate.party,
        status: 'nominated',
        source_name: 'Premium Times Nigeria',
        source_url: candidate.source_url,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'election_race_id,politician_id' },
    );

    if (candidacyError) throw candidacyError;
    console.log(`Added ${politician.full_name} (${candidate.party})`);
  }
}

seedCandidacies().catch((error) => {
  console.error(error);
  process.exit(1);
});
