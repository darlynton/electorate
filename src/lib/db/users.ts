import { supabase, getSupabaseClient } from '../supabase';
import type { User, Tip, Prediction } from '@/types';
import type { UserCreate, UserUpdate, TipCreate, TipReview, PredictionCreate } from '../schemas';

// ============================================
// USER QUERIES
// ============================================

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  return data as User;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  return data as User;
}

export async function createUser(user: UserCreate): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      ...user,
      is_verified_voter: false,
      points: 0,
      badges: [],
      streak_days: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data as User;
}

export async function updateUser(id: string, updates: UserUpdate): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      last_active: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return data as User;
}

export async function addPointsToUser(id: string, points: number): Promise<User> {
  const { data, error } = await supabase
    .rpc('add_user_points', { user_id: id, points_to_add: points });

  if (error) {
    // Fallback to regular update if RPC doesn't exist
    const user = await getUserById(id);
    if (!user) throw new Error('User not found');
    
    return updateUser(id, { points: user.points + points } as unknown as UserUpdate);
  }

  return data as User;
}

export async function addBadgeToUser(id: string, badge: string): Promise<User> {
  const user = await getUserById(id);
  if (!user) throw new Error('User not found');
  
  if (user.badges.includes(badge as never)) {
    return user;
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      badges: [...user.badges, badge],
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add badge: ${error.message}`);
  }

  return data as User;
}

export async function getLeaderboard(limit: number = 50): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('points', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch leaderboard: ${error.message}`);
  }

  return data as User[];
}

// ============================================
// TIP QUERIES
// ============================================

export async function createTip(userId: string, tip: TipCreate): Promise<Tip> {
  const { data, error } = await supabase
    .from('tips')
    .insert({
      ...tip,
      user_id: userId,
      status: 'pending',
      points_awarded: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create tip: ${error.message}`);
  }

  return data as Tip;
}

export async function getTipsByUser(userId: string): Promise<Tip[]> {
  const { data, error } = await supabase
    .from('tips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch tips: ${error.message}`);
  }

  return data as Tip[];
}

export async function getPendingTips(): Promise<Tip[]> {
  const { data, error } = await supabase
    .from('tips')
    .select(`
      *,
      users (username, display_name),
      politicians (full_name, slug)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch pending tips: ${error.message}`);
  }

  return data as Tip[];
}

export async function reviewTip(tipId: string, review: TipReview): Promise<Tip> {
  const client = getSupabaseClient(true);
  
  const { data, error } = await client
    .from('tips')
    .update({
      status: review.status,
      points_awarded: review.points_awarded,
    })
    .eq('id', tipId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to review tip: ${error.message}`);
  }

  // Award points to user if verified
  if (review.status === 'verified' && review.points_awarded > 0 && data.user_id) {
    await addPointsToUser(data.user_id, review.points_awarded);
  }

  return data as Tip;
}

// ============================================
// PREDICTION QUERIES
// ============================================

export async function createPrediction(
  userId: string, 
  prediction: PredictionCreate
): Promise<Prediction> {
  const { data, error } = await supabase
    .from('predictions')
    .insert({
      ...prediction,
      user_id: userId,
      is_correct: null,
      points_awarded: 0,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already made a prediction for this race');
    }
    throw new Error(`Failed to create prediction: ${error.message}`);
  }

  return data as Prediction;
}

export async function getUserPredictions(userId: string): Promise<Prediction[]> {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch predictions: ${error.message}`);
  }

  return data as Prediction[];
}

export async function getPredictionLeaderboard(limit: number = 50): Promise<{
  user: User;
  correct_predictions: number;
  total_predictions: number;
  points: number;
}[]> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      predictions (is_correct, points_awarded)
    `)
    .order('points', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch prediction leaderboard: ${error.message}`);
  }

  return (data || []).map((user: Record<string, unknown>) => {
    const predictions = (user.predictions as { is_correct: boolean | null; points_awarded: number }[]) || [];
    return {
      user: user as unknown as User,
      correct_predictions: predictions.filter(p => p.is_correct === true).length,
      total_predictions: predictions.filter(p => p.is_correct !== null).length,
      points: predictions.reduce((sum, p) => sum + (p.points_awarded || 0), 0),
    };
  });
}
