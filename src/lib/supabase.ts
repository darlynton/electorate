import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a mock client for build time when env vars aren't available
const createMockClient = (): SupabaseClient => {
  console.warn('Supabase environment variables not set - using mock client');
  // This will be replaced with real client at runtime
  return {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null }),
      resend: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  } as unknown as SupabaseClient;
};

// Client-side Supabase client (uses anon key with RLS)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : createMockClient();

// Server-side Supabase client (uses service role key, bypasses RLS)
export const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// Helper function to get the appropriate client
export function getSupabaseClient(useAdmin = false) {
  if (useAdmin) {
    if (!supabaseAdmin) {
      throw new Error('Admin client not available - missing SUPABASE_SERVICE_ROLE_KEY');
    }
    return supabaseAdmin;
  }
  return supabase;
}

// Types for Supabase
export type Database = {
  public: {
    Tables: {
      politicians: {
        Row: {
          id: string;
          full_name: string;
          slug: string;
          photo_url: string | null;
          date_of_birth: string | null;
          gender: string | null;
          state_of_origin: string;
          lga_of_origin: string | null;
          education: Record<string, unknown>[] | null;
          biography: string | null;
          nin_partial: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['politicians']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['politicians']['Insert']>;
      };
      positions: {
        Row: {
          id: string;
          politician_id: string;
          title: string;
          chamber: string | null;
          constituency: string | null;
          state: string | null;
          party: string;
          assembly_number: number | null;
          start_date: string;
          end_date: string | null;
          is_current: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['positions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['positions']['Insert']>;
      };
      votes: {
        Row: {
          id: string;
          politician_id: string;
          bill_title: string;
          bill_id: string | null;
          vote_cast: string | null;
          vote_date: string;
          session: string | null;
          source_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['votes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['votes']['Insert']>;
      };
      attendance: {
        Row: {
          id: string;
          politician_id: string;
          session_date: string;
          session_type: string | null;
          present: boolean;
          source_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['attendance']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['attendance']['Insert']>;
      };
      promises: {
        Row: {
          id: string;
          politician_id: string;
          promise_text: string;
          category: string | null;
          status: string;
          evidence_url: string | null;
          source: string | null;
          made_date: string | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['promises']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['promises']['Insert']>;
      };
      legal_records: {
        Row: {
          id: string;
          politician_id: string;
          record_type: string;
          title: string;
          description: string | null;
          case_number: string | null;
          court: string | null;
          date: string | null;
          outcome: string | null;
          source_url: string;
          verified: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['legal_records']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['legal_records']['Insert']>;
      };
      news_articles: {
        Row: {
          id: string;
          politician_id: string;
          headline: string;
          excerpt: string | null;
          source_name: string;
          source_url: string;
          published_at: string | null;
          category: string | null;
          is_verified_source: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['news_articles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['news_articles']['Insert']>;
      };
      projects: {
        Row: {
          id: string;
          politician_id: string;
          title: string;
          description: string | null;
          category: string | null;
          state: string | null;
          lga: string | null;
          allocated_amount: number | null;
          status: string | null;
          budget_year: number | null;
          evidence_photos: string[] | null;
          source_url: string | null;
          reported_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      asset_declarations: {
        Row: {
          id: string;
          politician_id: string;
          declaration_year: number;
          status: string;
          document_url: string | null;
          source: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['asset_declarations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['asset_declarations']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          state: string | null;
          lga: string | null;
          is_verified_voter: boolean;
          points: number;
          badges: string[];
          streak_days: number;
          last_active: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      tips: {
        Row: {
          id: string;
          user_id: string | null;
          politician_id: string | null;
          tip_type: string;
          content: string;
          evidence_url: string | null;
          status: string;
          points_awarded: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tips']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tips']['Insert']>;
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          race_id: string;
          predicted_winner: string;
          is_correct: boolean | null;
          points_awarded: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['predictions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['predictions']['Insert']>;
      };
      politician_ratings: {
        Row: {
          id: string;
          user_id: string;
          politician_id: string;
          rating_period: string;
          constituency_presence: number | null;
          legislative_activity: number | null;
          constituency_projects: number | null;
          accessibility: number | null;
          transparency: number | null;
          infrastructure: number | null;
          security: number | null;
          healthcare_education: number | null;
          economic_activity: number | null;
          transparency_communication: number | null;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['politician_ratings']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['politician_ratings']['Insert']>;
      };
    };
  };
};
