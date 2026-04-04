import Link from 'next/link';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { SearchBar } from '@/components/search';
import { Button } from '@/components/ui/button';
import { AddOfficialDialog } from '@/components/crowdsource';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HomeRepresentativesSection } from '@/components/home/home-representatives-section';
import { 
  ArrowRight, 
  Users, 
  Map, 
  Trophy,
  TrendingUp,
  AlertTriangle,
  Star,
  Newspaper,
  Scale,
  Vote,
  Crown,
  Building2,
  Landmark,
  MapPin,
} from 'lucide-react';
import { NIGERIAN_STATES } from '@/types';

const partyBadgeClass = (party: string | null | undefined): string => {
  const map: Record<string, string> = {
    APC:  'bg-[#271E5D] text-white',
    PDP:  'bg-[#E84C30] text-white',
    LP:   'bg-[#00C49A] text-white',
    NNPP: 'bg-[#5D49D6] text-white',
    APGA: 'bg-purple-600 text-white',
    YPP:  'bg-purple-500 text-white',
    ADC:  'bg-[#5D49D6]/80 text-white',
    SDP:  'bg-[#271E5D]/80 text-white',
  };
  return map[party ?? ''] ?? 'bg-[#787680] text-white';
};

// This would come from the database in production
const featuredStats = {
  totalPoliticians: 1650,
  totalStates: 36,
  promisesTracked: 2847,
  corruptionCases: 89,
};

