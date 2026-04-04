import { supabase, supabaseAdmin, getSupabaseClient } from '../supabase';
import type { 
  Politician, 
  PoliticianWithRelations, 
  Position,
  Vote,
  Attendance,
  CampaignPromise,
  LegalRecord,
  NewsArticle,
  Project,
  PaginatedResponse,
  AccountabilityScore,
  PoliticianStats,
} from '@/types';
import type { PoliticianFilters, PoliticianCreate, PoliticianUpdate } from '../schemas';

// ============================================
// POLITICIAN QUERIES
// ============================================

export async function getPoliticians(
  filters: PoliticianFilters
): Promise<PaginatedResponse<Politician>> {
  const { 
    page = 1, 
    per_page = 20, 
    state, 
    party, 
    chamber,
    office_level,
    search,
    sort_by = 'name',
    sort_order = 'asc',
  } = filters;

  const offset = (page - 1) * per_page;

  let query = supabase
    .from('politicians')
    .select(`
      *,
      positions!inner (
        party,
        chamber,
        office_level,
        is_current
      )
    `, { count: 'exact' });

  // Apply filters
  if (state) {
    query = query.eq('state_of_origin', state);
  }

  if (party) {
    query = query.eq('positions.party', party);
  }

  if (chamber) {
    query = query.eq('positions.chamber', chamber);
  }

  if (office_level) {
    query = query.eq('positions.office_level', office_level);
  }

  if (search) {
    query = query.ilike('full_name', `%${search}%`);
  }

  // Only get politicians with current positions
  query = query.eq('positions.is_current', true);

  // Sorting
  const sortColumn = sort_by === 'name' ? 'full_name' : 
                     sort_by === 'state' ? 'state_of_origin' : 'full_name';
  query = query.order(sortColumn, { ascending: sort_order === 'asc' });

  // Pagination
  query = query.range(offset, offset + per_page - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch politicians: ${error.message}`);
  }

  return {
    data: data || [],
    meta: {
      page,
      per_page,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / per_page),
    },
  };
}

export async function getPoliticianBySlug(
  slug: string
): Promise<PoliticianWithRelations | null> {
  const { data, error } = await supabase
    .from('politicians')
    .select(`
      *,
      positions (*),
      votes (*),
      attendance (*),
      promises (*),
      legal_records (*),
      news_articles (*),
      projects (*),
      asset_declarations (*)
    `)
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch politician: ${error.message}`);
  }

  return data as PoliticianWithRelations;
}

export async function getPoliticianById(
  id: string
): Promise<Politician | null> {
  const { data, error } = await supabase
    .from('politicians')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch politician: ${error.message}`);
  }

  return data as Politician;
}

export async function createPolitician(
  politician: PoliticianCreate
): Promise<Politician> {
  const client = getSupabaseClient(true);
  
  const { data, error } = await client
    .from('politicians')
    .insert(politician)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create politician: ${error.message}`);
  }

  return data as Politician;
}

export async function updatePolitician(
  id: string,
  updates: PoliticianUpdate
): Promise<Politician> {
  const client = getSupabaseClient(true);
  
  const { data, error } = await client
    .from('politicians')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update politician: ${error.message}`);
  }

  return data as Politician;
}

export async function deletePolitician(id: string): Promise<void> {
  const client = getSupabaseClient(true);
  
  const { error } = await client
    .from('politicians')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete politician: ${error.message}`);
  }
}

// ============================================
// POSITION QUERIES
// ============================================

export async function getCurrentPosition(
  politicianId: string
): Promise<Position | null> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('politician_id', politicianId)
    .eq('is_current', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch position: ${error.message}`);
  }

  return data as Position;
}

export async function getPositionHistory(
  politicianId: string
): Promise<Position[]> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('politician_id', politicianId)
    .order('start_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch positions: ${error.message}`);
  }

  return data as Position[];
}

// ============================================
// VOTES QUERIES
// ============================================

