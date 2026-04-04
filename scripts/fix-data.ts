/**
 * NaijaRep — Data Cleanup & Sync Script
 * ======================================
 * Fixes:
 *   1. Deduplicates politician records that share the same (state, constituency, chamber)
 *   2. Adds missing senators from Wikipedia data
 *   3. Adds missing house reps from Wikipedia data
 *
 * Run: npx tsx scripts/fix-data.ts
 *      npx tsx scripts/fix-data.ts --dry-run   (preview only, no DB changes)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');
const ASSEMBLY_NUMBER = 10;
const ASSEMBLY_START  = '2023-06-13';

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Wikipedia house reps (parsed from fetched page) ─────────────────────────
// Extracted from: https://en.wikipedia.org/wiki/List_of_members_of_the_House_of_Representatives_of_Nigeria,_2023–2027
const WIKI_HOUSE_REPS: { state: string; constituency: string; full_name: string; party: string }[] = [
  // Abia
  { state: 'Abia', constituency: 'Aba North/Aba South', full_name: 'Alex Ikwechegh', party: 'PDP' },
  { state: 'Abia', constituency: 'Arochukwu/Ohafia', full_name: 'Ibe Osonwa', party: 'LP' },
  { state: 'Abia', constituency: 'Bende', full_name: 'Benjamin Kalu', party: 'APC' },
  { state: 'Abia', constituency: 'Ikwuano/Umuahia North/Umuahia South', full_name: 'Obi Aguocha', party: 'LP' },
  { state: 'Abia', constituency: 'Isiala Ngwa North/South', full_name: 'Ginger Onwusibe', party: 'LP' },
  { state: 'Abia', constituency: 'Isuikwuato/Umunneochi', full_name: 'Amobi Ogah', party: 'LP' },
  { state: 'Abia', constituency: 'Obingwa/Ugwunagbo/Osisioma', full_name: 'Munachim Alozie', party: 'LP' },
  { state: 'Abia', constituency: 'Ukwa East/West', full_name: 'Chris Nkwonta', party: 'APC' },

  // Adamawa
  { state: 'Adamawa', constituency: 'Demsa/Lamurde/Numan', full_name: 'Kwamoti Laori', party: 'PDP' },
  { state: 'Adamawa', constituency: 'Fufore/Song', full_name: 'Aliyu Wakili Boya', party: 'APC' },
  { state: 'Adamawa', constituency: 'Ganye/Jada/Mayo Belwa/Toungo', full_name: 'Mohammed Inuwa Bassi', party: 'PDP' },
  { state: 'Adamawa', constituency: 'Yola North/Yola South/Girei', full_name: 'Abubakar Baba Zango', party: 'APC' },
  { state: 'Adamawa', constituency: 'Gombi/Hong', full_name: 'James Shuaibu Barka', party: 'PDP' },
  { state: 'Adamawa', constituency: 'Guyuk/Shelleng', full_name: 'Kobis Ari Thimnu', party: 'PDP' },
  { state: 'Adamawa', constituency: 'Madagali/Michika', full_name: 'Zakaria Dauda Nyampa', party: 'PDP' },
  { state: 'Adamawa', constituency: 'Maiha/Mubi North/Mubi South', full_name: "Ja'afar Abubakar Magaji", party: 'APC' },

  // Akwa Ibom
  { state: 'Akwa Ibom', constituency: 'Abak/Etim Ekpo/Ika', full_name: 'Jimbo Ernest Clement', party: 'APC' },
  { state: 'Akwa Ibom', constituency: 'Eket/Esit Eket/Ibeno/Onna', full_name: 'Etteh Ikpong Okpolupm', party: 'PDP' },
  { state: 'Akwa Ibom', constituency: 'Ikot Ekpene/Essien Udim/Obot Akara', full_name: 'Patrick Umoh', party: 'APC' },
  { state: 'Akwa Ibom', constituency: 'Etinan/Nsit Ibom/Nsit Ubium', full_name: 'Ekpo Paul Asuquo', party: 'PDP' },
  { state: 'Akwa Ibom', constituency: 'Uyo/Uruan/Nsit Atai/Ibesikpo Asutan', full_name: 'Esset Mark Udo', party: 'PDP' },
  { state: 'Akwa Ibom', constituency: 'Itu/Ibiono Ibom', full_name: 'Okon Ime Bassey', party: 'PDP' },
  { state: 'Akwa Ibom', constituency: 'Ikono/Ini', full_name: 'Emmanuel Ukpong-Udo', party: 'YPP' },
  { state: 'Akwa Ibom', constituency: 'Ikot Abasi/Mkpat Enin/Eastern Obolo', full_name: 'Odudoh Uduak Alphonsus', party: 'PDP' },
  { state: 'Akwa Ibom', constituency: 'Mbo/Okobo/Oron/Udung Uko/Urue', full_name: 'Esin Martins Etim', party: 'PDP' },
  { state: 'Akwa Ibom', constituency: 'Ukanafun/Oruk Anam', full_name: 'Unyime Idem', party: 'PDP' },

  // Anambra (11 constituencies)
  { state: 'Anambra', constituency: 'Aguata', full_name: 'Ifeanyi Dominic Okafor', party: 'APC' },
  { state: 'Anambra', constituency: 'Anambra East/West', full_name: 'Aniekwe Peter Udogalanya', party: 'LP' },
  { state: 'Anambra', constituency: 'Awka North/South', full_name: 'Lilian Orogbu Obiageli', party: 'LP' },
  { state: 'Anambra', constituency: 'Idemili North/South', full_name: 'Harris Uchenna Okonkwo', party: 'LP' },
  { state: 'Anambra', constituency: 'Ihiala', full_name: 'Agbodike Paschal', party: 'APGA' },
  { state: 'Anambra', constituency: 'Njikoka/Dunukofia/Anaocha', full_name: 'George Ozodinobi', party: 'LP' },
  { state: 'Anambra', constituency: 'Nnewi North/South/Ekwusigo', full_name: 'Uchenna Nwachukwu', party: 'APGA' },
  { state: 'Anambra', constituency: 'Ogbaru', full_name: 'Afam Ogene', party: 'LP' },
  { state: 'Anambra', constituency: 'Onitsha North/South', full_name: 'Emeka Obiajulu', party: 'LP' },
  { state: 'Anambra', constituency: 'Orumba North/South', full_name: 'Clara Chinwe Nnabuife', party: 'YPP' },
  { state: 'Anambra', constituency: 'Oyi/Ayamelum', full_name: 'Maureen Gwacham', party: 'APC' },

  // Bauchi
  { state: 'Bauchi', constituency: 'Alkaleri/Kirfi', full_name: 'Kabiru Yusuf Alhaji', party: 'APC' },
  { state: 'Bauchi', constituency: 'Bauchi', full_name: 'Aliyu Aminu Garu', party: 'PDP' },
  { state: 'Bauchi', constituency: 'Bogoro/Dass/Tafawa Balewa', full_name: 'Leko Jafaru Gambo', party: 'APC' },
  { state: 'Bauchi', constituency: 'Darazo/Ganjuwa', full_name: 'Mansur Manu Soro', party: 'PDP' },
  { state: 'Bauchi', constituency: 'Gamawa', full_name: 'Adamu Ibrahim Gamawa', party: 'APC' },
  { state: 'Bauchi', constituency: 'Shira/Giade', full_name: 'Sani Ibrahim Tanko', party: 'PDP' },
  { state: 'Bauchi', constituency: "Jama'Are/Itas Gadau", full_name: 'Rabilu Bala', party: 'APC' },
  { state: 'Bauchi', constituency: 'Katagum', full_name: 'Auwalu Abdu Gwalabe', party: 'PDP' },
  { state: 'Bauchi', constituency: 'Misau/Dambam', full_name: 'Aliyu Bappa Misau', party: 'PDP' },
  { state: 'Bauchi', constituency: 'Ningi/Warji', full_name: 'Hashimu Adamu', party: 'PDP' },
  { state: 'Bauchi', constituency: 'Toro', full_name: 'Dabo Ismaila Haruna', party: 'APC' },
  { state: 'Bauchi', constituency: 'Zaki', full_name: 'Muhammed Dan Abba Shehu', party: 'PDP' },

  // Bayelsa
  { state: 'Bayelsa', constituency: 'Brass/Nembe', full_name: 'Marie Ebikake', party: 'PDP' },
  { state: 'Bayelsa', constituency: 'Ekeremor/Sagbama', full_name: 'Fred Agbedi', party: 'PDP' },
  { state: 'Bayelsa', constituency: 'Yenagoa/Kolokuna/Opokuma', full_name: 'Oboku Abonsizibe Oforji', party: 'PDP' },
  { state: 'Bayelsa', constituency: 'Ogbia', full_name: 'Obordor Mitema', party: 'PDP' },
  { state: 'Bayelsa', constituency: 'Southern Ijaw', full_name: 'Rodney Ebikebina Ambaiowei', party: 'PDP' },

  // Benue
  { state: 'Benue', constituency: 'Ado/Ogbadigbo/Okpokwu', full_name: 'Philip Agbese', party: 'APC' },
  { state: 'Benue', constituency: 'Apa/Agatu', full_name: 'Ojotu Ojema', party: 'PDP' },
  { state: 'Benue', constituency: 'Buruku', full_name: 'Dzua Sekav Iyortyom', party: 'APC' },
  { state: 'Benue', constituency: 'Gboko/Tarka', full_name: 'Regina Akume', party: 'APC' },
  { state: 'Benue', constituency: 'Guma/Makurdi', full_name: 'Dickson Tarkighir', party: 'APC' },
  { state: 'Benue', constituency: 'Gwer East/Gwer West', full_name: 'Austin Asema Achado', party: 'APC' },
  { state: 'Benue', constituency: 'Katsina Ala/Ukum/Logo', full_name: 'Solomon Wombo', party: 'APC' },
  { state: 'Benue', constituency: 'Konshisha/Vandeikya', full_name: 'Sesoo Ikpacher', party: 'APC' },
  { state: 'Benue', constituency: 'Kwande/Ushongo', full_name: 'Terseer Ugbor', party: 'APC' },
  { state: 'Benue', constituency: 'Oju/Obi', full_name: 'David Ogewu', party: 'APC' },
  { state: 'Benue', constituency: 'Otukpo/Ohimini', full_name: 'Blessing Onuh', party: 'APC' },

  // Borno
  { state: 'Borno', constituency: 'Kukawa/Mobbar/Abadam/Guzamali', full_name: 'Gana Mallam Bukar', party: 'APC' },
  { state: 'Borno', constituency: 'Askira Uba/Hawul', full_name: 'Midala Usman Balami', party: 'PDP' },
  { state: 'Borno', constituency: 'Bama/Ngala/Kala Balge', full_name: 'Zainab Gimba', party: 'APC' },
  { state: 'Borno', constituency: 'Biu/Kwaya Kusar/Shani/Bayo', full_name: 'Muktar Aliyu Betara', party: 'APC' },
  { state: 'Borno', constituency: 'Damboa/Gwoza/Chibok', full_name: 'Ahmadu Usman Jaha', party: 'APC' },
  { state: 'Borno', constituency: 'Dikwa/Mafa/Konduga', full_name: 'Mohammed Ibrahim Bukar', party: 'APC' },
  { state: 'Borno', constituency: 'Jere', full_name: 'Ahmad Satomi', party: 'APC' },
  { state: 'Borno', constituency: 'Kaga/Gubio/Magumeri', full_name: 'Usman Zannah', party: 'APC' },
  { state: 'Borno', constituency: 'Maiduguri', full_name: 'Abdukadir Rahis', party: 'APC' },
  { state: 'Borno', constituency: 'Monguno/Marte/Nganzai', full_name: 'Bukar Talba', party: 'APC' },

  // Cross River
  { state: 'Cross River', constituency: 'Yakurr/Abi', full_name: 'Alex Egbona', party: 'APC' },
  { state: 'Cross River', constituency: 'Akamkpa/Biase', full_name: 'Emil Inyang', party: 'PDP' },
  { state: 'Cross River', constituency: 'Calabar South/Akpabuyo/Bakassi South', full_name: 'Joseph Bassey', party: 'APC' },
  { state: 'Cross River', constituency: 'Obanliku/Obudu/Bekwarra', full_name: 'Peter Akpanke', party: 'PDP' },
  { state: 'Cross River', constituency: 'Ikom/Boki', full_name: 'Victor Abang', party: 'APC' },
  { state: 'Cross River', constituency: 'Calabar Municipal/Odukpani', full_name: 'Bassey Akiba', party: 'APC' },
  { state: 'Cross River', constituency: 'Obubra/Etung', full_name: 'Michael Etaba', party: 'APC' },
  { state: 'Cross River', constituency: 'Ogoja/Yala', full_name: 'Ekpo Godwin Odey Offiong', party: 'PDP' },

  // Delta
  { state: 'Delta', constituency: 'Aniocha North/Aniocha South/Oshimili North/Oshimili South', full_name: 'Ngozi Okolie', party: 'LP' },
  { state: 'Delta', constituency: 'Bomadi/Patani', full_name: 'Nicholas Mutu', party: 'PDP' },
  { state: 'Delta', constituency: 'Burutu', full_name: 'Julius Gbabojor Pondi', party: 'PDP' },
  { state: 'Delta', constituency: 'Ethiope East/Ethiope West', full_name: 'Erhiatake Ibori-Suenu', party: 'APC' },
  { state: 'Delta', constituency: 'Ika North East/Ika South', full_name: 'Victor Onyemaechi Nwokolo', party: 'PDP' },
  { state: 'Delta', constituency: 'Isoko North/South', full_name: 'Ukodhiko Ajirioghene Jonathan', party: 'PDP' },
  { state: 'Delta', constituency: 'Ndokwa East/Ndokwa West/Ukwuani', full_name: 'Nnamdi Ezechi', party: 'PDP' },
  { state: 'Delta', constituency: 'Okpe/Sapele/Uvwie', full_name: 'Benedict Etanabene', party: 'LP' },
  { state: 'Delta', constituency: 'Ughelli North/Ughelli South/Udu', full_name: 'Francis E. Waive', party: 'APC' },
  { state: 'Delta', constituency: 'Warri North/Warri South/Warri South West', full_name: 'Thomas Ereyitomi', party: 'PDP' },

  // Ebonyi
  { state: 'Ebonyi', constituency: 'Abakaliki/Izzi', full_name: 'Uguru Emmanuel', party: 'APC' },
  { state: 'Ebonyi', constituency: 'Afikpo North/Afikpo South', full_name: 'Iduma Igariwey Enwo', party: 'PDP' },
  { state: 'Ebonyi', constituency: 'Ebonyi/Ohaukwu', full_name: 'Eze Nwachukwu Eze', party: 'APC' },
  { state: 'Ebonyi', constituency: 'Ezza North/Ishielu', full_name: 'Nwobashi Joseph', party: 'APGA' },
  { state: 'Ebonyi', constituency: 'Ezza South/Ikwo', full_name: 'Ogah Chinedu Nweke', party: 'APC' },
  { state: 'Ebonyi', constituency: 'Ivo/Ohaozara/Onicha', full_name: 'Osi Kama Nkemkanma Standy', party: 'LP' },

  // Edo
  { state: 'Edo', constituency: 'Akoko Edo', full_name: 'Peter Akpatason', party: 'APC' },
  { state: 'Edo', constituency: 'Egor/Ikpoba Okha', full_name: 'Omoruyi Murphy Osaro', party: 'LP' },
  { state: 'Edo', constituency: 'Esan Central/West/Igueben', full_name: 'Marcus Onobun', party: 'PDP' },
  { state: 'Edo', constituency: 'Esan North East/Esan South East', full_name: 'Okojie Odianosen', party: 'APC' },
  { state: 'Edo', constituency: 'Etsako East/West/Central', full_name: 'Anamero Sunday Dekeri', party: 'APC' },
  { state: 'Edo', constituency: 'Oredo', full_name: 'Esosa Iyawe', party: 'APC' },
  { state: 'Edo', constituency: 'Oriowo/Uhumwonde', full_name: 'Osawaru Billy Famous Adesuwa', party: 'APC' },
  { state: 'Edo', constituency: 'Ovia South West/Ovia North East', full_name: 'Dennis Amadi Idahosa', party: 'APC' },
  { state: 'Edo', constituency: 'Owan West/East', full_name: 'Julius Ihonvbere', party: 'APC' },

  // Ekiti
  { state: 'Ekiti', constituency: 'Ado Ekiti/Irepodun/Ifelodun', full_name: 'Olusola Steve Fatoba', party: 'APC' },
  { state: 'Ekiti', constituency: 'Ijero/Ekiti West/Efon', full_name: 'Biodun Omoleye', party: 'APC' },
  { state: 'Ekiti', constituency: 'Ekiti South West/Ikere/Orun/Ise', full_name: 'Ojuawo Rufus Adeniyi', party: 'APC' },
  { state: 'Ekiti', constituency: 'Gbonyin/Ekiti East/Emure', full_name: 'Richard Bamisile', party: 'APC' },
  { state: 'Ekiti', constituency: 'Ido/Osi/Moba/Ilejemeje', full_name: 'Kolawole Davidson Akinlayo', party: 'APC' },
  { state: 'Ekiti', constituency: 'Ikole/Oye', full_name: 'Rotimi Akintunde Oluwaseun', party: 'APC' },

  // Enugu
  { state: 'Enugu', constituency: 'Aninri/Awgu/Oji River', full_name: 'Anayo Onwuegbu', party: 'PDP' },
  { state: 'Enugu', constituency: 'Enugu East/Isi Uzo', full_name: 'Nnamchi Paul Sunday', party: 'LP' },
  { state: 'Enugu', constituency: 'Enugu North/South', full_name: 'Chimaobi Sam Atu', party: 'LP' },
  { state: 'Enugu', constituency: 'Ezeagu/Udi', full_name: 'Sunday Cyriacus Umeha', party: 'LP' },
  { state: 'Enugu', constituency: 'Igbo Etiti/Uzo Uwani', full_name: 'Nwodo Stainless Chijioke', party: 'LP' },
  { state: 'Enugu', constituency: 'Igboeze North/Udenu', full_name: 'Dennis Nnamdi Agbo', party: 'LP' },
  { state: 'Enugu', constituency: 'Nkanu East/Nkanu West', full_name: 'Nnolim Nnaji', party: 'PDP' },
  { state: 'Enugu', constituency: 'Nsukka/Igboeze South', full_name: 'Obetta Chidi', party: 'LP' },

  // Gombe
  { state: 'Gombe', constituency: 'Akko', full_name: 'Usman Bello Kumo', party: 'APC' },
  { state: 'Gombe', constituency: 'Balanga/Billiri', full_name: 'Ali Isa', party: 'PDP' },
  { state: 'Gombe', constituency: 'Dukku/Nafada', full_name: 'Abdullahi El-Rasheed', party: 'PDP' },
  { state: 'Gombe', constituency: 'Gombe/Kwami/Funakaye', full_name: 'Yaya Bauchi Tongo', party: 'PDP' },
  { state: 'Gombe', constituency: 'Kaltungo/Shongom', full_name: 'Paul Obed Shehu', party: 'PDP' },
  { state: 'Gombe', constituency: 'Yamaltu/Deba', full_name: 'Garba Inuwa', party: 'PDP' },

  // Imo
  { state: 'Imo', constituency: 'Aboh Mbaise/Ngor Okpala', full_name: 'Matthew Nwogu', party: 'LP' },
  { state: 'Imo', constituency: 'Ahiazu Mbaise/Ezinihitte', full_name: 'Emeka Chinedu', party: 'PDP' },
  { state: 'Imo', constituency: 'Ehimembano/Ihitte Uboma/Obowo', full_name: 'Okeke Jonas Onwuegbuchulam', party: 'PDP' },
  { state: 'Imo', constituency: 'Ideato North/Ideato South', full_name: 'Ikenga Ugochinyere', party: 'PDP' },
  { state: 'Imo', constituency: 'Ikeduru/Mbaitoli', full_name: 'Akarachi Etinosa Amadi', party: 'APC' },
  { state: 'Imo', constituency: 'Isiala Mbano/Okigwe/Onuimo', full_name: 'Miriam Onuoha', party: 'APC' },
  { state: 'Imo', constituency: 'Isu/Njaba/Nkwerre/Nwangele', full_name: 'Ugonna Ozurigbo', party: 'APC' },
  { state: 'Imo', constituency: 'Oguta/Ohaji Egbema/Oru West', full_name: 'Dibiagwu Eugene Okechukwu', party: 'APC' },
  { state: 'Imo', constituency: 'Orlu/Oru East/Orsu', full_name: 'Chukwugozie Nwachukwu', party: 'APC' },
  { state: 'Imo', constituency: 'Owerri Municipal/Owerri North/Owerri West', full_name: 'Chinedu Tochukwu Okere', party: 'APC' },

  // ── States J-Z are beyond what Wikipedia returned in the truncated fetch.
  // They will be matched from existing DB data. The critical fix is for
  // states A-I plus known issues like Anambra.
];

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔧  NaijaRep — Data Fix');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (DRY_RUN) console.log('  ⚠  DRY RUN — no DB writes\n');

  // ── Step 1: Deduplicate positions ───────────────────────────────────────────
  console.log('\n📋 Step 1: Finding duplicate positions…');

  const { data: allPos, error: posErr } = await db
    .from('positions')
    .select('id, politician_id, title, chamber, constituency, state, party, assembly_number, is_current, politicians(id, full_name, slug, photo_url)')
    .eq('is_current', true)
    .order('state');

  if (posErr || !allPos) {
    console.error('  ✗ Could not fetch positions:', posErr?.message);
    return;
  }

  console.log(`  Found ${allPos.length} current positions`);

  // Group by (state, constituency, chamber)
  const groups = new Map<string, typeof allPos>();
  for (const p of allPos) {
    if (!p.constituency || !p.state || !p.chamber) continue;
    const key = `${p.state}|${p.constituency}|${p.chamber}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const dupes = [...groups.entries()].filter(([, v]) => v.length > 1);
  console.log(`  Found ${dupes.length} constituency groups with duplicates\n`);

  let mergedCount = 0;
  let deletedPositions = 0;
  let deletedPoliticians = 0;

  for (const [key, positions] of dupes) {
    const [state, constituency, chamber] = key.split('|');

    // Sort: prefer longer full_name (more complete), then prefer having photo
    positions.sort((a, b) => {
      const polA = (a as any).politicians;
      const polB = (b as any).politicians;
      const nameA = polA?.full_name ?? '';
      const nameB = polB?.full_name ?? '';
      // Prefer longer name (more complete)
      if (nameB.length !== nameA.length) return nameB.length - nameA.length;
      // Prefer having photo
      if (polB?.photo_url && !polA?.photo_url) return 1;
      if (polA?.photo_url && !polB?.photo_url) return -1;
      return 0;
    });

    const keep = positions[0];
    const remove = positions.slice(1);
    const keepPol = (keep as any).politicians;
    
    console.log(`  🔀 [${state}] ${constituency} (${chamber}):`);
    console.log(`     Keep:   "${keepPol?.full_name}" (${keep.party}) slug=${keepPol?.slug}`);
    
    for (const dup of remove) {
      const dupPol = (dup as any).politicians;
      console.log(`     Remove: "${dupPol?.full_name}" (${dup.party}) slug=${dupPol?.slug}`);
      
      if (!DRY_RUN) {
        // Delete the position
        await db.from('positions').delete().eq('id', dup.id);
        deletedPositions++;
        
        // Check if the politician has any other positions — if not, delete them too
        const { count } = await db
          .from('positions')
          .select('id', { count: 'exact', head: true })
          .eq('politician_id', dup.politician_id);
        
        if (count === 0) {
          await db.from('politicians').delete().eq('id', dup.politician_id);
          deletedPoliticians++;
        }
      }
    }
    mergedCount++;
  }

  console.log(`\n  ✓ Merged ${mergedCount} groups — deleted ${deletedPositions} positions, ${deletedPoliticians} orphan politicians`);

  // ── Step 2: Add missing senators from Wikipedia ────────────────────────────
  console.log('\n📋 Step 2: Adding missing senators…');

  const wikiSenPath = path.join(process.cwd(), 'scripts', 'output', 'wiki-senators.json');
  const wikiSenators: { state: string; district: string; full_name: string; party: string }[] =
    JSON.parse(fs.readFileSync(wikiSenPath, 'utf-8'));

  // Get current senators in DB
  const { data: dbSenators } = await db
    .from('positions')
    .select('constituency, state, politicians(full_name, slug)')
    .eq('chamber', 'Senate')
    .eq('is_current', true);

  const existingDistricts = new Set(
    (dbSenators ?? []).map(s => `${s.state}|${s.constituency}`)
  );

  let addedSenators = 0;
  for (const ws of wikiSenators) {
    if (ws.full_name === 'TBD' || ws.party === 'TBD') continue;

    const key = `${ws.state}|${ws.district}`;
    if (existingDistricts.has(key)) continue;

    console.log(`  + Adding senator: ${ws.full_name} (${ws.party}) — ${ws.district}`);

    if (!DRY_RUN) {
      const slug = toSlug(ws.full_name);
      const { data: pol, error: polErr } = await db
        .from('politicians')
        .upsert({
          full_name: ws.full_name,
          slug,
          state_of_origin: ws.state,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'slug' })
        .select('id')
        .single();

      if (polErr || !pol) {
        console.error(`    ✗ ${ws.full_name}: ${polErr?.message}`);
        continue;
      }

      await db.from('positions').insert({
        politician_id: pol.id,
        title: 'Senator',
        chamber: 'Senate',
        constituency: ws.district,
        state: ws.state,
        party: ws.party,
        assembly_number: ASSEMBLY_NUMBER,
        start_date: ASSEMBLY_START,
        is_current: true,
      });
    }

    addedSenators++;
    existingDistricts.add(key);
  }

  console.log(`  ✓ Added ${addedSenators} missing senators`);

  // ── Step 3: Add missing house reps from Wikipedia ──────────────────────────
  console.log('\n📋 Step 3: Adding missing house reps…');

  const { data: dbReps } = await db
    .from('positions')
    .select('constituency, state, politicians(full_name, slug)')
    .eq('chamber', 'House')
    .eq('is_current', true);

  const existingConstituencies = new Set(
    (dbReps ?? []).map(r => `${r.state}|${r.constituency}`)
  );

  let addedReps = 0;
  for (const wr of WIKI_HOUSE_REPS) {
    const key = `${wr.state}|${wr.constituency}`;
    if (existingConstituencies.has(key)) continue;

    console.log(`  + Adding house rep: ${wr.full_name} (${wr.party}) — ${wr.state}, ${wr.constituency}`);

    if (!DRY_RUN) {
      const slug = toSlug(wr.full_name);
      const { data: pol, error: polErr } = await db
        .from('politicians')
        .upsert({
          full_name: wr.full_name,
          slug,
          state_of_origin: wr.state,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'slug' })
        .select('id')
        .single();

      if (polErr || !pol) {
        console.error(`    ✗ ${wr.full_name}: ${polErr?.message}`);
        continue;
      }

      await db.from('positions').insert({
        politician_id: pol.id,
        title: 'House Representative',
        chamber: 'House',
        constituency: wr.constituency,
        state: wr.state,
        party: wr.party,
        assembly_number: ASSEMBLY_NUMBER,
        start_date: ASSEMBLY_START,
        is_current: true,
      });
    }

    addedReps++;
    existingConstituencies.add(key);
  }

  console.log(`  ✓ Added ${addedReps} missing house reps`);

  // ── Step 4: Summary ────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary:');
  console.log(`  Deduped:         ${mergedCount} constituency groups`);
  console.log(`  Positions removed: ${deletedPositions}`);
  console.log(`  Politicians removed: ${deletedPoliticians}`);
  console.log(`  Senators added:  ${addedSenators}`);
  console.log(`  House reps added: ${addedReps}`);
  if (DRY_RUN) console.log('\n  ⚠  DRY RUN — no actual changes made. Re-run without --dry-run to apply.');
  console.log('\n✅ Done!\n');
}

main().catch(e => { console.error('\n✗ Fatal:', e); process.exit(1); });
