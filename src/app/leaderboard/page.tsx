'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  Filter,
  Users,
  Building2,
  ChevronUp,
  ChevronDown,
  Crown,
  Heart,
  Star,
  Award,
  Sparkles,
  Minus,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountabilityScoreRing } from '@/components/politicians/accountability-score-ring';
import { getContributorTier, CONTRIBUTOR_TIERS } from '@/lib/utils';
import { NIGERIAN_STATES, POLITICAL_PARTIES, OFFICE_LEVELS } from '@/types';

// ════════════════════════════════════════════════════════════════════════════
// LEADERBOARD TYPES
// ════════════════════════════════════════════════════════════════════════════

interface LeaderboardEntry {
  rank: number;
  politician: {
    id: string;
    full_name: string;
    slug: string;
    photo_url?: string;
    state_of_origin: string;
  };
  position: {
    title: string;
    chamber: string;
    office_level: string;
    party: string;
    constituency: string;
    state: string;
  };
  score: number;
  total_ratings: number;
  politician_type: string;
}

const getPartyColor = (party: string) => {
  const colors: Record<string, string> = {
    APC: 'bg-green-600', PDP: 'bg-red-600', LP: 'bg-green-500',
    NNPP: 'bg-yellow-600', APGA: 'bg-purple-600',
  };
  return colors[party] || 'bg-gray-500';
};

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="font-mono font-bold text-muted-foreground">#{rank}</span>;
};

// ════════════════════════════════════════════════════════════════════════════
// CONTRIBUTOR TYPES
// ════════════════════════════════════════════════════════════════════════════

interface Contributor {
  rank: number;
  id: string;
  display_name: string;
  state_id: string | null;
  approved_count: number;
  contribution_score: number;
  tier: { key: string; label: string; emoji: string };
  member_since: string;
}

interface ContributorStats {
  total_contributors: number;
  total_points: number;
}

