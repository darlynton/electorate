'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, Clock, LogIn, Users, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/use-auth';
import { LocationSetupDialog } from '@/components/auth/location-setup-dialog';
import { getDimensions, type PoliticianType } from '@/lib/scoring';
import type { RatingsData } from './rating-section';

// ═══════════════════════════════════════════════════════════════════════════
// StarRating — local copy so this file is self-contained
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
    <div className="flex gap-0.5" onMouseLeave={() => !readonly && setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
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
// Props
// ═══════════════════════════════════════════════════════════════════════════

interface RatingDialogProps {
  politicianSlug: string;
  politicianName: string;
  /** The politician's chamber — used to derive dimension set immediately */
  chamber?: string;
  /** Total ratings count to display on the trigger button */
  totalRatings?: number;
  /** Fired whenever ratings are fetched/refreshed (so parent can update score ring etc.) */
  onRatingsLoaded?: (data: RatingsData) => void;
  /** Optional custom class for the trigger element */
  triggerClassName?: string;
  /** Optional custom label for the trigger (defaults to "Rate Official") */
  triggerLabel?: string;
  /** Variant of the trigger button */
  triggerVariant?: 'hero' | 'sidebar';
}

// ═══════════════════════════════════════════════════════════════════════════
// RatingDialog
// ═══════════════════════════════════════════════════════════════════════════

export function RatingDialog({
  politicianSlug,
  politicianName,
  chamber,
  totalRatings = 0,
  onRatingsLoaded,
  triggerClassName,
  triggerLabel = 'Rate Official',
  triggerVariant = 'hero',
}: RatingDialogProps) {
  const { session, profile, canUpdateLocation } = useAuth();
  const [open, setOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [data, setData] = useState<RatingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');

  const politicianType: PoliticianType = data
    ? data.politician_type
    : chamber === 'Executive'
      ? 'executive'
      : 'legislator';
  const dimensions = getDimensions(politicianType);

  // ── Fetch ratings (called on open and after submit) ───────────────────
  const fetchRatings = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`/api/v1/politicians/${politicianSlug}/ratings`, { headers });
      if (res.ok) {
        const json = await res.json();
        const rd: RatingsData = json.data;
        setData(rd);
        onRatingsLoaded?.(rd);
        if (rd.user_rating) {
          setScores(rd.user_rating);
        }
      }
    } catch (err) {
      console.error('Failed to fetch ratings:', err);
    } finally {
      setLoading(false);
    }
  }, [politicianSlug, session?.access_token, onRatingsLoaded]);

  // Fetch whenever the dialog opens
  useEffect(() => {
    if (open) {
      fetchRatings();
    }
  }, [open, fetchRatings]);

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!session?.access_token) return;
    const missing = dimensions.filter((d) => !scores[d.key]);
    if (missing.length > 0) {
      setError('Please rate all dimensions before submitting');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/politicians/${politicianSlug}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ scores, comment: comment.trim() || undefined }),
      });
      if (res.ok) {
        setSubmitted(true);
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

  // ── Trigger class helpers ─────────────────────────────────────────────
  const defaultTriggerClass =
    triggerVariant === 'hero'
      ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-gold text-federal-green font-semibold px-3 h-7 text-sm hover:bg-gold/90 transition-colors'
      : 'inline-flex items-center justify-center gap-2 w-full rounded-lg border border-gold/40 text-sm font-medium px-3 h-8 hover:bg-gold/10 transition-colors';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          // Reset on close so re-opening shows fresh state
          setSubmitted(false);
          setError(null);
        }
      }}
    >
      <DialogTrigger className={triggerClassName ?? defaultTriggerClass}>
        <Star className="h-4 w-4" />
        {triggerLabel}
        {totalRatings > 0 && (
          <span className="ml-0.5 rounded-full bg-federal-green/15 px-1.5 py-0.5 text-xs font-bold leading-none">
            {totalRatings}
          </span>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-gold fill-gold" />
            Rate {politicianName}
          </DialogTitle>
          <DialogDescription>
            Score this official on each dimension based on your experience as a constituent.
            Ratings are open to constituents only, once per month.
          </DialogDescription>
        </DialogHeader>

        {/* ── Loading ───────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-4 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : !session ? (
          /* ── Not signed in ───────────────────────────────────────── */
          <div className="text-center py-10">
            <LogIn className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium mb-1">Sign in to start Electorating</p>
            <p className="text-sm text-muted-foreground">
              You need an account to submit an Electorating.
            </p>
          </div>
        ) : data && !data.has_location ? (
          /* ── No location set ─────────────────────────────────────── */
          <div className="text-center py-10">
            <MapPin className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <p className="font-medium mb-1">Set your location first</p>
            <p className="text-sm text-muted-foreground mb-4">
              Update your state in your profile so we can verify you&apos;re a constituent.
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
        ) : data && !data.in_constituency ? (
          /* ── Outside constituency ────────────────────────────────── */
          <div className="text-center py-10">
            <Users className="h-10 w-10 text-coral-red mx-auto mb-3" />
            <p className="font-medium mb-1">Outside your constituency</p>
            <p className="text-sm text-muted-foreground">
              You can only rate officials who represent your registered state.
            </p>
          </div>
        ) : data && !data.can_rate && !submitted ? (
          /* ── Already rated this month ────────────────────────────── */
          <div className="text-center py-10">
            <Clock className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <p className="font-medium mb-1">You&apos;ve already submitted your Electorating this month</p>
            <p className="text-sm text-muted-foreground mb-4">
              Next Electorating from{' '}
              {data.next_rating_date
                ? new Date(data.next_rating_date).toLocaleDateString('en-NG', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'next month'}
            </p>
            {data.user_rating && (
              <div className="mt-4 p-4 bg-surface rounded-lg text-left max-w-xs mx-auto">
                <p className="text-sm font-medium mb-3">Your current scores:</p>
                {dimensions.map((dim) => (
                  <div key={dim.key} className="flex items-center justify-between py-1">
                    <span className="text-sm">
                      {dim.emoji} {dim.label}
                    </span>
                    <StarRating value={data.user_rating![dim.key] ?? 0} readonly size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : submitted ? (
          /* ── Success ─────────────────────────────────────────────── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Star className="h-8 w-8 text-green-600 fill-green-600 dark:text-green-400 dark:fill-green-400" />
            </div>
            <p className="text-lg font-semibold text-green-700 dark:text-green-400 mb-1">Electorating Submitted!</p>
            <p className="text-sm text-muted-foreground mb-4">
              Thank you for helping keep Nigerian democracy accountable.
            </p>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </motion.div>
        ) : (
          /* ── Rating form ─────────────────────────────────────────── */
          <div className="space-y-5 py-2">
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
      </DialogContent>
    </Dialog>
  );
}