export async function getVotes(
  politicianId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<Vote[]> {
  const { limit = 50, offset = 0 } = options;
  
  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('politician_id', politicianId)
    .order('vote_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch votes: ${error.message}`);
  }

  return data as Vote[];
}

// ============================================
// ATTENDANCE QUERIES
// ============================================

export async function getAttendance(
  politicianId: string
): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('politician_id', politicianId)
    .order('session_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch attendance: ${error.message}`);
  }

  return data as Attendance[];
}

export async function calculateAttendanceRate(
  politicianId: string
): Promise<number> {
  const attendance = await getAttendance(politicianId);
  
  if (attendance.length === 0) {
    return 0;
  }

  const present = attendance.filter(a => a.present).length;
  return Math.round((present / attendance.length) * 100);
}

// ============================================
// PROMISE QUERIES
// ============================================

export async function getPromises(
  politicianId: string
): Promise<CampaignPromise[]> {
  const { data, error } = await supabase
    .from('promises')
    .select('*')
    .eq('politician_id', politicianId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch promises: ${error.message}`);
  }

  return data as CampaignPromise[];
}

// ============================================
// LEGAL RECORDS QUERIES
// ============================================

export async function getLegalRecords(
  politicianId: string
): Promise<LegalRecord[]> {
  const { data, error } = await supabase
    .from('legal_records')
    .select('*')
    .eq('politician_id', politicianId)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch legal records: ${error.message}`);
  }

  return data as LegalRecord[];
}

// ============================================
// NEWS QUERIES
// ============================================

