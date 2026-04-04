import { z } from 'zod';
import { NIGERIAN_STATES, POLITICAL_PARTIES, OFFICE_LEVELS } from '@/types';

// ============================================
// COMMON SCHEMAS
// ============================================

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================
// POLITICIAN SCHEMAS
// ============================================

export const educationSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  year: z.number().int().min(1900).max(2030).optional(),
});

export const politicianCreateSchema = z.object({
  full_name: z.string().min(2).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(200),
  photo_url: z.string().url().optional(),
  date_of_birth: z.string().date().optional(),
  gender: z.enum(['male', 'female']).optional(),
  state_of_origin: z.enum(NIGERIAN_STATES as unknown as [string, ...string[]]),
  lga_of_origin: z.string().max(100).optional(),
  education: z.array(educationSchema).optional(),
  biography: z.string().max(10000).optional(),
});

export const politicianUpdateSchema = politicianCreateSchema.partial();

export const politicianFiltersSchema = z.object({
  state: z.string().optional(),
  party: z.string().optional(),
  chamber: z.enum(['Senate', 'House', 'State Assembly', 'Executive']).optional(),
  office_level: z.enum(['federal', 'state', 'local']).optional(),
  search: z.string().max(100).optional(),
  min_score: z.coerce.number().int().min(0).max(100).optional(),
  max_score: z.coerce.number().int().min(0).max(100).optional(),
  has_efcc_record: z.coerce.boolean().optional(),
  sort_by: z.enum(['name', 'score', 'attendance', 'state']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
}).merge(paginationSchema);

// ============================================
// POSITION SCHEMAS
// ============================================

const partyCodes = POLITICAL_PARTIES.map(p => p.code) as [string, ...string[]];

export const positionCreateSchema = z.object({
  politician_id: uuidSchema,
  title: z.string().min(1).max(200),
  chamber: z.enum(['Senate', 'House', 'State Assembly', 'Executive']).optional(),
  office_level: z.enum(['federal', 'state', 'local']).default('federal'),
  constituency: z.string().max(200).optional(),
  state: z.string().optional(),
  party: z.enum(partyCodes),
  assembly_number: z.number().int().min(1).max(20).optional(),
  start_date: z.string().date(),
  end_date: z.string().date().optional(),
  is_current: z.boolean().default(true),
});

// ============================================
// VOTE SCHEMAS
// ============================================

export const voteCreateSchema = z.object({
  politician_id: uuidSchema,
  bill_title: z.string().min(1).max(500),
  bill_id: z.string().max(100).optional(),
  vote_cast: z.enum(['for', 'against', 'abstain', 'absent']).optional(),
  vote_date: z.string().date(),
  session: z.string().max(100).optional(),
  source_url: z.string().url().optional(),
});

// ============================================
// ATTENDANCE SCHEMAS
// ============================================

export const attendanceCreateSchema = z.object({
  politician_id: uuidSchema,
  session_date: z.string().date(),
  session_type: z.enum(['plenary', 'committee', 'special', 'cabinet', 'executive_council']).optional(),
  present: z.boolean(),
  source_url: z.string().url().optional(),
});

// ============================================
// PROMISE SCHEMAS
// ============================================

export const promiseCreateSchema = z.object({
  politician_id: uuidSchema,
  promise_text: z.string().min(10).max(2000),
  category: z.enum(['infrastructure', 'health', 'education', 'security', 'economy', 'agriculture', 'other']).optional(),
  status: z.enum(['kept', 'broken', 'in_progress', 'abandoned', 'unverified']).default('unverified'),
  evidence_url: z.string().url().optional(),
  source: z.string().max(500).optional(),
  made_date: z.string().date().optional(),
});

export const promiseUpdateSchema = z.object({
  status: z.enum(['kept', 'broken', 'in_progress', 'abandoned', 'unverified']),
  evidence_url: z.string().url().optional(),
  verified_by: z.string().optional(),
});

// ============================================
// LEGAL RECORD SCHEMAS
// ============================================

export const legalRecordCreateSchema = z.object({
  politician_id: uuidSchema,
  record_type: z.enum([
    'efcc_investigation',
    'efcc_conviction',
    'icpc_prosecution',
    'court_judgment',
    'cct_proceedings',
    'acquittal',
  ]),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  case_number: z.string().max(100).optional(),
  court: z.string().max(200).optional(),
  date: z.string().date().optional(),
  outcome: z.string().max(500).optional(),
  source_url: z.string().url(),
  verified: z.boolean().default(false),
});

// ============================================
// NEWS ARTICLE SCHEMAS
// ============================================

export const newsArticleCreateSchema = z.object({
  politician_id: uuidSchema,
  headline: z.string().min(1).max(500),
  excerpt: z.string().max(1000).optional(),
  source_name: z.string().min(1).max(100),
  source_url: z.string().url(),
  published_at: z.string().datetime().optional(),
  category: z.enum(['corruption', 'legislation', 'constituency', 'general']).optional(),
  is_verified_source: z.boolean().default(true),
});

// ============================================
// PROJECT SCHEMAS
// ============================================

export const projectCreateSchema = z.object({
  politician_id: uuidSchema,
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  category: z.enum(['road', 'health', 'school', 'water', 'electricity', 'other']).optional(),
  state: z.string().optional(),
  lga: z.string().max(100).optional(),
  allocated_amount: z.number().int().positive().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'abandoned']).optional(),
  budget_year: z.number().int().min(2000).max(2030).optional(),
  evidence_photos: z.array(z.string().url()).max(10).optional(),
  source_url: z.string().url().optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial().omit({ politician_id: true });

// ============================================
// USER SCHEMAS
// ============================================

export const userCreateSchema = z.object({
  id: uuidSchema,
  username: z.string().regex(/^[a-zA-Z0-9_]+$/).min(3).max(30).optional(),
  display_name: z.string().min(1).max(100).optional(),
  state: z.enum(NIGERIAN_STATES as unknown as [string, ...string[]]).optional(),
  lga: z.string().max(100).optional(),
});

export const userUpdateSchema = userCreateSchema.partial().omit({ id: true });

// ============================================
// TIP SCHEMAS
// ============================================

export const tipCreateSchema = z.object({
  politician_id: uuidSchema.optional(),
  tip_type: z.enum(['broken_promise', 'project_update', 'corruption_allegation', 'news_tip', 'correction']),
  content: z.string().min(20).max(5000),
  evidence_url: z.string().url().optional(),
});

export const tipReviewSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  points_awarded: z.number().int().min(0).max(100).default(0),
});