export default async function HomePage() {
  // Featured Officials — driven by real community ratings (same source as Leaderboard).
  // For each chamber, we pick the politician with the highest average community score.
  const adminClient = supabaseAdmin ?? supabase;

  type FeaturedRow = {
    id: string;
    full_name: string;
    slug: string;
    photo_url: string | null;
    state_of_origin: string;
    community_score: number;
    total_ratings: number;
    positions: Array<{ title: string; party: string; state: string; chamber: string; is_current: boolean }>;
  };

  const FEATURED_SELECT = 'id, full_name, slug, photo_url, state_of_origin, positions!inner(title, party, state, chamber, is_current)';

  // Fetch politicians per chamber + all community ratings in parallel
  const [senateRes, houseRes, execRes, ratingsRes] = await Promise.all([
    supabase.from('politicians').select(FEATURED_SELECT)
      .eq('positions.is_current', true).eq('positions.chamber', 'Senate'),
    supabase.from('politicians').select(FEATURED_SELECT)
      .eq('positions.is_current', true).eq('positions.chamber', 'House'),
    supabase.from('politicians').select(FEATURED_SELECT)
      .eq('positions.is_current', true).eq('positions.chamber', 'Executive'),
    adminClient.from('politician_ratings').select('politician_id, constituency_presence, legislative_activity, constituency_projects, accessibility, transparency, infrastructure, security, healthcare_education, economic_activity, transparency_communication'),
  ]);

  // Build score map from real dimension columns (average of non-null 1-5 ratings × 20 → 0-100)
  const ratingSum: Record<string, number> = {};
  const ratingCount: Record<string, number> = {};
  type RatingRow = { politician_id: string; constituency_presence: number|null; legislative_activity: number|null; constituency_projects: number|null; accessibility: number|null; transparency: number|null; infrastructure: number|null; security: number|null; healthcare_education: number|null; economic_activity: number|null; transparency_communication: number|null; };
  for (const r of ((ratingsRes.data as unknown as RatingRow[]) ?? [])) {
    const dims = [r.constituency_presence, r.legislative_activity, r.constituency_projects, r.accessibility, r.transparency, r.infrastructure, r.security, r.healthcare_education, r.economic_activity, r.transparency_communication];
    const scored = dims.filter((v): v is number => v != null && v > 0);
    if (scored.length === 0) continue;
    const avg = scored.reduce((s, v) => s + v, 0) / scored.length;
    ratingSum[r.politician_id] = (ratingSum[r.politician_id] ?? 0) + avg;
    ratingCount[r.politician_id] = (ratingCount[r.politician_id] ?? 0) + 1;
  }
  const getScore = (id: string) => {
    const cnt = ratingCount[id] ?? 0;
    return cnt > 0 ? Math.round(((ratingSum[id] ?? 0) / cnt) * 20) : 0;
  };

  // Pick top-rated (or first if none rated) per chamber
  const pickTop = (rows: typeof senateRes.data): FeaturedRow | null => {
    if (!rows?.length) return null;
    const sorted = [...rows].sort((a, b) => getScore(b.id) - getScore(a.id));
    const top = sorted[0] as typeof sorted[0] & { positions: FeaturedRow['positions'] };
    return { ...top, community_score: getScore(top.id), total_ratings: ratingCount[top.id] ?? 0 };
  };

  const featuredPoliticians: FeaturedRow[] = [
    pickTop(senateRes.data),
    pickTop(houseRes.data),
    pickTop(execRes.data),
  ].filter((p): p is FeaturedRow => p !== null);
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-[#E8FCF5] to-[#00C49A]/40 dark:from-[#121210] dark:via-[#121210] dark:to-[#271E5D]/40">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#00C49A]/20 dark:bg-[#00C49A]/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#5D49D6]/10 dark:bg-[#5D49D6]/5 blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full bg-[#00C49A]/15 dark:bg-[#00C49A]/5 blur-2xl" />

        <div className="container mx-auto px-4 py-12 md:py-28 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="bg-[#5D49D6] text-white mb-6">
              2027 Elections Tracker Now Live
            </Badge>
            <h1 className="font-display text-3xl md:text-6xl font-bold mb-4 md:mb-6 leading-tight text-[#271E5D] dark:text-white">
              They Work
              <span className="text-[#5D49D6] dark:text-[#00C49A]"> For You.</span>
              <br />
              <span className="text-[#271E5D]/80 dark:text-white/80">Act Like It.</span>
            </h1>
            <p className="text-base md:text-xl text-[#787680] dark:text-[#9C9C98] mb-6 md:mb-8 max-w-2xl mx-auto">
              Nigeria&apos;s civic accountability platform. Track records, submit Electoratings,
              and hold every official accountable &mdash; from the President to your LGA Chairman.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-xl mx-auto mb-8">
              <SearchBar 
                placeholder="Search for a politician by name..." 
                className="w-full"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/politicians">
                <Button size="lg" className="bg-[#5D49D6] text-white hover:bg-[#5D49D6]/90 gap-2">
                  <Users className="w-5 h-5" />
                  Explore Officials
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              {/* <Link href="/states">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 gap-2">
                  <Vote className="w-5 h-5" />
                  Who&apos;s My Rep?
                </Button>
              </Link> */}
              <AddOfficialDialog triggerClassName="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#271E5D]/20 dark:border-white/20 bg-white dark:bg-white/10 text-[#271E5D] dark:text-white hover:bg-[#271E5D]/5 dark:hover:bg-white/15 h-9 px-5 text-sm font-semibold transition-colors" />
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-t border-[#271E5D]/10 dark:border-white/10 bg-white/60 dark:bg-card/60 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
              <div>
                <div className="font-mono text-2xl md:text-4xl font-bold text-[#5D49D6]">
                  {featuredStats.totalPoliticians}
                </div>
                <div className="text-sm text-[#787680] dark:text-[#9C9C98]">Elected Officials Tracked</div>
              </div>
              <div>
                <div className="font-mono text-2xl md:text-4xl font-bold text-[#00C49A]">
                  {featuredStats.totalStates}+1
                </div>
                <div className="text-sm text-[#787680] dark:text-[#9C9C98]">States + FCT</div>
              </div>
              <div>
                <div className="font-mono text-2xl md:text-4xl font-bold text-[#271E5D] dark:text-[#5D49D6]">
                  {featuredStats.promisesTracked.toLocaleString()}
                </div>
                <div className="text-sm text-[#787680] dark:text-[#9C9C98]">Promises Tracked</div>
              </div>
              <div>
                <div className="font-mono text-2xl md:text-4xl font-bold text-[#E84C30]">
                  {featuredStats.corruptionCases}
                </div>
                <div className="text-sm text-[#787680] dark:text-[#9C9C98]">Corruption Cases</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* My Representatives — only shown when user is logged in & location set */}
      <HomeRepresentativesSection />

      {/* Featured Politicians Section */}
      <section className="py-12 md:py-16 bg-[#F8F6F1] dark:bg-[#121210]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Featured Officials
              </h2>
              <p className="text-muted-foreground mt-1">
                Highest-Electorated officials across Senate, House &amp; Executives
              </p>
            </div>
            <Link href="/politicians">
              <Button variant="outline" className="bg-card gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {featuredPoliticians.map((pol) => {
              const pos = pol.positions[0];
              const initials = pol.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              const score = pol.community_score;
              const scoreColor =
                score >= 70 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800' :
                score >= 40 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-gray-700';
              const chamberLabel =
                pos?.chamber === 'Senate' ? 'Senator' :
                pos?.chamber === 'House' ? 'House Rep' :
                pos?.chamber === 'Executive' ? 'Executive' : pos?.chamber;
              return (
                <Link key={pol.slug} href={`/politicians/${pol.slug}`}>
                  <Card className="hover:shadow-lg transition-all duration-300 hover:border-[#271E5D]/30 dark:hover:border-white/20 cursor-pointer h-full">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-start gap-3 md:gap-4">
                        <div className="relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0">
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-[#271E5D]/10 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                            {pol.photo_url ? (
                              <img src={pol.photo_url} alt={pol.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl font-display font-bold text-[#271E5D] dark:text-white">{initials}</span>
                            )}
                          </div>
                          {/* Score badge — top-right of photo */}
                          {score > 0 && (
                            <span className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${scoreColor}`}>
                              {score}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-display font-semibold text-foreground truncate">
                              {pol.full_name}
                            </h3>
                            <Badge className={`${partyBadgeClass(pos?.party)} text-xs shrink-0`}>
                              {pos?.party}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{pos?.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <p className="text-xs text-muted-foreground">{pos?.state ?? pol.state_of_origin} State</p>
                            {chamberLabel && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{chamberLabel}</Badge>
                            )}
                          </div>
                          {score > 0 ? (
                            <div className="mt-2 md:mt-3 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-gray-400'}`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-bold ${score >= 70 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-gray-500'}`}>
                                  {score}%
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {pol.total_ratings} {pol.total_ratings === 1 ? 'Electorating' : 'Electoratings'}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic mt-2 md:mt-3">Not yet Electorated — be the first</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Browse by State */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Browse by Office
              </h2>
              <p className="text-muted-foreground mt-1">
                Explore officials by their type of office
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            <Link href="/politicians?chamber=Executive&office_level=state">
              <div className="group p-4 md:p-5 rounded-xl bg-card border-2 border-transparent hover:border-[#5D49D6] hover:shadow-md transition-all text-center cursor-pointer">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#5D49D6]/10 flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <Crown className="w-5 h-5 md:w-6 md:h-6 text-[#5D49D6]" />
                </div>
                <div className="font-display font-bold text-xl md:text-2xl text-[#5D49D6]">37</div>
                <div className="font-semibold text-foreground mt-1">Governors</div>
                <div className="text-xs text-muted-foreground mt-0.5">36 States + FCT</div>
              </div>
            </Link>

            <Link href="/politicians?chamber=Senate">
              <div className="group p-4 md:p-5 rounded-xl bg-card border-2 border-transparent hover:border-[#271E5D] dark:hover:border-[#5D49D6] hover:shadow-md transition-all text-center cursor-pointer h-full">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#271E5D]/10 dark:bg-[#5D49D6]/10 flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <Landmark className="w-5 h-5 md:w-6 md:h-6 text-[#271E5D] dark:text-[#5D49D6]" />
                </div>
                <div className="font-display font-bold text-xl md:text-2xl text-[#271E5D] dark:text-[#5D49D6]">109</div>
                <div className="font-semibold text-foreground mt-1">Senators</div>
                <div className="text-xs text-muted-foreground mt-0.5">Upper chamber</div>
              </div>
            </Link>

            <Link href="/politicians?chamber=House">
              <div className="group p-4 md:p-5 rounded-xl bg-card border-2 border-transparent hover:border-[#00C49A] hover:shadow-md transition-all text-center cursor-pointer h-full">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#00C49A]/10 flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-[#00C49A]" />
                </div>
                <div className="font-display font-bold text-xl md:text-2xl text-[#00C49A]">360</div>
                <div className="font-semibold text-foreground mt-1">Federal Reps</div>
                <div className="text-xs text-muted-foreground mt-0.5">House of Reps</div>
              </div>
            </Link>

            <Link href="/politicians?chamber=State+Assembly">
              <div className="group p-4 md:p-5 rounded-xl bg-card border-2 border-transparent hover:border-[#5D49D6] hover:shadow-md transition-all text-center cursor-pointer h-full">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#5D49D6]/10 flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <Building2 className="w-5 h-5 md:w-6 md:h-6 text-[#5D49D6]" />
                </div>
                <div className="font-display font-bold text-xl md:text-2xl text-[#5D49D6]">993</div>
                <div className="font-semibold text-foreground mt-1">State Reps</div>
                <div className="text-xs text-muted-foreground mt-0.5">State Assemblies</div>
              </div>
            </Link>

            <Link href="/politicians?chamber=Executive&office_level=local">
              <div className="group p-4 md:p-5 rounded-xl bg-card border-2 border-transparent hover:border-[#E84C30] hover:shadow-md transition-all text-center cursor-pointer h-full">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#E84C30]/10 flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <MapPin className="w-5 h-5 md:w-6 md:h-6 text-[#E84C30]" />
                </div>
                <div className="font-display font-bold text-xl md:text-2xl text-[#E84C30]">774</div>
                <div className="font-semibold text-foreground mt-1">LGA Chairmen</div>
                <div className="text-xs text-muted-foreground mt-0.5">Local Government</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Browse by State */}
      <section className="py-12 md:py-16 bg-[#F8F6F1] dark:bg-[#121210]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Browse by State
              </h2>
              <p className="text-muted-foreground mt-1">
                Find elected officials representing your state
              </p>
            </div>
            <Link href="/states">
              <Button variant="outline" className="bg-card gap-2">
                <Map className="w-4 h-4" />
                View All States
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-2">
            {NIGERIAN_STATES.map((state) => (
              <Link key={state} href={`/states/${state.toLowerCase().replace(/\s+/g, '-')}`}>
                <div className="p-3 rounded-lg bg-card border hover:border-[#271E5D] dark:hover:border-[#5D49D6] hover:bg-[#271E5D]/5 dark:hover:bg-[#5D49D6]/10 transition-colors text-center cursor-pointer">
                  <span className="text-sm font-medium text-foreground">{state}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-16 bg-[#F8F6F1] dark:bg-[#121210]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Hold Your Representatives Accountable
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Real tools for tracking, scrutinising, and submitting Electoratings on Nigeria&apos;s elected officials at every level
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-card">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-[#5D49D6]/10 flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-[#5D49D6]" />
                </div>
                <CardTitle className="text-lg">Electorating</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Constituents submit monthly Electoratings for their officials across key dimensions — delivery, transparency, accessibility, and more. Rate them. Hold them accountable.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-[#E84C30]/10 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-[#E84C30]" />
                </div>
                <CardTitle className="text-lg">Legal &amp; Corruption Records</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track EFCC, ICPC and court proceedings for every official. Know who has active legal issues.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-[#00C49A]/10 flex items-center justify-center mb-4">
                  <Newspaper className="w-6 h-6 text-[#00C49A]" />
                </div>
                <CardTitle className="text-lg">News Monitor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Aggregated news from verified sources covering each official — filtered by politician, state, or topic.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-[#271E5D]/10 dark:bg-[#5D49D6]/10 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-[#271E5D] dark:text-[#5D49D6]" />
                </div>
                <CardTitle className="text-lg">Constituency Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  See what infrastructure and development projects your rep has delivered, with budgets and completion status.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-[#271E5D] text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
            Your Vote Put Them There.
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8">
            Sign up to start Electorating your officials, submit tips, and earn recognition as a civic watchdog.
            Your Electoratings help keep Nigerian democracy honest.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/leaderboard">
              <Button size="lg" className="bg-[#5D49D6] text-white hover:bg-[#5D49D6]/90 gap-2">
                <Trophy className="w-5 h-5" />
                Start Electorating
              </Button>
            </Link>
            <Link href="/politicians">
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 gap-2">
                Learn More
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
