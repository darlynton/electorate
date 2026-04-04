'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ------------------------------------------
// Types
// ------------------------------------------

export interface UserProfile {
  id: string;
  phone_number: string | null;
  email: string | null;
  display_name: string | null;
  state_id: string | null;
  lga_id: string | null;
  ward_id: string | null;
  polling_unit_id: string | null;
  location_verified: boolean;
  location_last_updated_at: string | null;
  is_admin: boolean;
  approved_count: number;
  contribution_score: number;
}

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  /** True when the user's email is confirmed */
  emailVerified: boolean;
  /** True when profile has location fields set */
  hasLocation: boolean;
  /** True when user can update their location (first time or > 6 months) */
  canUpdateLocation: boolean;
  /** True when user is an admin */
  isAdmin: boolean;
  /** Refresh the profile from the database */
  refreshProfile: () => Promise<void>;
}

// ------------------------------------------
// Hook
// ------------------------------------------

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error.message);
      }
      setProfile((data as UserProfile) ?? null);
    } catch {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const s = data.session ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        void fetchProfile(s.user.id);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        void fetchProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const emailVerified = !!(user?.email_confirmed_at);

  const hasLocation = !!(
    profile?.state_id &&
    profile?.lga_id &&
    profile?.ward_id &&
    profile?.polling_unit_id
  );

  const canUpdateLocation = (() => {
    if (!profile) return false;
    if (!profile.location_last_updated_at) return true;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return new Date(profile.location_last_updated_at) < sixMonthsAgo;
  })();

  const isAdmin = profile?.is_admin === true;

  return {
    session,
    user,
    profile,
    isLoading,
    emailVerified,
    hasLocation,
    canUpdateLocation,
    isAdmin,
    refreshProfile,
  };
}

// ------------------------------------------
// Helper: sign out
// ------------------------------------------

export async function signOut() {
  return supabase.auth.signOut();
}

// ------------------------------------------
// Helper: sign up with email + password
// ------------------------------------------

export async function signUpWithEmail(
  email: string,
  password: string,
  phone: string,
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { phone },
    },
  });
}

// ------------------------------------------
// Helper: sign in with email + password
// ------------------------------------------

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

// ------------------------------------------
// Helper: forgot password (sends reset email)
// ------------------------------------------

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

// ------------------------------------------
// Helper: resend email verification
// ------------------------------------------

export async function resendVerificationEmail(email: string) {
  return supabase.auth.resend({ type: 'signup', email });
}

// ------------------------------------------
// Helper: resolve phone number → email for login
// ------------------------------------------

export async function resolvePhoneToEmail(
  phone: string,
): Promise<{ email: string | null; error: string | null }> {
  try {
    const res = await fetch('/api/v1/auth/resolve-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const json = await res.json();
    if (!res.ok) return { email: null, error: json.error ?? 'Phone not found' };
    // _email is the unmasked email for login; email is masked for display
    return { email: json._email ?? json.email, error: null };
  } catch {
    return { email: null, error: 'Network error' };
  }
}
