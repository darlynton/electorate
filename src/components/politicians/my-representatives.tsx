'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Landmark, Users, Crown, RefreshCw, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RepresentativeEntry {
  role: string;
  politician_id: string;
  full_name: string;
  slug: string;
  photo_url: string | null;
  party: string | null;
  constituency: string;
  state: string | null;
  chamber: string | null;
  office_level: string;
}

interface LgaInfo {
  inec_lga_id: string;
  lga_name: string;
  state_name: string;
  federal_constituency: string;
  senatorial_district: string;
}

interface RepresentativesData {
  lga: LgaInfo;
  representatives: RepresentativeEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PARTY_COLORS: Record<string, string> = {
  APC:  'bg-[#271E5D] text-white',
  PDP:  'bg-[#E84C30] text-white',
  LP:   'bg-[#00C49A] text-white',
  NNPP: 'bg-[#5D49D6] text-white',
  APGA: 'bg-purple-600 text-white',
};

function partyColor(party: string | null) {
  if (!party) return 'bg-gray-400 text-white';
  return PARTY_COLORS[party] ?? 'bg-gray-500 text-white';
}

function chamberIcon(role: string) {
  if (role === 'Senator')  return <Landmark className="w-3 h-3" />;
  if (role === 'Governor') return <Crown className="w-3 h-3" />;
  return <Users className="w-3 h-3" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface MyRepresentativesProps {
  /** Optional: force-hide if the parent already knows location is unset */
  locationSet?: boolean;
  className?: string;
}

export function MyRepresentatives({ locationSet = true, className }: MyRepresentativesProps) {
  const [data, setData] = useState<RepresentativesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notSeeded, setNotSeeded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotSeeded(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Sign in to see your representatives.');
        return;
      }

      const res = await fetch('/api/v1/user/representatives', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 404) {
        const body = await res.json();
        if (body.lga_id) {
          setNotSeeded(true);
        } else {
          setError(body.error ?? 'Location not set yet.');
        }
        return;
      }

      if (res.status === 422) {
        setError('Please complete your location setup to see your representatives.');
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Failed to load representatives.');
        return;
      }

      const json = await res.json();
      setData(json.data);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (locationSet) load();
  }, [locationSet, load]);

  if (!locationSet) return null;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
            Your Representatives
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Finding your representatives…</span>
        </CardContent>
      </Card>
    );
  }

  // ── Error / not seeded ─────────────────────────────────────────────────────
  if (error || notSeeded) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
            Your Representatives
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-amber-800">
              {notSeeded
                ? 'Constituency mapping for your LGA hasn\'t been loaded yet. It will be available soon.'
                : error}
            </div>
          </div>
          {!notSeeded && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              onClick={load}
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (data.representatives.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
            Your Representatives
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          <p>No representative profiles found for your constituency yet.</p>
          <p className="mt-1 text-xs">
            Constituency: <strong>{data.lga.federal_constituency}</strong>
          </p>
          <p className="text-xs">
            Senatorial District: <strong>{data.lga.senatorial_district}</strong>
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Representatives ────────────────────────────────────────────────────────
  return (
    <Card className={className}>
      {/* Compact single-line header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-[#271E5D] dark:text-[#5D49D6] flex-shrink-0" />
          <span className="font-display text-sm font-semibold text-foreground">
            Your Representatives
          </span>
          <span className="text-xs text-muted-foreground truncate hidden sm:block">
            · {data.lga.lga_name}, {data.lga.state_name}
          </span>
        </div>
        <button
          onClick={load}
          title="Refresh"
          className="text-muted-foreground hover:text-[#271E5D] dark:text-[#5D49D6] transition-colors ml-2 flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Compact representative grid */}
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {data.representatives.map((rep) => (
            <Link
              key={rep.politician_id}
              href={`/politicians/${rep.slug}`}
              className="group"
            >
              <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl border hover:border-[#271E5D]/40 hover:bg-muted/50 transition-all bg-card text-center h-full">
                {/* Avatar */}
                <div className="relative w-10 h-10 flex-shrink-0 rounded-full overflow-hidden bg-[#271E5D]/10 dark:bg-white/10">
                  {rep.photo_url ? (
                    <Image
                      src={rep.photo_url}
                      alt={rep.full_name}
                      fill
                      sizes="40px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-sm font-bold text-[#271E5D] dark:text-[#5D49D6]">
                        {rep.full_name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2 w-full">
                  {rep.full_name}
                </p>

                {/* Role + icon */}
                <div className="flex items-center gap-1 justify-center text-muted-foreground">
                  {chamberIcon(rep.role)}
                  <span className="text-[10px]">{rep.role}</span>
                </div>

                {/* Party badge */}
                {rep.party && (
                  <Badge className={`text-[10px] px-1.5 py-0 ${partyColor(rep.party)}`}>
                    {rep.party}
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
