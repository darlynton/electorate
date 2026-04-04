/**
 * NaijaRep Database Seed Script
 * 
 * This script populates the database with sample data for development and testing.
 * In production, real data would be sourced from official NASS records.
 * 
 * Run with: npx tsx scripts/seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Nigerian States
const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
  'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

const PARTIES = ['APC', 'PDP', 'LP', 'NNPP', 'APGA', 'ADC', 'SDP', 'YPP'];

// Sample Nigerian names
const FIRST_NAMES_MALE = [
  'Chukwuemeka', 'Adebayo', 'Ibrahim', 'Oluwaseun', 'Mohammed', 'Chibuike',
  'Abubakar', 'Nnamdi', 'Femi', 'Usman', 'Godswill', 'Babatunde', 'Yakubu',
  'Oladipo', 'Emeka', 'Aliyu', 'Rotimi', 'Kayode', 'Peter', 'John',
  'Samuel', 'Daniel', 'David', 'Michael', 'Joseph', 'Benjamin', 'Solomon',
  'Taiwo', 'Kehinde', 'Adamu', 'Musa', 'Sani', 'Hassan', 'Yusuf', 'Ahmed'
];

const FIRST_NAMES_FEMALE = [
  'Ngozi', 'Funke', 'Amina', 'Chioma', 'Fatima', 'Oluchi', 'Blessing',
  'Stella', 'Grace', 'Mercy', 'Patience', 'Joy', 'Faith', 'Hope',
  'Adaeze', 'Obiageli', 'Aisha', 'Halima', 'Zainab', 'Khadija'
];

const SURNAMES = [
  'Okonkwo', 'Adeyemi', 'Bello', 'Obaseki', 'Umahi', 'Wike', 'Akpabio',
  'Saraki', 'Tinubu', 'Buhari', 'Obi', 'Atiku', 'Kwankwaso', 'El-Rufai',
  'Fayemi', 'Aregbesola', 'Amaechi', 'Fashola', 'Osinbajo', 'Shettima',
  'Oshiomhole', 'Ndume', 'Melaye', 'Sani', 'Abbas', 'Kalu', 'Gbajabiamila',
  'Dogara', 'Mark', 'Ekweremadu', 'Lawan', 'Akume', 'Ngige', 'Onu',
  'Keyamo', 'Adetokunbo', 'Ogundipe', 'Akinwumi', 'Bakare', 'Momodu'
];

// Senate districts per state (simplified - 3 per state)
const SENATE_DISTRICTS = ['Central', 'North', 'South', 'East', 'West'];

// House of Representatives constituencies (simplified)
const generateConstituencies = (state: string, count: number): string[] => {
  const constituencies: string[] = [];
  for (let i = 1; i <= count; i++) {
    constituencies.push(`${state} Federal Constituency ${i}`);
  }
  return constituencies;
};

// Promise categories
const PROMISE_CATEGORIES = [
  'Infrastructure', 'Education', 'Healthcare', 'Economy', 'Security',
  'Agriculture', 'Youth Employment', 'Power/Energy', 'Water', 'Governance'
];

// Approximate LGA counts per state (simplified)
const LGA_COUNTS: Record<string, number> = {
  'Kano': 44, 'Lagos': 20, 'Kaduna': 23, 'Katsina': 34, 'Oyo': 33,
  'Rivers': 23, 'Bauchi': 20, 'Jigawa': 27, 'Benue': 23, 'Anambra': 21,
  'Borno': 27, 'Delta': 25, 'Imo': 27, 'Niger': 25, 'Akwa Ibom': 31,
  'Nasarawa': 13, 'Plateau': 17, 'Cross River': 18, 'Ebonyi': 13,
  'Edo': 18, 'Ekiti': 16, 'Enugu': 17, 'FCT': 6, 'Gombe': 11,
  'Kebbi': 21, 'Kogi': 21, 'Kwara': 16, 'Ogun': 20, 'Ondo': 18,
  'Osun': 30, 'Sokoto': 23, 'Taraba': 16, 'Yobe': 17, 'Zamfara': 14,
  'Abia': 17, 'Adamawa': 21, 'Bayelsa': 8,
};

// State House of Assembly seat counts (simplified)
const STATE_ASSEMBLY_SEATS: Record<string, number> = {
  'Kano': 40, 'Lagos': 40, 'Kaduna': 34, 'Katsina': 34, 'Oyo': 32,
  'Rivers': 32, 'Bauchi': 31, 'Jigawa': 30, 'Benue': 30, 'Anambra': 30,
  'Borno': 28, 'Delta': 29, 'Imo': 27, 'Niger': 27, 'Akwa Ibom': 26,
};

// Bill titles
const BILL_TITLES = [
  'Appropriation Act 2024',
  'Electoral Act Amendment Bill',
  'National Health Insurance Authority Bill',
  'Petroleum Industry Act Amendment',
  'Anti-Money Laundering Act',
  'Police Reform Bill',
  'Digital Economy Bill',
  'Agricultural Development Fund Bill',
  'Youth Employment Scheme Bill',
  'Constitutional Amendment Bill',
  'Local Government Autonomy Bill',
  'National Security Bill',
  'Universal Basic Education Amendment',
  'Minimum Wage Amendment Bill',
  'Niger Delta Development Commission Bill',
];

// Generate a random date within a range
const randomDate = (start: Date, end: Date): string => {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
};

// Generate a random name
const generateName = (gender: 'male' | 'female'): string => {
  const firstNames = gender === 'male' ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE;
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
  return `${firstName} ${surname}`;
};

// Generate slug from name
const generateSlug = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

// Main seeding function
async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await supabase.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('news_articles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('asset_declarations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('legal_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('promises').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('positions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('politicians').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Cleared existing data\n');

    // Generate Senators (3 per state + 1 for FCT = 109)
    console.log('👔 Creating Senators...');
    const senators: Array<{
      full_name: string;
      slug: string;
      state_of_origin: string;
      gender: 'male' | 'female';
      date_of_birth: string;
      education: string;
      biography: string;
    }> = [];

    for (const state of STATES) {
      const numSenators = state === 'FCT' ? 1 : 3;
      for (let i = 0; i < numSenators; i++) {
        const gender = Math.random() > 0.85 ? 'female' : 'male';
        const name = generateName(gender);
        senators.push({
          full_name: name,
          slug: generateSlug(name),
          state_of_origin: state,
          gender,
          date_of_birth: randomDate(new Date(1950, 0, 1), new Date(1985, 0, 1)),
          education: 'Bachelor of Law, University of Nigeria; Bar at Law',
          biography: `Distinguished lawmaker representing ${state} State in the Nigerian Senate.`,
        });
      }
    }

    // Generate House of Reps members (360 total)
    console.log('🏛️ Creating House Representatives...');
    const representatives: typeof senators = [];
    
    // Approximate distribution (varies by state population)
    const repDistribution: Record<string, number> = {
      'Kano': 24, 'Lagos': 24, 'Kaduna': 16, 'Katsina': 15, 'Oyo': 14,
      'Rivers': 13, 'Bauchi': 12, 'Jigawa': 11, 'Benue': 11, 'Anambra': 11,
      'Borno': 10, 'Delta': 10, 'Imo': 10, 'Niger': 10, 'Akwa Ibom': 10,
    };
    
    // Default 8 reps for states not in the distribution
    for (const state of STATES) {
      const numReps = repDistribution[state] || 8;
      for (let i = 0; i < numReps; i++) {
        const gender = Math.random() > 0.8 ? 'female' : 'male';
        const name = generateName(gender);
        representatives.push({
          full_name: name,
          slug: generateSlug(name),
          state_of_origin: state,
          gender,
          date_of_birth: randomDate(new Date(1955, 0, 1), new Date(1990, 0, 1)),
          education: 'Various degrees from Nigerian universities',
          biography: `Honorable member representing a federal constituency in ${state} State.`,
        });
      }
    }

    // Generate Governors & Deputy Governors (37 each, including FCT Minister as equivalent)
    console.log('🏛️ Creating Governors & Deputy Governors...');
    const governors: typeof senators = [];
    const deputyGovernors: typeof senators = [];

    for (const state of STATES) {
      if (state === 'FCT') continue; // FCT has no governor
      const govGender = Math.random() > 0.9 ? 'female' : 'male';
      const govName = generateName(govGender);
      governors.push({
        full_name: govName,
        slug: generateSlug(govName),
        state_of_origin: state,
        gender: govGender,
        date_of_birth: randomDate(new Date(1950, 0, 1), new Date(1980, 0, 1)),
        education: 'Various degrees from Nigerian and international universities',
        biography: `Executive Governor of ${state} State.`,
      });

      const depGovGender = Math.random() > 0.85 ? 'female' : 'male';
      const depGovName = generateName(depGovGender);
      deputyGovernors.push({
        full_name: depGovName,
        slug: generateSlug(depGovName),
        state_of_origin: state,
        gender: depGovGender,
        date_of_birth: randomDate(new Date(1955, 0, 1), new Date(1985, 0, 1)),
        education: 'Various degrees from Nigerian universities',
        biography: `Deputy Governor of ${state} State.`,
      });
    }

    // Generate State Assembly Members
    console.log('🏛️ Creating State Assembly Members...');
    const assemblyMembers: typeof senators = [];

    for (const state of STATES) {
      if (state === 'FCT') continue; // FCT has no state assembly
      const numSeats = STATE_ASSEMBLY_SEATS[state] || 24;
      for (let i = 0; i < numSeats; i++) {
        const gender = Math.random() > 0.85 ? 'female' : 'male';
        const name = generateName(gender);
        assemblyMembers.push({
          full_name: name,
          slug: generateSlug(name),
          state_of_origin: state,
          gender,
          date_of_birth: randomDate(new Date(1960, 0, 1), new Date(1992, 0, 1)),
          education: 'Various degrees from Nigerian universities',
          biography: `Member of the ${state} State House of Assembly.`,
        });
      }
    }

    // Generate LGA Chairmen (774 LGAs, excluding vice chairmen and councillors)
    console.log('🏛️ Creating LGA Chairmen...');
    const lgaChairmen: typeof senators = [];

    for (const state of STATES) {
      const numLGAs = LGA_COUNTS[state] || 15;
      for (let i = 0; i < numLGAs; i++) {
        const gender = Math.random() > 0.85 ? 'female' : 'male';
        const name = generateName(gender);
        lgaChairmen.push({
          full_name: name,
          slug: generateSlug(name),
          state_of_origin: state,
          gender,
          date_of_birth: randomDate(new Date(1960, 0, 1), new Date(1992, 0, 1)),
          education: 'Various degrees from Nigerian institutions',
          biography: `Chairman of a Local Government Area in ${state} State.`,
        });
      }
    }

    // Insert all politicians
    const allPoliticians = [
      ...senators,
      ...representatives,
      ...governors,
      ...deputyGovernors,
      ...assemblyMembers,
      ...lgaChairmen,
    ];
    console.log(`📊 Inserting ${allPoliticians.length} elected officials...`);
    
    const { data: insertedPoliticians, error: polError } = await supabase
      .from('politicians')
      .insert(allPoliticians)
      .select();

    if (polError) {
      throw new Error(`Failed to insert politicians: ${polError.message}`);
    }
    console.log(`✅ Inserted ${insertedPoliticians?.length || 0} elected officials\n`);

    // Create positions for each politician
    console.log('📍 Creating positions...');
    const positions: Array<{
      politician_id: string;
      title: string;
      chamber: 'Senate' | 'House' | 'State Assembly' | 'Executive';
      office_level: 'federal' | 'state' | 'local';
      constituency: string;
      state: string;
      party: string;
      assembly_number?: number;
      start_date: string;
      is_current: boolean;
    }> = [];

    let senatorIndex = 0;
    let repIndex = senators.length;
    let govIndex = senators.length + representatives.length;
    let depGovIndex = govIndex + governors.length;
    let assemblyIndex = depGovIndex + deputyGovernors.length;
    let lgaIndex = assemblyIndex + assemblyMembers.length;

    // Senator positions
    for (const state of STATES) {
      const numSenators = state === 'FCT' ? 1 : 3;
      for (let i = 0; i < numSenators; i++) {
        if (insertedPoliticians && insertedPoliticians[senatorIndex]) {
          positions.push({
            politician_id: insertedPoliticians[senatorIndex].id,
            title: 'Senator',
            chamber: 'Senate',
            office_level: 'federal',
            constituency: `${state} ${SENATE_DISTRICTS[i % SENATE_DISTRICTS.length]}`,
            state,
            party: PARTIES[Math.floor(Math.random() * 3)], // Mostly major parties
            assembly_number: 10,
            start_date: '2023-06-13',
            is_current: true,
          });
        }
        senatorIndex++;
      }
    }

    // House positions
    for (const state of STATES) {
      const numReps = repDistribution[state] || 8;
      for (let i = 0; i < numReps; i++) {
        if (insertedPoliticians && insertedPoliticians[repIndex]) {
          positions.push({
            politician_id: insertedPoliticians[repIndex].id,
            title: 'House Representative',
            chamber: 'House',
            office_level: 'federal',
            constituency: `${state} Federal Constituency ${i + 1}`,
            state,
            party: PARTIES[Math.floor(Math.random() * 4)],
            assembly_number: 10,
            start_date: '2023-06-13',
            is_current: true,
          });
        }
        repIndex++;
      }
    }

    // Governor positions
    for (const state of STATES) {
      if (state === 'FCT') continue;
      if (insertedPoliticians && insertedPoliticians[govIndex]) {
        positions.push({
          politician_id: insertedPoliticians[govIndex].id,
          title: 'Governor',
          chamber: 'Executive',
          office_level: 'state',
          constituency: `${state} State`,
          state,
          party: PARTIES[Math.floor(Math.random() * 3)],
          start_date: '2023-05-29',
          is_current: true,
        });
      }
      govIndex++;
    }

    // Deputy Governor positions
    for (const state of STATES) {
      if (state === 'FCT') continue;
      if (insertedPoliticians && insertedPoliticians[depGovIndex]) {
        positions.push({
          politician_id: insertedPoliticians[depGovIndex].id,
          title: 'Deputy Governor',
          chamber: 'Executive',
          office_level: 'state',
          constituency: `${state} State`,
          state,
          party: PARTIES[Math.floor(Math.random() * 3)],
          start_date: '2023-05-29',
          is_current: true,
        });
      }
      depGovIndex++;
    }

    // State Assembly positions
    for (const state of STATES) {
      if (state === 'FCT') continue;
      const numSeats = STATE_ASSEMBLY_SEATS[state] || 24;
      for (let i = 0; i < numSeats; i++) {
        if (insertedPoliticians && insertedPoliticians[assemblyIndex]) {
          positions.push({
            politician_id: insertedPoliticians[assemblyIndex].id,
            title: 'State Assembly Member',
            chamber: 'State Assembly',
            office_level: 'state',
            constituency: `${state} State Constituency ${i + 1}`,
            state,
            party: PARTIES[Math.floor(Math.random() * 4)],
            start_date: '2023-06-13',
            is_current: true,
          });
        }
        assemblyIndex++;
      }
    }

    // LGA Chairman positions
    for (const state of STATES) {
      const numLGAs = LGA_COUNTS[state] || 15;
      for (let i = 0; i < numLGAs; i++) {
        if (insertedPoliticians && insertedPoliticians[lgaIndex]) {
          positions.push({
            politician_id: insertedPoliticians[lgaIndex].id,
            title: 'LGA Chairman',
            chamber: 'Executive',
            office_level: 'local',
            constituency: `${state} LGA ${i + 1}`,
            state,
            party: PARTIES[Math.floor(Math.random() * 4)],
            start_date: '2023-06-13',
            is_current: true,
          });
        }
        lgaIndex++;
      }
    }

    const { error: posError } = await supabase.from('positions').insert(positions);
    if (posError) {
      throw new Error(`Failed to insert positions: ${posError.message}`);
    }
    console.log(`✅ Created ${positions.length} positions\n`);

    // Create votes for each politician
    console.log('🗳️ Creating voting records...');
    const votes: Array<{
      politician_id: string;
      bill_title: string;
      bill_description: string;
      vote_date: string;
      vote_type: 'yes' | 'no' | 'abstain' | 'absent';
    }> = [];

    for (const politician of insertedPoliticians || []) {
      // Each politician votes on a random subset of bills
      const numVotes = 5 + Math.floor(Math.random() * 10);
      const shuffledBills = [...BILL_TITLES].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < Math.min(numVotes, shuffledBills.length); i++) {
        const voteTypes = ['yes', 'no', 'abstain', 'absent'] as const;
        const weights = [0.6, 0.2, 0.1, 0.1]; // Most vote yes
        const random = Math.random();
        let voteType: typeof voteTypes[number] = 'yes';
        let cumulative = 0;
        for (let j = 0; j < weights.length; j++) {
          cumulative += weights[j];
          if (random < cumulative) {
            voteType = voteTypes[j];
            break;
          }
        }

        votes.push({
          politician_id: politician.id,
          bill_title: shuffledBills[i],
          bill_description: `Description for ${shuffledBills[i]}`,
          vote_date: randomDate(new Date(2023, 6, 1), new Date(2024, 0, 15)),
          vote_type: voteType,
        });
      }
    }

    const { error: voteError } = await supabase.from('votes').insert(votes);
    if (voteError) {
      throw new Error(`Failed to insert votes: ${voteError.message}`);
    }
    console.log(`✅ Created ${votes.length} vote records\n`);

    // Create attendance records
    console.log('📋 Creating attendance records...');
    const attendance: Array<{
      politician_id: string;
      session_date: string;
      session_type: 'plenary' | 'committee' | 'special';
      present: boolean;
    }> = [];

    const sessionDates: string[] = [];
    const startDate = new Date(2023, 6, 1);
    const endDate = new Date(2024, 0, 15);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
      if (d.getDay() >= 1 && d.getDay() <= 5) { // Weekdays
        sessionDates.push(d.toISOString().split('T')[0]);
      }
    }

    for (const politician of insertedPoliticians || []) {
      const attendanceRate = 0.6 + Math.random() * 0.35; // 60-95% attendance
      for (const date of sessionDates) {
        attendance.push({
          politician_id: politician.id,
          session_date: date,
          session_type: Math.random() > 0.7 ? 'committee' : 'plenary',
          present: Math.random() < attendanceRate,
        });
      }
    }

    const { error: attError } = await supabase.from('attendance').insert(attendance);
    if (attError) {
      throw new Error(`Failed to insert attendance: ${attError.message}`);
    }
    console.log(`✅ Created ${attendance.length} attendance records\n`);

    // Create campaign promises
    console.log('📜 Creating campaign promises...');
    const promises: Array<{
      politician_id: string;
      title: string;
      description: string;
      category: string;
      status: 'fulfilled' | 'in_progress' | 'not_started' | 'broken';
      made_date: string;
      fulfilled_date?: string;
    }> = [];

    for (const politician of insertedPoliticians || []) {
      const numPromises = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < numPromises; i++) {
        const category = PROMISE_CATEGORIES[Math.floor(Math.random() * PROMISE_CATEGORIES.length)];
        const statuses = ['fulfilled', 'in_progress', 'not_started', 'broken'] as const;
        const statusWeights = [0.2, 0.4, 0.3, 0.1];
        let status: typeof statuses[number] = 'not_started';
        const random = Math.random();
        let cumulative = 0;
        for (let j = 0; j < statusWeights.length; j++) {
          cumulative += statusWeights[j];
          if (random < cumulative) {
            status = statuses[j];
            break;
          }
        }

        const promise: typeof promises[0] = {
          politician_id: politician.id,
          title: `${category} improvement initiative`,
          description: `Campaign promise to improve ${category.toLowerCase()} in the constituency.`,
          category,
          status,
          made_date: randomDate(new Date(2022, 6, 1), new Date(2023, 2, 1)),
        };

        if (status === 'fulfilled') {
          promise.fulfilled_date = randomDate(new Date(2023, 6, 1), new Date(2024, 0, 1));
        }

        promises.push(promise);
      }
    }

    const { error: promiseError } = await supabase.from('promises').insert(promises);
    if (promiseError) {
      throw new Error(`Failed to insert promises: ${promiseError.message}`);
    }
    console.log(`✅ Created ${promises.length} campaign promises\n`);

    // Create some legal records (for ~10% of politicians)
    console.log('⚖️ Creating legal records...');
    const legalRecords: Array<{
      politician_id: string;
      case_title: string;
      case_type: 'criminal' | 'civil' | 'investigation' | 'petition';
      court: string;
      status: 'pending' | 'dismissed' | 'convicted' | 'acquitted' | 'closed';
      filing_date: string;
      description: string;
    }> = [];

    const politiciansWithLegal = (insertedPoliticians || [])
      .filter(() => Math.random() < 0.1);

    for (const politician of politiciansWithLegal) {
      const caseTypes = ['criminal', 'civil', 'investigation', 'petition'] as const;
      const caseType = caseTypes[Math.floor(Math.random() * caseTypes.length)];
      
      const statuses = ['pending', 'dismissed', 'convicted', 'acquitted', 'closed'] as const;
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      legalRecords.push({
        politician_id: politician.id,
        case_title: `${caseType === 'criminal' ? 'FRN v.' : ''} ${politician.full_name}`,
        case_type: caseType,
        court: caseType === 'investigation' ? 'EFCC' : 'Federal High Court, Abuja',
        status,
        filing_date: randomDate(new Date(2015, 0, 1), new Date(2023, 0, 1)),
        description: `Legal matter involving the politician.`,
      });
    }

    if (legalRecords.length > 0) {
      const { error: legalError } = await supabase.from('legal_records').insert(legalRecords);
      if (legalError) {
        throw new Error(`Failed to insert legal records: ${legalError.message}`);
      }
    }
    console.log(`✅ Created ${legalRecords.length} legal records\n`);

    // Create constituency projects
    console.log('🏗️ Creating constituency projects...');
    const projects: Array<{
      politician_id: string;
      name: string;
      description: string;
      budget: number;
      status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
      start_date: string;
      location: string;
      progress_percentage: number;
    }> = [];

    for (const politician of insertedPoliticians?.slice(0, 100) || []) {
      const numProjects = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numProjects; i++) {
        const statuses = ['planned', 'in_progress', 'completed', 'cancelled'] as const;
        const status = statuses[Math.floor(Math.random() * 3)]; // Less cancelled

        projects.push({
          politician_id: politician.id,
          name: `Constituency ${['Road', 'Hospital', 'School', 'Water Borehole', 'Market'][Math.floor(Math.random() * 5)]} Project`,
          description: 'Constituency development project.',
          budget: (50 + Math.floor(Math.random() * 500)) * 1000000, // 50M - 550M Naira
          status,
          start_date: randomDate(new Date(2023, 6, 1), new Date(2024, 0, 1)),
          location: politician.state_of_origin,
          progress_percentage: status === 'completed' ? 100 : Math.floor(Math.random() * 80),
        });
      }
    }

    const { error: projectError } = await supabase.from('projects').insert(projects);
    if (projectError) {
      throw new Error(`Failed to insert projects: ${projectError.message}`);
    }
    console.log(`✅ Created ${projects.length} constituency projects\n`);

    console.log('🎉 Database seeding completed successfully!');
    console.log(`
📊 Summary:
   - Senators: ${senators.length}
   - House Representatives: ${representatives.length}
   - Governors: ${governors.length}
   - Deputy Governors: ${deputyGovernors.length}
   - State Assembly Members: ${assemblyMembers.length}
   - LGA Chairmen: ${lgaChairmen.length}
   - Total Elected Officials: ${insertedPoliticians?.length || 0}
   - Positions: ${positions.length}
   - Votes: ${votes.length}
   - Attendance: ${attendance.length}
   - Promises: ${promises.length}
   - Legal Records: ${legalRecords.length}
   - Projects: ${projects.length}
    `);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seed
seed();
