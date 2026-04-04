// Electorate - Core Types
// All database entity types matching the PostgreSQL schema

export type UUID = string;

// ============================================
// INEC GEOGRAPHIC HIERARCHY
// ============================================

export interface InecState {
  id: string;
  name: string;
  created_at: string;
}

export interface InecLga {
  id: string;
  name: string;
  state_id: string;
  created_at: string;
}

export interface InecWard {
  id: string;
  name: string;
  lga_id: string;
  federal_constituency_id?: string;
  state_constituency_id?: string;
  created_at: string;
}

export interface InecPollingUnit {
  id: string;
  name: string;
  ward_id: string;
  created_at: string;
}

// ============================================
// POLITICAL MAPPING
// ============================================

export interface SenatorialDistrict {
  id: UUID;
  name: string;
  state_id: string;
  created_at: string;
}

export interface FederalConstituency {
  id: UUID;
  name: string;
  state_id: string;
  senatorial_district_id?: UUID;
  created_at: string;
}

export interface StateConstituency {
  id: UUID;
  name: string;
  state_id: string;
  federal_constituency_id?: UUID;
  created_at: string;
}

export interface LgaChairmanship {
  id: UUID;
  lga_id: string;
  senatorial_district_id?: UUID;
  created_at: string;
}

// ============================================
// USER PROFILES
// ============================================