// ════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<string>('politicians');

  // ── Politician leaderboard state (from API) ───────────────────────────
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [politiciansLoading, setPoliticiansLoading] = useState(false);
  const [chamber, setChamber] = useState<string>('all');
  const [officeLevel, setOfficeLevel] = useState<string>('all');
  const [party, setParty] = useState<string>('all');
  const [state, setState] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'ratings'>('score');

  // Fetch leaderboard data from API whenever filters change
  const fetchLeaderboard = useCallback(async () => {
    setPoliticiansLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', sortBy });
      if (chamber !== 'all') params.set('chamber', chamber);
      if (officeLevel !== 'all') params.set('office_level', officeLevel);
      if (party !== 'all') params.set('party', party);
      if (state !== 'all') params.set('state', state);

      const res = await fetch(`/api/v1/leaderboard?${params}`);
      if (res.ok) {
        const json = await res.json();
        setLeaderboardData(json.data ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setPoliticiansLoading(false);
    }
  }, [chamber, officeLevel, party, state, sortBy]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const topThree = leaderboardData.slice(0, 3);

  // ── Contributor leaderboard state ────────────────────────────────────
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [contributorStats, setContributorStats] = useState<ContributorStats>({
    total_contributors: 0,
    total_points: 0,
  });
  const [contributorsLoading, setContributorsLoading] = useState(false);
  const [contributorsFetched, setContributorsFetched] = useState(false);

  const fetchContributors = useCallback(async () => {
    if (contributorsFetched) return;
    setContributorsLoading(true);
    try {
      const res = await fetch('/api/v1/contributors?limit=50');
      if (res.ok) {
        const json = await res.json();
        setContributors(json.data ?? []);
        setContributorStats(json.stats ?? { total_contributors: 0, total_points: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch contributors:', err);
    } finally {
      setContributorsLoading(false);
      setContributorsFetched(true);
    }
  }, [contributorsFetched]);

  useEffect(() => {
    if (activeTab === 'contributors') {
      fetchContributors();
    }
  }, [activeTab, fetchContributors]);

  const topContributors = contributors.slice(0, 3);

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-federal-green to-federal-green/90 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/confetti.svg')] opacity-5" />
        <div className="container mx-auto px-4 py-10 md:py-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="h-8 w-8 text-gold" />
              <Badge className="bg-gold/20 text-gold border-gold/30">
                Rankings &amp; Recognition
              </Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Leaderboard
            </h1>
            <p className="text-lg text-white/80">
              Nigeria&apos;s officials ranked by Electorating — and
              recognising the citizens who help keep them honest.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tab Switcher */}
      <section className="container mx-auto px-4 -mt-6 relative z-10 mb-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12">
            <TabsTrigger value="politicians" className="gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Politicians
            </TabsTrigger>
            <TabsTrigger value="contributors" className="gap-2 text-base">
              <Heart className="h-4 w-4" />
              Contributors
            </TabsTrigger>
          </TabsList>

          {/* ═══════ POLITICIANS TAB ═══════ */}
          <TabsContent value="politicians" className="mt-10">
            {/* Top 3 Podium */}
            {topThree.length >= 3 && topThree.some((e) => e.total_ratings > 0) && (
            <section className="mb-4">
              <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:items-end md:gap-8">
                {topThree[1] && (
                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-[280px] md:flex-1 md:max-w-[200px] order-2 md:order-1">
                    <Card className="bg-gradient-to-b from-gray-100 dark:from-gray-800 to-white dark:to-card border-gray-200 dark:border-gray-700 h-full">
                      <CardContent className="p-4 md:p-6 text-center">
                        <div className="w-12 h-12 md:w-16 md:h-16 mx-auto rounded-full bg-gray-200 flex items-center justify-center mb-2 md:mb-3">
                          <Medal className="h-6 w-6 md:h-8 md:w-8 text-gray-500" />
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-gray-500 mb-1 md:mb-2">2nd</p>
                        <Link href={`/politicians/${topThree[1].politician.slug}`} className="font-semibold hover:text-teal transition-colors line-clamp-1">
                          {topThree[1].politician.full_name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{topThree[1].position.state}</p>
                        <div className="mt-2 md:mt-3"><AccountabilityScoreRing score={topThree[1].score} size="sm" /></div>
                        <p className="text-xs text-muted-foreground mt-1">{topThree[1].total_ratings} {topThree[1].total_ratings === 1 ? 'Electorating' : 'Electoratings'}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
                {topThree[0] && (
                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="w-full max-w-[280px] md:flex-1 md:max-w-[240px] md:-mt-8 order-1 md:order-2">
                    <Card className="bg-gradient-to-b from-gold/20 to-white dark:to-card border-gold/30 shadow-lg h-full">
                      <CardContent className="p-4 md:p-6 text-center">
                        <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full bg-gold/20 flex items-center justify-center mb-2 md:mb-3">
                          <Crown className="h-8 w-8 md:h-10 md:w-10 text-gold" />
                        </div>
                        <p className="text-2xl md:text-3xl font-bold text-gold mb-1 md:mb-2">1st</p>
                        <Link href={`/politicians/${topThree[0].politician.slug}`} className="font-semibold text-lg hover:text-teal transition-colors line-clamp-1">
                          {topThree[0].politician.full_name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{topThree[0].position.state}</p>
                        <div className="mt-2 md:mt-3"><AccountabilityScoreRing score={topThree[0].score} size="md" /></div>
                        <p className="text-xs text-muted-foreground mt-1">{topThree[0].total_ratings} {topThree[0].total_ratings === 1 ? 'Electorating' : 'Electoratings'}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
                {topThree[2] && (
                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="w-full max-w-[280px] md:flex-1 md:max-w-[200px] order-3">
                    <Card className="bg-gradient-to-b from-amber-50 dark:from-amber-900/20 to-white dark:to-card border-amber-200 dark:border-amber-800 h-full">
                      <CardContent className="p-4 md:p-6 text-center">
                        <div className="w-12 h-12 md:w-16 md:h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-2 md:mb-3">
                          <Medal className="h-6 w-6 md:h-8 md:w-8 text-amber-600" />
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-amber-600 mb-1 md:mb-2">3rd</p>
                        <Link href={`/politicians/${topThree[2].politician.slug}`} className="font-semibold hover:text-teal transition-colors line-clamp-1">
                          {topThree[2].politician.full_name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{topThree[2].position.state}</p>
                        <div className="mt-2 md:mt-3"><AccountabilityScoreRing score={topThree[2].score} size="sm" /></div>
                        <p className="text-xs text-muted-foreground mt-1">{topThree[2].total_ratings} {topThree[2].total_ratings === 1 ? 'Electorating' : 'Electoratings'}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </section>
            )}

            {/* Filters — compact inline bar */}
            <section className="mb-4">
              <div className="flex flex-wrap items-center gap-2 p-3 bg-card border rounded-xl">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-muted-foreground shrink-0">Filter:</span>
                <Select value={chamber} onValueChange={(v) => setChamber(v ?? 'all')}>
                  <SelectTrigger className="h-9 sm:h-8 text-xs w-full sm:w-[130px]"><SelectValue placeholder="All Chambers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chambers</SelectItem>
                    <SelectItem value="Senate">Senate</SelectItem>
                    <SelectItem value="House">House of Reps</SelectItem>
                    <SelectItem value="State Assembly">State Assembly</SelectItem>
                    <SelectItem value="Executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={officeLevel} onValueChange={(v) => setOfficeLevel(v ?? 'all')}>
                  <SelectTrigger className="h-9 sm:h-8 text-xs w-full sm:w-[120px]"><SelectValue placeholder="All Levels" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {OFFICE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={party} onValueChange={(v) => setParty(v ?? 'all')}>
                  <SelectTrigger className="h-9 sm:h-8 text-xs w-full sm:w-[120px]"><SelectValue placeholder="All Parties" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parties</SelectItem>
                    {POLITICAL_PARTIES.map((p) => (
                      <SelectItem key={p.code} value={p.code}>{p.code} – {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={state} onValueChange={(v) => setState(v ?? 'all')}>
                  <SelectTrigger className="h-9 sm:h-8 text-xs w-full sm:w-[130px]"><SelectValue placeholder="All States" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {NIGERIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="ml-auto">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="h-9 sm:h-8 text-xs w-full sm:w-[140px]"><SelectValue placeholder="Sort by..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Electorating Score</SelectItem>
                      <SelectItem value="ratings">Most Electorated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Politician Rankings Table */}
            <section className="pb-16">
              <Card>
                <CardHeader>
                  <CardTitle>Full Rankings</CardTitle>
                  <CardDescription>
                    {politiciansLoading
                      ? 'Loading...'
                      : `${leaderboardData.length} officials • Electorated by constituents`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {politiciansLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-20 ml-auto" />
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Rank</TableHead>
                          <TableHead>Politician</TableHead>
                          <TableHead className="hidden md:table-cell">Position</TableHead>
                          <TableHead className="hidden lg:table-cell">State</TableHead>
                          <TableHead className="hidden md:table-cell">Party</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-center hidden lg:table-cell">Electoratings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {leaderboardData.map((entry, index) => (
                            <motion.tr
                              key={entry.politician.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.2, delay: index * 0.02 }}
                              className="group hover:bg-surface/50"
                            >
                              <TableCell>
                                <div className="flex items-center justify-center w-10">
                                  {getRankIcon(entry.rank)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Link href={`/politicians/${entry.politician.slug}`} className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={entry.politician.photo_url} />
                                    <AvatarFallback className="bg-federal-green/10 text-federal-green">
                                      {entry.politician.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <span className="font-medium group-hover:text-teal transition-colors block">
                                      {entry.politician.full_name}
                                    </span>
                                    <span className="text-xs text-muted-foreground md:hidden">
                                      {entry.position.party} • {entry.position.state}
                                    </span>
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="outline">{entry.position.chamber}</Badge>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-muted-foreground">
                                {entry.position.state}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge className={`${getPartyColor(entry.position.party)} text-white border-0`}>
                                  {entry.position.party}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {entry.total_ratings > 0 ? (
                                  <span className={`font-bold ${entry.score >= 70 ? 'text-green-600' : entry.score >= 40 ? 'text-amber-600' : 'text-coral-red'}`}>
                                    {entry.score}%
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center hidden lg:table-cell">
                                <span className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                                  <MessageSquare className="h-3 w-3" />
                                  {entry.total_ratings}
                                </span>
                              </TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                  )}

                  {!politiciansLoading && leaderboardData.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No politicians found</h3>
                      <p className="text-muted-foreground">Try adjusting your filter criteria.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </TabsContent>

          {/* ═══════ CONTRIBUTORS TAB ═══════ */}
          <TabsContent value="contributors" className="mt-2">
            {/* Contributor Stats Strip */}
            <section className="mb-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="h-5 w-5 text-federal-green mx-auto mb-1" />
                    <p className="text-2xl font-bold">{contributorStats.total_contributors}</p>
                    <p className="text-xs text-muted-foreground">Total Contributors</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Star className="h-5 w-5 text-gold mx-auto mb-1" />
                    <p className="text-2xl font-bold">{contributorStats.total_points.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Points Earned</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Award className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold">
                      {contributors.filter((c) => c.tier.key === 'champion' || c.tier.key === 'guardian').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Champions+</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Sparkles className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold">
                      {contributors.length > 0 ? contributors[0].contribution_score : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Top Score</p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Top 3 Contributors Podium */}
            {topContributors.length >= 3 && (
              <section className="mb-12">
                <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:items-end md:gap-8">
                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-[280px] md:flex-1 md:max-w-[200px] order-2 md:order-1">
                    <Card className="bg-gradient-to-b from-gray-100 dark:from-gray-800 to-white dark:to-card border-gray-200 dark:border-gray-700 h-full">
                      <CardContent className="p-4 md:p-6 text-center">
                        <div className="text-3xl md:text-4xl mb-2">{topContributors[1].tier.emoji}</div>
                        <p className="text-xl md:text-2xl font-bold text-gray-500 mb-1 md:mb-2">2nd</p>
                        <p className="font-semibold line-clamp-1">{topContributors[1].display_name}</p>
                        <p className="text-sm text-muted-foreground">{topContributors[1].tier.label}</p>
                        <p className="text-lg font-bold text-federal-green mt-2">{topContributors[1].contribution_score} pts</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="w-full max-w-[280px] md:flex-1 md:max-w-[240px] md:-mt-8 order-1 md:order-2">
                    <Card className="bg-gradient-to-b from-gold/20 to-white dark:to-card border-gold/30 shadow-lg h-full">
                      <CardContent className="p-4 md:p-6 text-center">
                        <div className="text-4xl md:text-5xl mb-2">{topContributors[0].tier.emoji}</div>
                        <p className="text-2xl md:text-3xl font-bold text-gold mb-1 md:mb-2">1st</p>
                        <p className="font-semibold text-lg line-clamp-1">{topContributors[0].display_name}</p>
                        <p className="text-sm text-muted-foreground">{topContributors[0].tier.label}</p>
                        <p className="text-xl font-bold text-federal-green mt-2">{topContributors[0].contribution_score} pts</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="w-full max-w-[280px] md:flex-1 md:max-w-[200px] order-3">
                    <Card className="bg-gradient-to-b from-amber-50 dark:from-amber-900/20 to-white dark:to-card border-amber-200 dark:border-amber-800 h-full">
                      <CardContent className="p-4 md:p-6 text-center">
                        <div className="text-3xl md:text-4xl mb-2">{topContributors[2].tier.emoji}</div>
                        <p className="text-xl md:text-2xl font-bold text-amber-600 mb-1 md:mb-2">3rd</p>
                        <p className="font-semibold line-clamp-1">{topContributors[2].display_name}</p>
                        <p className="text-sm text-muted-foreground">{topContributors[2].tier.label}</p>
                        <p className="text-lg font-bold text-federal-green mt-2">{topContributors[2].contribution_score} pts</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </section>
            )}

            {/* Tier Legend */}
            <section className="mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Contributor Tiers</CardTitle>
                  <CardDescription>
                    Earn points by submitting verified edits and adding new officials
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {CONTRIBUTOR_TIERS.map((tier) => (
                      <div
                        key={tier.key}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${tier.bgColor} ${tier.color}`}
                      >
                        <span>{tier.emoji}</span>
                        <span>{tier.label}</span>
                        <span className="text-xs opacity-70">({tier.minScore}+ pts)</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 md:gap-6 text-sm text-muted-foreground">
                    <span>📝 Edit approved = <strong>+10 pts</strong></span>
                    <span>➕ New official added = <strong>+25 pts</strong></span>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Contributors Table */}
            <section className="pb-16">
              <Card>
                <CardHeader>
                  <CardTitle>All Contributors</CardTitle>
                  <CardDescription>
                    Citizens helping keep Nigerian democracy transparent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {contributorsLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-20 ml-auto" />
                        </div>
                      ))}
                    </div>
                  ) : contributors.length === 0 ? (
                    <div className="text-center py-12">
                      <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No contributors yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Be the first! Submit an edit or add a new official to start earning points.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Rank</TableHead>
                            <TableHead>Contributor</TableHead>
                            <TableHead className="hidden md:table-cell">Tier</TableHead>
                            <TableHead className="hidden lg:table-cell">State</TableHead>
                            <TableHead className="text-center">Approved</TableHead>
                            <TableHead className="text-center">Score</TableHead>
                            <TableHead className="hidden md:table-cell">Member Since</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {contributors.map((c, index) => {
                              const tier = getContributorTier(c.contribution_score);
                              return (
                                <motion.tr
                                  key={c.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  transition={{ duration: 0.2, delay: index * 0.02 }}
                                  className="group hover:bg-surface/50"
                                >
                                  <TableCell>
                                    <div className="flex items-center justify-center w-10">
                                      {getRankIcon(c.rank)}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-federal-green/10 text-federal-green">
                                          {c.display_name
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')
                                            .slice(0, 2)
                                            .toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="font-medium">{c.display_name}</p>
                                        <p className="text-xs text-muted-foreground md:hidden">
                                          {tier.emoji} {tier.label}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tier.bgColor} ${tier.color}`}>
                                      {tier.emoji} {tier.label}
                                    </span>
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                                    {c.state_id || '—'}
                                  </TableCell>
                                  <TableCell className="text-center font-medium">
                                    {c.approved_count}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className="font-bold text-federal-green">
                                      {c.contribution_score}
                                    </span>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                    {new Date(c.member_since).toLocaleDateString('en-NG', {
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </TableCell>
                                </motion.tr>
                              );
                            })}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