export async function getNewsArticles(
  politicianId: string,
  options: { limit?: number; category?: string } = {}
): Promise<NewsArticle[]> {
  const { limit = 20, category } = options;
  
  let query = supabase
    .from('news_articles')
    .select('*')
    .eq('politician_id', politicianId)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch news articles: ${error.message}`);
  }

  return data as NewsArticle[];
}

// ============================================
// PROJECT QUERIES
// ============================================

export async function getProjects(
  politicianId: string
): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('politician_id', politicianId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  return data as Project[];
}

// ============================================
// ACCOUNTABILITY SCORE
// ============================================

export async function calculateAccountabilityScore(
  politician: PoliticianWithRelations
): Promise<AccountabilityScore> {
  // Calculate attendance score (30%)
  const attendance = politician.attendance || [];
  const attendanceRate = attendance.length > 0
    ? (attendance.filter(a => a.present).length / attendance.length) * 100
    : 50; // Default to 50% if no data
  const attendanceScore = (attendanceRate / 100) * 30;

  // Calculate promise score (40%)
  const promises = politician.promises || [];
  const verifiedPromises = promises.filter(p => p.status !== 'unverified');
  const keptPromises = promises.filter(p => p.status === 'kept').length;
  const promiseScore = verifiedPromises.length > 0
    ? (keptPromises / verifiedPromises.length) * 40
    : 20; // Neutral if no data

  // Calculate legal score (30%)
  const legalRecords = politician.legal_records || [];
  const hasEFCCConviction = legalRecords.some(r => r.record_type === 'efcc_conviction');
  const hasICPCProsecution = legalRecords.some(r => r.record_type === 'icpc_prosecution');
  const hasInvestigation = legalRecords.some(r => r.record_type === 'efcc_investigation');
  
  let legalScore = 30; // Clean record
  if (hasEFCCConviction) {
    legalScore = 0;
  } else if (hasICPCProsecution) {
    legalScore = 10;
  } else if (hasInvestigation) {
    legalScore = 20;
  }

  const total = Math.round(attendanceScore + promiseScore + legalScore);
  
  // Determine grade and color
  let grade: AccountabilityScore['grade'];
  let color: AccountabilityScore['color'];
  
  if (total >= 80) {
    grade = 'A';
    color = 'green';
  } else if (total >= 70) {
    grade = 'B';
    color = 'green';
  } else if (total >= 60) {
    grade = 'C';
    color = 'amber';
  } else if (total >= 40) {
    grade = 'D';
    color = 'amber';
  } else {
    grade = 'F';
    color = 'red';
  }

  return {
    overall: total,
    total,
    attendance: Math.round(attendanceRate),
    attendance_score: Math.round(attendanceScore),
    voting_consistency: 75, // Default for now
    promise_fulfillment: verifiedPromises.length > 0 ? Math.round((keptPromises / verifiedPromises.length) * 100) : 50,
    promise_score: Math.round(promiseScore),
    transparency: 70, // Default for now
    constituent_engagement: 65, // Default for now
    legal_score: legalScore,
    grade,
    color,
  };
}

export async function getPoliticianStats(
  politician: PoliticianWithRelations
): Promise<PoliticianStats> {
  const attendance = politician.attendance || [];
  const votes = politician.votes || [];
  const promises = politician.promises || [];
  const legalRecords = politician.legal_records || [];

  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter(a => a.present).length / attendance.length) * 100)
    : 0;

  const hasEFCCConviction = legalRecords.some(r => r.record_type === 'efcc_conviction');
  const hasICPCProsecution = legalRecords.some(r => r.record_type === 'icpc_prosecution');
  const hasEFCCInvestigation = legalRecords.some(r => r.record_type === 'efcc_investigation');

  let efccStatus: PoliticianStats['efcc_status'] = 'clear';
  if (hasEFCCConviction) {
    efccStatus = 'convicted';
  } else if (hasICPCProsecution) {
    efccStatus = 'prosecution';
  } else if (hasEFCCInvestigation) {
    efccStatus = 'investigation';
  }

  return {
    attendance_rate: attendanceRate,
    total_votes: votes.length,
    votes_for: votes.filter(v => v.vote_type === 'yes').length,
    votes_against: votes.filter(v => v.vote_type === 'no').length,
    votes_absent: votes.filter(v => v.vote_type === 'absent').length,
    promises_total: promises.length,
    promises_kept: promises.filter(p => p.status === 'kept').length,
    promises_broken: promises.filter(p => p.status === 'broken').length,
    promises_in_progress: promises.filter(p => p.status === 'in_progress').length,
    has_legal_issues: legalRecords.length > 0,
    efcc_status: efccStatus,
  };
}

// ============================================
// STATE QUERIES
// ============================================

export async function getPoliticiansByState(
  state: string
): Promise<Politician[]> {
  const { data, error } = await supabase
    .from('politicians')
    .select(`
      *,
      positions!inner (
        is_current,
        office_level
      )
    `)
    .eq('state_of_origin', state)
    .eq('positions.is_current', true)
    .order('full_name');

  if (error) {
    throw new Error(`Failed to fetch politicians by state: ${error.message}`);
  }

  return data as Politician[];
}

// ============================================
// LEADERBOARD QUERIES
// ============================================

export async function getTopPoliticians(
  limit: number = 10
): Promise<Politician[]> {
  // This would ideally use a materialized view with pre-computed scores
  // For now, fetch all and calculate (not ideal for production)
  const { data, error } = await supabase
    .from('politicians')
    .select(`
      *,
      positions!inner (
        is_current,
        office_level
      )
    `)
    .eq('positions.is_current', true)
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch top politicians: ${error.message}`);
  }

  return data as Politician[];
}

// ============================================
// SEARCH
// ============================================

export async function searchPoliticians(
  query: string,
  limit: number = 10
): Promise<Politician[]> {
  const { data, error } = await supabase
    .from('politicians')
    .select('*')
    .ilike('full_name', `%${query}%`)
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search politicians: ${error.message}`);
  }

  return data as Politician[];
}

// ============================================
// ALL POLITICIANS (for static generation)
// ============================================

export async function getAllPoliticianSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from('politicians')
    .select('slug');

  if (error) {
    throw new Error(`Failed to fetch politician slugs: ${error.message}`);
  }

  return data?.map(p => p.slug) || [];
}