export interface UserProfile {
  id: UUID;
  phone_number: string;
  display_name?: string | null;
  state_id?: string | null;
  lga_id?: string | null;
  ward_id?: string | null;
  polling_unit_id?: string | null;
  location_verified: boolean;
  location_last_updated_at?: string | null;
  is_admin?: boolean;
  approved_count: number;
  contribution_score: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// POLITICIANS
// ============================================

export interface Education {
  institution: string;
  degree: string;
  year?: number;
}

export interface Politician {
  id: UUID;
  full_name: string;
  slug: string;
  photo_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  state_of_origin: string;
  lga_of_origin?: string;
  education?: Education[] | string;
  biography?: string;
  nin_partial?: string;
  // Contact details
  contact_phone?: string;
  contact_email?: string;
  office_address?: string;
  // Social media
  website_url?: string;
  twitter_handle?: string;
  facebook_url?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  youtube_url?: string;
  linkedin_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PoliticianWithRelations extends Politician {
  positions?: Position[];
  votes?: Vote[];
  attendance?: Attendance[];
  promises?: CampaignPromise[];
  legal_records?: LegalRecord[];
  news_articles?: NewsArticle[];
  projects?: Project[];
  asset_declarations?: AssetDeclaration[];
  accountability_score?: number;
  attendance_rate?: number;
}

// ============================================
// POSITIONS
// ============================================

export type OfficeLevel = 'federal' | 'state' | 'local';

export type Chamber = 'Senate' | 'House' | 'State Assembly' | 'Executive';

export interface Position {
  id: UUID;
  politician_id: UUID;
  title: string;
  chamber?: Chamber;
  office_level: OfficeLevel;
  constituency?: string;
  state?: string;
  party: string;
  assembly_number?: number;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  created_at: string;
}

// ============================================
// VOTES
// ============================================

export type VoteCast = 'yes' | 'no' | 'abstain' | 'absent';

export interface Vote {
  id: UUID;
  politician_id: UUID;
  bill_title: string;
  bill_description?: string;
  bill_id?: string;
  vote_type: VoteCast;
  vote_date: string;
  bill_url?: string;
  session?: string;
  source_url?: string;
  created_at: string;
}

// ============================================
// ATTENDANCE
// ============================================

export interface Attendance {
  id: UUID;
  politician_id: UUID;
  session_date: string;
  session_type?: 'plenary' | 'committee' | 'special' | 'cabinet' | 'executive_council';
  present: boolean;
  source_url?: string;
  created_at: string;
}

// ============================================
// PROMISES
// ============================================

export type PromiseStatus = 'kept' | 'broken' | 'in_progress' | 'abandoned' | 'unverified';
export type PromiseCategory = 
  | 'infrastructure' 
  | 'health' 
  | 'education' 
  | 'security' 
  | 'economy' 
  | 'agriculture' 
  | 'governance'
  | 'youth_employment'
  | 'power_energy'
  | 'water'
  | 'other';

export interface CampaignPromise {
  id: UUID;
  politician_id: UUID;
  promise_text: string;
  title?: string; // alias for promise_text
  description?: string;
  category?: PromiseCategory;
  status: PromiseStatus;
  made_date?: string;
  fulfilled_date?: string;
  evidence_url?: string;
  source?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// LEGAL RECORDS
// ============================================

export type LegalRecordType = 
  | 'criminal'
  | 'civil'
  | 'investigation'
  | 'petition'
  | 'efcc_investigation' 
  | 'efcc_conviction' 
  | 'icpc_prosecution' 
  | 'court_judgment' 
  | 'cct_proceedings' 
  | 'acquittal';

export type LegalStatus = 'pending' | 'active' | 'dismissed' | 'convicted' | 'acquitted' | 'closed' | 'under_investigation';

export interface LegalRecord {
  id: UUID;
  politician_id: UUID;
  title: string;
  record_type: LegalRecordType;
  court?: string;
  status?: LegalStatus;
  date?: string;
  description?: string;
  resolution_date?: string;
  case_number?: string;
  outcome?: string;
  source_url?: string;
  verified?: boolean;
  created_at: string;
  updated_at?: string;
}

// ============================================
// NEWS ARTICLES
// ============================================

export type NewsCategory = 'corruption' | 'legislation' | 'constituency' | 'general';
export type NewsSentiment = 'positive' | 'negative' | 'neutral';

export interface NewsArticle {
  id: UUID;
  politician_id: UUID;
  title?: string;
  headline?: string;
  source_name: string;
  source_url: string;
  published_at: string;
  summary?: string;
  excerpt?: string;
  sentiment?: NewsSentiment;
  category?: NewsCategory;
  is_verified_source?: boolean;
  created_at: string;
}

// ============================================
// PROJECTS
// ============================================

export type ProjectStatus = 'planned' | 'not_started' | 'in_progress' | 'completed' | 'cancelled' | 'abandoned';
export type ProjectCategory = 'road' | 'health' | 'school' | 'water' | 'electricity' | 'other';

export interface Project {
  id: UUID;
  politician_id: UUID;
  name: string;
  title?: string;
  description?: string;
  category?: ProjectCategory;
  budget?: number;
  status: ProjectStatus;
  start_date?: string;
  expected_completion?: string;
  actual_completion?: string;
  location?: string;
  state?: string;
  lga?: string;
  contractor?: string;
  progress_percentage?: number;
  allocated_amount?: number;
  budget_year?: number;
  evidence_photos?: string[];
  source_url?: string;
  reported_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// ASSET DECLARATIONS
// ============================================

export type AssetDeclarationStatus = 'filed' | 'not_filed' | 'filed_not_public' | 'unknown';

export interface AssetDeclaration {
  id: UUID;
  politician_id: UUID;
  declaration_year: number;
  status: AssetDeclarationStatus;
  document_url?: string;
  source?: string;
  created_at: string;
}

// ============================================
// USERS
// ============================================

export type BadgeType = 
  | 'verified_voter'
  | 'promise_watcher'
  | 'constituency_guardian'
  | 'fact_checker'
  | 'streak_7'
  | 'streak_30'
  | 'top_reporter'
  | 'early_adopter';

export interface User {
  id: UUID;
  username?: string;
  display_name?: string;
  state?: string;
  lga?: string;
  is_verified_voter: boolean;
  points: number;
  badges: BadgeType[];
  streak_days: number;
  last_active?: string;
  created_at: string;
}

// ============================================
// TIPS
// ============================================

export type TipType = 'broken_promise' | 'project_update' | 'corruption_allegation' | 'news_tip' | 'correction';
export type TipStatus = 'pending' | 'verified' | 'rejected';

export interface Tip {
  id: UUID;
  user_id?: UUID;
  politician_id?: UUID;
  tip_type: TipType;
  content: string;
  evidence_url?: string;
  status: TipStatus;
  points_awarded: number;
  created_at: string;
}

// ============================================
// PREDICTIONS
// ============================================

export interface Prediction {
  id: UUID;
  user_id: UUID;
  race_id: string;
  predicted_winner: string;
  is_correct?: boolean;
  points_awarded: number;
  created_at: string;
}

// ============================================
// API TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface APIError {
  error: string;
  message: string;
  status: number;
}

// ============================================
// FILTER TYPES
// ============================================

export interface PoliticianFilters {
  state?: string;
  party?: string;
  chamber?: Chamber;
  office_level?: OfficeLevel;
  search?: string;
  min_score?: number;
  max_score?: number;
  has_efcc_record?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: 'name' | 'score' | 'attendance' | 'state';
  sort_order?: 'asc' | 'desc';
}

// ============================================
// NIGERIAN STATES & PARTIES
// ============================================

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
  'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
] as const;

export type NigerianState = typeof NIGERIAN_STATES[number];

export const GEOPOLITICAL_ZONES: Record<string, readonly string[]> = {
  'North-Central': ['Benue', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Plateau', 'FCT'],
  'North-East': ['Adamawa', 'Bauchi', 'Borno', 'Gombe', 'Taraba', 'Yobe'],
  'North-West': ['Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara'],
  'South-East': ['Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo'],
  'South-South': ['Akwa Ibom', 'Bayelsa', 'Cross River', 'Delta', 'Edo', 'Rivers'],
  'South-West': ['Ekiti', 'Lagos', 'Ogun', 'Ondo', 'Osun', 'Oyo'],
} as const;

export type GeopoliticalZone = keyof typeof GEOPOLITICAL_ZONES;

export const POLITICAL_PARTIES = [
  { code: 'APC', name: 'All Progressives Congress' },
  { code: 'PDP', name: "People's Democratic Party" },
  { code: 'LP', name: 'Labour Party' },
  { code: 'NNPP', name: 'New Nigeria People\'s Party' },
  { code: 'APGA', name: 'All Progressives Grand Alliance' },
  { code: 'ADC', name: 'African Democratic Congress' },
  { code: 'SDP', name: 'Social Democratic Party' },
  { code: 'YPP', name: 'Young Progressive Party' },
  { code: 'PRP', name: "People's Redemption Party" },
  { code: 'ZLP', name: 'Zenith Labour Party' },
] as const;

export type PartyCode = typeof POLITICAL_PARTIES[number]['code'];

export const OFFICE_LEVELS = [
  { value: 'federal' as const, label: 'Federal' },
  { value: 'state' as const, label: 'State' },
  { value: 'local' as const, label: 'Local Government' },
] as const;

export const OFFICE_TITLES: Record<string, { chamber: Chamber; office_level: OfficeLevel }> = {
  'President': { chamber: 'Executive', office_level: 'federal' },
  'Vice President': { chamber: 'Executive', office_level: 'federal' },
  'Senator': { chamber: 'Senate', office_level: 'federal' },
  'House Representative': { chamber: 'House', office_level: 'federal' },
  'Governor': { chamber: 'Executive', office_level: 'state' },
  'Deputy Governor': { chamber: 'Executive', office_level: 'state' },
  'State Assembly Member': { chamber: 'State Assembly', office_level: 'state' },
  'LGA Chairman': { chamber: 'Executive', office_level: 'local' },
};

// ============================================
// COMPUTED TYPES
// ============================================

export interface AccountabilityScore {
  overall: number;
  total?: number;
  attendance: number;
  attendance_score?: number;
  voting_consistency: number;
  promise_fulfillment: number;
  promise_score?: number;
  transparency: number;
  constituent_engagement: number;
  legal_score?: number;
  trend?: 'up' | 'down' | 'stable';
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  color?: 'green' | 'amber' | 'red';
  last_updated?: string;
}

// ============================================
// CROWD-SOURCED RATINGS
// ============================================

export interface PoliticianRating {
  id: UUID;
  user_id: UUID;
  politician_id: UUID;
  rating_period: string;
  // Legislator dimensions
  constituency_presence?: number;
  legislative_activity?: number;
  constituency_projects?: number;
  accessibility?: number;
  transparency_score?: number;
  // Executive dimensions
  infrastructure?: number;
  security?: number;
  healthcare_education?: number;
  economic_activity?: number;
  transparency_communication?: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface PoliticianStats {
  attendance_rate: number;
  total_votes: number;
  votes_for: number;
  votes_against: number;
  votes_absent: number;
  promises_total: number;
  promises_kept: number;
  promises_broken: number;
  promises_in_progress: number;
  has_legal_issues: boolean;
  efcc_status: 'clear' | 'investigation' | 'prosecution' | 'convicted';
}

export interface StateStats {
  state: NigerianState;
  total_politicians: number;
  average_score: number;
  total_promises_kept: number;
  total_promises_broken: number;
  politicians_with_efcc_issues: number;
}

export interface LeaderboardEntry {
  rank: number;
  politician: Politician;
  score: number;
  state: string;
  party: string;
  position: string;
}

// ============================================
// EDIT SUGGESTIONS
// ============================================

export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface EditSuggestion {
  id: UUID;
  politician_id: UUID | null;
  submission_type: 'suggest_edit' | 'add_official';
  payload: Record<string, unknown>;
  reason?: string;
  source_url?: string;
  image_url?: string;
  status: SuggestionStatus;
  reviewer_id?: UUID;
  reviewed_at?: string;
  reviewer_note?: string;
  submitted_by?: UUID;
  submitter_name?: string;
  submitter_email?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  politician?: { full_name: string; slug: string } | null;
  reviewer?: { display_name: string | null } | null;
}
