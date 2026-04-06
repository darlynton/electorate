'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, MessageSquare, Clock, LogIn, Users, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/use-auth';
import { LocationSetupDialog } from '@/components/auth/location-setup-dialog';
import { getDimensions, type PoliticianType, type DimensionConfig } from '@/lib/scoring';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface AggregatedDimension {
  key: string;
  label: string;
  emoji: string;
  average: number;
  count: number;
}

export interface RatingsData {
  politician_id: string;
  politician_type: PoliticianType;
  overall: number;
  total_ratings: number;
  dimensions: AggregatedDimension[];
  user_rating: Record<string, number> | null;
  can_rate: boolean;
  cant_rate_reason: 'monthly_limit' | 'constituency' | 'no_location' | null;
  in_constituency: boolean;
  has_location: boolean;
  next_rating_date: string | null;
}

interface RatingSectionProps {
  politicianSlug: string;
  politicianName: string;
  /** The politician's chamber — used to derive dimensions immediately */
  chamber?: string;
  /** Callback when ratings are loaded — parent can update its own score display */
  onRatingsLoaded?: (data: RatingsData) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// StarRating sub-component
// ═══════════════════════════════════════════════════════════════════════════

function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
}: {
  value: number;
  onChange?: (val: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';

  return (
    <div
      className="flex gap-0.5"
      onMouseLeave={() => !readonly && setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`transition-all ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          }`}
          onMouseEnter={() => !readonly && setHovered(star)}
          onClick={() => onChange?.(star)}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= (hovered || value)
                ? 'fill-gold text-gold'
                : 'fill-transparent text-gray-300 dark:text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main RatingSection component
// ═══════════════════════════════════════════════════════════════════════════

export function RatingSection({
  politicianSlug,
  politicianName,
  chamber,
  onRatingsLoaded,
}: RatingSectionProps) {
  const { session, profile, canUpdateLocation } = useAuth();
  const [data, setData] = useState<RatingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

  // User's scores
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');

  // Compute dimensions from API data first, fall back to chamber prop
  const politicianType: PoliticianType = data
    ? data.politician_type
    : chamber === 'Executive'
      ? 'executive'
      : 'legislator';
  const dimensions: DimensionConfig[] = getDimensions(politicianType);

  // ── Fetch ratings ─────────────────────────────────────────────────────
  const fetchRatings = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch(
        `/api/v1/politicians/${politicianSlug}/ratings`,
        { headers }
      );

      if (res.ok) {
        const json = await res.json();
        const ratingsData: RatingsData = json.data;
        setData(ratingsData);
        onRatingsLoaded?.(ratingsData);

        // Pre-fill user's existing scores
        if (ratingsData.user_rating) {
          setScores(ratingsData.user_rating);
        }
      }
    } catch (err) {
      console.error('Failed to fetch ratings:', err);
    } finally {
      setLoading(false);
    }
  }, [politicianSlug, session?.access_token, onRatingsLoaded]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  // ── Submit rating ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!session?.access_token) return;

    const requiredKeys = dimensions.map((d) => d.key);
    const missing = requiredKeys.filter((k) => !scores[k]);
    if (missing.length > 0) {
      setError('Please score all dimensions before submitting');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/v1/politicians/${politicianSlug}/ratings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            scores,
            comment: comment.trim() || undefined,
          }),
        }
      );

      if (res.ok) {
        setSubmitted(true);
        // Refresh aggregated scores
        await fetchRatings();
      } else {
        const json = await res.json();
        setError(json.error || 'Failed to submit rating');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Show the rating form immediately while aggregates load */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-teal" />
              Add Your Electorating
            </CardTitle>
            <CardDescription>
              Electorating {politicianName} on each dimension based on your experience as
              a constituent. You can submit once per month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!session ? (
              <div className="text-center py-8">
                <LogIn className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Sign in to start Electorating</p>
              </div>
            ) : (
              <div className="space-y-5">
                {dimensions.map((dim) => (
                  <div key={dim.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <span>{dim.emoji}</span>
                          {dim.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{dim.description}</p>
                      </div>
                      <StarRating
                        value={scores[dim.key] ?? 0}
                        onChange={(val) => setScores((prev) => ({ ...prev, [dim.key]: val }))}
                      />
                    </div>
                    <Separator />
                  </div>
                ))}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Comment <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Textarea
                    placeholder="Share your experience or observations..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground text-right">{comment.length}/500</p>
                </div>
                {error && <p className="text-sm text-coral-red">{error}</p>}
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-federal-green hover:bg-federal-green/90"
                >
                  {submitting ? 'Submitting...' : 'Submit Electorating'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Aggregate Scores Card ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-teal" />
                Electorating Scorecard
              </CardTitle>
              <CardDescription>
                {data && data.total_ratings > 0
                  ? `Based on ${data.total_ratings} ${data.total_ratings !== 1 ? 'Electoratings' : 'Electorating'} from constituents`
                  : 'No Electoratings yet — be the first!'}
              </CardDescription>
            </div>

            {data && data.total_ratings > 0 && (
              <div className="text-center">
                <div
                  className="text-3xl font-bold font-mono"
                  style={{
                    color:
                      data.overall >= 70
                        ? '#22C55E'
                        : data.overall >= 40
                          ? '#F59E0B'
                          : '#E84C30',
                  }}
                >
                  {data.overall}%
                </div>
                <p className="text-xs text-muted-foreground">Overall</p>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {data && data.total_ratings > 0 ? (
            <div className="space-y-4">
              {dimensions.map((dim) => {
                const aggDim = data.dimensions.find((d) => d.key === dim.key);
                const avg = aggDim?.average ?? 0;
                const pct = (avg / 5) * 100;

                return (
                  <div key={dim.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <span>{dim.emoji}</span>
                        {dim.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <StarRating
                          value={Math.round(avg)}
                          readonly
                          size="sm"
                        />
                        <span className="text-sm font-semibold w-8 text-right">
                          {avg.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {aggDim?.count ?? 0} {(aggDim?.count ?? 0) !== 1 ? 'Electoratings' : 'Electorating'}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>No Electoratings yet.</p>
              <p className="text-sm mt-1">
                Submit an Electorating to contribute to their scorecard.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Rate This Official Card ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-teal" />
            Add Your Electorating
          </CardTitle>
          <CardDescription>
            Electorating {politicianName} on each dimension based on your experience as
            a constituent. You can submit once per month.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Not logged in */}
          {!session ? (
            <div className="text-center py-8">
              <LogIn className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Sign in to start Electorating</p>
            </div>
          ) : /* No location set */ data && !data.has_location ? (
            <div className="text-center py-8">
              <MapPin className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <p className="font-medium mb-1">Set your location first</p>
              <p className="text-sm text-muted-foreground mb-4">
                You need to set your state to rate officials in your constituency.
              </p>
              <Button
                className="gap-2 bg-[#271E5D] hover:bg-[#271E5D]/90 dark:bg-[#5D49D6] dark:hover:bg-[#5D49D6]/90"
                onClick={() => setLocationDialogOpen(true)}
              >
                <MapPin className="h-4 w-4" />
                Set Location
              </Button>
              <LocationSetupDialog
                open={locationDialogOpen}
                onOpenChange={setLocationDialogOpen}
                profile={profile}
                canUpdate={canUpdateLocation}
                onLocationSaved={() => {
                  setLocationDialogOpen(false);
                  fetchRatings();
                }}
              />
            </div>
          ) : /* Not in constituency */ data && !data.in_constituency ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 text-coral-red mx-auto mb-3" />
              <p className="font-medium mb-1">Outside your constituency</p>
              <p className="text-sm text-muted-foreground">
                You can only rate officials who represent your registered state.
              </p>
            </div>
          ) : /* Already rated this month */ data && !data.can_rate && !submitted ? (
            <div className="text-center py-8">
              <Clock className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <p className="font-medium mb-1">
                You&apos;ve already submitted your Electorating this month
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                You can submit a new Electorating from{' '}
                {data.next_rating_date
                  ? new Date(data.next_rating_date).toLocaleDateString(
                      'en-NG',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )
                  : 'next month'}
              </p>

              {/* Show user's current scores */}
              {data.user_rating && (
                <div className="mt-4 p-4 bg-surface rounded-lg text-left max-w-sm mx-auto">
                  <p className="text-sm font-medium mb-3">
                    Your current scores:
                  </p>
                  {dimensions.map((dim) => (
                    <div
                      key={dim.key}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-sm">
                        {dim.emoji} {dim.label}
                      </span>
                      <StarRating
                        value={data.user_rating![dim.key] ?? 0}
                        readonly
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : /* Just submitted */ submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Star className="h-8 w-8 text-green-600 fill-green-600 dark:text-green-400 dark:fill-green-400" />
              </div>
              <p className="text-lg font-semibold text-green-700 dark:text-green-400 mb-1">
                Electorating Submitted!
              </p>
              <p className="text-sm text-muted-foreground">
                Thank you for helping keep Nigerian democracy accountable.
              </p>
            </motion.div>
          ) : (
            /* Rating form */
            <div className="space-y-5">
              {dimensions.map((dim) => (
                <div key={dim.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <span>{dim.emoji}</span>
                        {dim.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dim.description}
                      </p>
                    </div>
                    <StarRating
                      value={scores[dim.key] ?? 0}
                      onChange={(val) =>
                        setScores((prev) => ({ ...prev, [dim.key]: val }))
                      }
                    />
                  </div>
                  <Separator />
                </div>
              ))}

              {/* Optional comment */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Comment{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  placeholder="Share your experience or observations..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {comment.length}/500
                </p>
              </div>

              {error && <p className="text-sm text-coral-red">{error}</p>}

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-federal-green hover:bg-federal-green/90"
              >
                {submitting ? 'Submitting...' : 'Submit Electorating'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
