'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PoliticianCard } from '@/components/politicians';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { NIGERIAN_STATES, POLITICAL_PARTIES, OFFICE_LEVELS } from '@/types';
import type { Politician, Position } from '@/types';
import { Filter, Users, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';

type PoliticianWithPosition = Politician & {
  positions: Position[];
  accountability_score: number;
  community_score: number;
  total_ratings: number;
};

export default function PoliticiansPage() {
  return (
    <Suspense fallback={<PoliticiansPageSkeleton />}>
      <PoliticiansPageContent />
    </Suspense>
  );
}

function PoliticiansPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function PoliticiansPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read filters from URL
  const stateFilter = searchParams.get('state') || 'all';
  const partyFilter = searchParams.get('party') || 'all';
  const chamberFilter = searchParams.get('chamber') || 'all';
  const levelFilter = searchParams.get('office_level') || 'all';
  const searchQuery = searchParams.get('search') || '';
  const page = Number(searchParams.get('page') || '1');

  const [politicians, setPoliticians] = useState<PoliticianWithPosition[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const LIMIT = 50;

  const fetchPoliticians = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (stateFilter !== 'all') params.set('state', stateFilter);
      if (partyFilter !== 'all') params.set('party', partyFilter.toUpperCase());
      if (chamberFilter !== 'all') params.set('chamber', chamberFilter);
      if (levelFilter !== 'all') params.set('office_level', levelFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', String(LIMIT));
      params.set('page', String(page));

      const res = await fetch(`/api/v1/politicians?${params.toString()}`);
      const json = await res.json();

      if (json.data) {
        setPoliticians(json.data);
        setTotal(json.pagination?.total ?? json.data.length);
        setTotalPages(json.pagination?.totalPages ?? 1);
      }
    } catch (err) {
      console.error('Failed to fetch politicians', err);
    } finally {
      setLoading(false);
    }
  }, [stateFilter, partyFilter, chamberFilter, levelFilter, searchQuery, page]);

  useEffect(() => {
    fetchPoliticians();
  }, [fetchPoliticians]);

  // Update a single filter in the URL (resets to page 1)
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all' || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page');
    router.replace(`/politicians?${params.toString()}`);
  };

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.replace(`/politicians?${params.toString()}`);
  };

  const activeFilters = [
    stateFilter !== 'all' && { key: 'state', label: `State: ${stateFilter}` },
    partyFilter !== 'all' && { key: 'party', label: `Party: ${partyFilter.toUpperCase()}` },
    chamberFilter !== 'all' && { key: 'chamber', label: `Chamber: ${chamberFilter}` },
    levelFilter !== 'all' && { key: 'office_level', label: `Level: ${OFFICE_LEVELS.find((l) => l.value === levelFilter)?.label ?? levelFilter}` },
    searchQuery && { key: 'search', label: `"${searchQuery}"` },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-[#271E5D] text-white py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-[#5D49D6]" />
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Elected Officials Directory
            </h1>
          </div>
          <p className="text-white/80 max-w-2xl">
            Browse elected officials across all levels of government — from federal legislators
            and governors to state assembly members and local government chairmen.
          </p>
          <div className="mt-6 relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
            <Input
              value={searchQuery}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Search by name..."
              className="pl-10 h-12 bg-white dark:bg-card text-foreground border-0 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-card sticky top-16 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Filter by:</span>
            </div>

            <Select value={stateFilter} onValueChange={(v) => updateFilter('state', v ?? 'all')}>
              <SelectTrigger className="w-full sm:w-[150px] h-10 sm:h-9">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {NIGERIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state.toLowerCase()}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={partyFilter} onValueChange={(v) => updateFilter('party', v ?? 'all')}>
              <SelectTrigger className="w-full sm:w-[130px] h-10 sm:h-9">
                <SelectValue placeholder="Party" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parties</SelectItem>
                {POLITICAL_PARTIES.map((party) => (
                  <SelectItem key={party.code} value={party.code.toLowerCase()}>
                    {party.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={chamberFilter} onValueChange={(v) => updateFilter('chamber', v ?? 'all')}>
              <SelectTrigger className="w-full sm:w-[160px] h-10 sm:h-9">
                <SelectValue placeholder="Chamber" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chambers</SelectItem>
                <SelectItem value="Senate">Senate</SelectItem>
                <SelectItem value="House">House of Reps</SelectItem>
                <SelectItem value="State Assembly">State Assembly</SelectItem>
                <SelectItem value="Executive">Executive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={levelFilter} onValueChange={(v) => updateFilter('office_level', v ?? 'all')}>
              <SelectTrigger className="w-full sm:w-[170px] h-10 sm:h-9">
                <SelectValue placeholder="Office Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {OFFICE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-destructive hover:text-destructive ml-auto"
                onClick={() => router.replace('/politicians')}
              >
                <X className="w-3 h-3" />
                Clear all
              </Button>
            )}
          </div>

          {/* Active filter badges */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-sm text-muted-foreground">Active:</span>
              {activeFilters.map((filter) => (
                <Badge
                  key={filter.key}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-secondary/80"
                  onClick={() => updateFilter(filter.key, 'all')}
                >
                  {filter.label}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground mb-6">
          Showing{' '}
          <span className="font-semibold text-foreground">
            {loading ? '…' : politicians.length > 0 ? `${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, total)}` : '0'}
          </span>{' '}
          of{' '}
          <span className="font-semibold text-foreground">{loading ? '…' : total}</span>{' '}
          elected officials
        </p>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : politicians.length > 0 ? (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {politicians.map((pol) => {
                const score = pol.accountability_score ?? 0;
                const position = pol.positions?.[0];
                return (
                  <PoliticianCard
                    key={pol.id}
                    politician={pol}
                    position={position}
                    score={{
                      overall: score,
                      total: score,
                      attendance: 0,
                      voting_consistency: 0,
                      promise_fulfillment: 0,
                      transparency: 0,
                      constituent_engagement: 0,
                      grade: score >= 70 ? 'B' : score >= 50 ? 'C' : 'D',
                      color: score >= 70 ? 'green' : score >= 50 ? 'amber' : 'red',
                    }}
                  />
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No officials found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting or clearing your filters.
            </p>
            <Button variant="outline" onClick={() => router.replace('/politicians')}>
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