// ============================================
// PREDICTION SCHEMAS
// ============================================

export const predictionCreateSchema = z.object({
  race_id: z.string().min(1).max(100),
  predicted_winner: z.string().min(1).max(200),
});

// ============================================
// SEARCH SCHEMAS
// ============================================

export const searchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// Type exports
export type PoliticianCreate = z.infer<typeof politicianCreateSchema>;
export type PoliticianUpdate = z.infer<typeof politicianUpdateSchema>;
export type PoliticianFilters = z.infer<typeof politicianFiltersSchema>;
export type PositionCreate = z.infer<typeof positionCreateSchema>;
export type VoteCreate = z.infer<typeof voteCreateSchema>;
export type AttendanceCreate = z.infer<typeof attendanceCreateSchema>;
export type PromiseCreate = z.infer<typeof promiseCreateSchema>;
export type PromiseUpdate = z.infer<typeof promiseUpdateSchema>;
export type LegalRecordCreate = z.infer<typeof legalRecordCreateSchema>;
export type NewsArticleCreate = z.infer<typeof newsArticleCreateSchema>;
export type ProjectCreate = z.infer<typeof projectCreateSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;
export type UserCreate = z.infer<typeof userCreateSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type TipCreate = z.infer<typeof tipCreateSchema>;
export type TipReview = z.infer<typeof tipReviewSchema>;
export type PredictionCreate = z.infer<typeof predictionCreateSchema>;
export type SearchQuery = z.infer<typeof searchSchema>;
