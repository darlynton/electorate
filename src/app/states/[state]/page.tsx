'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MapPin,
  Users,
  Building2,
  ChevronRight,
  Award,
  AlertTriangle,
  ArrowUpRight,
  Landmark,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountabilityScoreRing } from '@/components/politicians/accountability-score-ring';
import { PoliticianCard } from '@/components/politicians/politician-card';
import { NIGERIAN_STATES, GEOPOLITICAL_ZONES } from '@/types';
import type { Politician, Position, AccountabilityScore } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────────────
interface RepSummary {
  politician_id: string;
  full_name: string;
  slug: string;
  photo_url: string | null;
  party: string | null;
  title: string;
}
interface SenatorialDistrict { district: string; senator: RepSummary | null; }
interface FederalConstituency { constituency: string; house_rep: RepSummary | null; }
interface ConstituenciesData {
  state: string;
  senatorial_districts: SenatorialDistrict[];
  federal_constituencies: FederalConstituency[];
}
interface StatePolitician extends Politician { position: Position; score: number; }

// ── Helpers ────────────────────────────────────────────────────────────────────
const createScore = (n: number): AccountabilityScore => ({
  overall: n, total: n,
  attendance: Math.round(n * 0.9), voting_consistency: Math.round(n * 0.85),
  promise_fulfillment: Math.round(n * 0.7), transparency: Math.round(n * 0.8),
  constituent_engagement: Math.round(n * 0.75),
  grade: n >= 80 ? 'A' : n >= 70 ? 'B' : n >= 50 ? 'C' : n >= 30 ? 'D' : 'F',
  color: n >= 70 ? 'green' : n >= 40 ? 'amber' : 'red',
});
const getZone = (state: string) => {
  for (const [z, states] of Object.entries(GEOPOLITICAL_ZONES))
    if (states.includes(state)) return z;
  return 'Unknown';
};
const zoneColors: Record<string,string> = {
  'North-Central':'bg-blue-500','North-East':'bg-amber-500','North-West':'bg-orange-500',
  'South-East':'bg-green-500','South-South':'bg-teal-500','South-West':'bg-purple-500',
};
const PARTY_BG: Record<string,string> = {
  APC:'bg-[#271E5D] text-white',PDP:'bg-[#E84C30] text-white',LP:'bg-[#00C49A] text-white',
  NNPP:'bg-[#5D49D6] text-white',APGA:'bg-purple-600 text-white',
};
const pc = (p:string|null) => p ? (PARTY_BG[p] ?? 'bg-gray-500 text-white') : '';

// ── RepCard ────────────────────────────────────────────────────────────────────
function RepCard({ rep, role }: { rep: RepSummary | null; role: string }) {
  if (!rep) return <p className="text-xs text-muted-foreground italic">No profile yet</p>;
  return (
    <Link href={`/politicians/${rep.slug}`} className="flex items-center gap-3 group min-w-0">
      <div className="relative w-9 h-9 flex-shrink-0 rounded-lg overflow-hidden bg-[#271E5D]/10 dark:bg-white/10">
        {rep.photo_url
          ? <Image src={rep.photo_url} alt={rep.full_name} fill sizes="36px" className="object-cover" />
          : <div className="w-full h-full flex items-center justify-center">
              <span className="text-sm font-bold text-[#271E5D] dark:text-white">{rep.full_name.charAt(0)}</span>
            </div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate group-hover:text-[#271E5D] dark:group-hover:text-[#00C49A] transition-colors">
          {rep.full_name}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">{role}</span>
          {rep.party && <Badge className={`text-[10px] px-1 py-0 leading-tight ${pc(rep.party)}`}>{rep.party}</Badge>}
        </div>
      </div>
      <ExternalLink className="w-3 h-3 text-muted-foreground/40 group-hover:text-[#271E5D] flex-shrink-0 transition-colors" />
    </Link>
  );
}

// ── ConstituenciesTab ──────────────────────────────────────────────────────────
function ConstituenciesTab({ data, loading }: { data: ConstituenciesData | null; loading: boolean }) {
  if (loading) return (
    <div className="space-y-4">
      {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );
  if (!data) return null;
  return (
    <div className="space-y-8">
      {/* Senatorial Districts */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
          <h3 className="font-display font-semibold text-lg">Senatorial Districts ({data.senatorial_districts.length})</h3>
        </div>
        {data.senatorial_districts.length === 0
          ? <p className="text-sm text-muted-foreground">No senatorial data available yet.</p>
          : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.senatorial_districts.map(({ district, senator }) => (
                <Card key={district} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 truncate">{district}</p>
                    <RepCard rep={senator} role="Senator" />
                  </CardContent>
                </Card>
              ))}
            </div>}
      </div>

      {/* Federal Constituencies */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#00C49A]" />
          <h3 className="font-display font-semibold text-lg">Federal Constituencies ({data.federal_constituencies.length})</h3>
        </div>
        {data.federal_constituencies.length === 0
          ? <p className="text-sm text-muted-foreground">No constituency data available yet.</p>
          : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.federal_constituencies.map(({ constituency, house_rep }) => (
                <Card key={constituency} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 truncate">{constituency}</p>
                    <RepCard rep={house_rep} role="House Rep" />
                  </CardContent>
                </Card>
              ))}
            </div>}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function StateDetailPage({ params }: { params: Promise<{ state: string }> }) {
  const { state: stateParam } = use(params);
  const [activeTab, setActiveTab] = useState('constituencies');
  const [politicians, setPoliticians] = useState<StatePolitician[]>([]);
  const [avgScore, setAvgScore] = useState(0);
  const [polLoading, setPolLoading] = useState(true);
  const [consData, setConsData] = useState<ConstituenciesData | null>(null);
  const [consLoading, setConsLoading] = useState(true);

  const stateName = NIGERIAN_STATES.find(s => s.toLowerCase().replace(/\s+/g, '-') === stateParam);
  if (!stateName) notFound();

  const zone = getZone(stateName!);

  useEffect(() => {
    if (!stateName) return;
    setPolLoading(true);
    fetch(`/api/v1/politicians?state=${encodeURIComponent(stateName!)}&limit=100`)
      .then(r => r.json())
      .then(json => {
        const pols: StatePolitician[] = (json.data ?? []).map(
          (p: Politician & { positions?: Position[]; accountability_score?: number }) => ({
            ...p, position: p.positions?.[0] ?? {}, score: p.accountability_score ?? 0,
          })
        );
        const scored = pols.filter((p) => p.score > 0);
        if (scored.length > 0) {
          setAvgScore(Math.round(scored.reduce((sum, p) => sum + p.score, 0) / scored.length));
        }
        setPoliticians(pols);
      })
      .catch(() => {})
      .finally(() => setPolLoading(false));
  }, [stateName]);

  useEffect(() => {
    if (!stateParam) return;
    setConsLoading(true);
    fetch(`/api/v1/states/${stateParam}/constituencies`)
      .then(r => r.json())
      .then(json => setConsData(json.data ?? null))
      .catch(() => {})
      .finally(() => setConsLoading(false));
  }, [stateParam]);

  const senators    = politicians.filter(p => p.position?.chamber === 'Senate');
  const reps        = politicians.filter(p => p.position?.chamber === 'House');
  const assembly    = politicians.filter(p => p.position?.chamber === 'State Assembly');
  const executives  = politicians.filter(p => p.position?.chamber === 'Executive' && p.position?.office_level === 'state');
  const lgaChairmen = politicians.filter(p => p.position?.office_level === 'local');

  const sdCount = consData?.senatorial_districts.length ?? senators.length;
  const fcCount = consData?.federal_constituencies.length ?? reps.length;

  const partyDist = Object.entries(
    politicians.reduce<Record<string,number>>((a,p) => {
      const party = p.position?.party;
      if (party) a[party] = (a[party]||0)+1;
      return a;
    }, {})
  ).sort((a,b) => b[1]-a[1]);

  const filteredPols =
    activeTab === 'all'       ? politicians :
    activeTab === 'executive' ? executives :
    activeTab === 'senate'    ? senators :
    activeTab === 'house'     ? reps :
    activeTab === 'assembly'  ? assembly :
    activeTab === 'lga'       ? lgaChairmen : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#271E5D] to-[#2D2463] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-5" />
        <div className="container mx-auto px-4 py-12 relative">
          <nav className="flex items-center gap-2 text-sm text-white/70 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/states" className="hover:text-white transition-colors">States</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">{stateName}</span>
          </nav>

          <div className="flex flex-wrap lg:flex-nowrap gap-4 lg:gap-8 items-start">
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="flex-1 min-w-0 basis-full lg:basis-auto order-1">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-4 h-4 rounded-full ${zoneColors[zone]}`} />
                <Badge className="bg-white/20 text-white border-white/30">{zone}</Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">{stateName} State</h1>
              <p className="text-white/80 mb-6 max-w-2xl">
                Explore all constituencies and elected officials in {stateName} State.
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                {[
                  { icon: <Landmark className="h-4 w-4 text-[#5D49D6]" />, label: `${sdCount} Senatorial Districts` },
                  { icon: <Users className="h-4 w-4 text-[#5D49D6]" />, label: `${fcCount} Federal Constituencies` },
                  { icon: <Building2 className="h-4 w-4 text-[#5D49D6]" />, label: `${assembly.length || '—'} Assembly Seats` },
                  { icon: <MapPin className="h-4 w-4 text-[#5D49D6]" />, label: `${lgaChairmen.length || '—'} LGA Chairmen` },
                ].map(({icon,label}) => (
                  <div key={label} className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                    {icon}<span>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {!polLoading && politicians.length > 0 && (
              <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }} className="order-2 lg:order-none ml-auto">
                <Card className="w-[156px] sm:w-[180px] lg:w-72 bg-white/10 backdrop-blur-sm border-white/20">
                  <CardHeader className="pb-1 sm:pb-2">
                    <CardTitle className="text-sm font-medium text-white/80">
                      {avgScore > 0 ? 'Avg. Accountability' : 'Elected Officials'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-start pt-0 pb-3 sm:pb-6">
                    <AccountabilityScoreRing score={avgScore} size="md" />
                    <p className="text-xs text-white/60 mt-2">{politicians.length} profiles in database</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-card border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 py-4 md:py-6 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-[#271E5D] dark:text-[#5D49D6]">{sdCount}</p>
              <p className="text-sm text-muted-foreground">Senatorial Districts</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-[#00C49A]">{fcCount}</p>
              <p className="text-sm text-muted-foreground">Federal Constituencies</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-[#5D49D6]">{partyDist[0]?.[0] || '—'}</p>
              <p className="text-sm text-muted-foreground">Dominant Party</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{politicians.length}</p>
              <p className="text-sm text-muted-foreground">Officials in Database</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6 md:gap-8">
          {/* Sidebar — after main content on mobile */}
          <div className="order-2 lg:order-1 lg:col-span-1 space-y-6">
            {partyDist.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Party Distribution</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {partyDist.map(([party, count]) => (
                    <div key={party}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{party}</span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                      <Progress value={(count / politicians.length) * 100} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-[#5D49D6]" /> Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  { label: 'All Senators', href: `/politicians?chamber=Senate&state=${encodeURIComponent(stateName!)}` },
                  { label: 'House Reps', href: `/politicians?chamber=House&state=${encodeURIComponent(stateName!)}` },
                  { label: 'State Assembly', href: `/politicians?chamber=State+Assembly&state=${encodeURIComponent(stateName!)}` },
                ].map(({label,href}) => (
                  <Link key={label} href={href} className="flex items-center justify-between p-2 rounded-lg text-sm hover:bg-muted transition-colors">
                    <span>{label}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Content — first on mobile */}
          <div className="order-1 lg:order-2 lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle>Representatives & Constituencies</CardTitle>
                    <CardDescription>{stateName} State — all levels of government</CardDescription>
                  </div>
                  <Link href={`/politicians?state=${encodeURIComponent(stateName!)}`}>
                    <Button variant="outline" size="sm">
                      View All <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="mb-6 overflow-x-auto no-scrollbar sm:overflow-visible">
                    <TabsList className="w-full h-auto grid grid-cols-6 gap-1 bg-muted/50 p-1 sm:w-auto sm:inline-flex sm:min-w-max">
                    <TabsTrigger value="constituencies" className="w-full sm:w-auto px-0 sm:px-4 min-h-10 justify-center sm:justify-start gap-2 data-[state=active]:my-0.5">
                      <Landmark className="w-4 h-4" />
                      <span className="sr-only sm:not-sr-only">Constituencies</span>
                    </TabsTrigger>
                    <TabsTrigger value="all" className="w-full sm:w-auto px-0 sm:px-4 min-h-10 justify-center sm:justify-start gap-2 data-[state=active]:my-0.5">
                      <Users className="w-4 h-4" />
                      <span className="sr-only sm:not-sr-only">All {!polLoading && `(${politicians.length})`}</span>
                    </TabsTrigger>
                    <TabsTrigger value="senate" className="w-full sm:w-auto px-0 sm:px-4 min-h-10 justify-center sm:justify-start gap-2 data-[state=active]:my-0.5">
                      <Landmark className="w-4 h-4" />
                      <span className="sr-only sm:not-sr-only">Senate {!polLoading && `(${senators.length})`}</span>
                    </TabsTrigger>
                    <TabsTrigger value="house" className="w-full sm:w-auto px-0 sm:px-4 min-h-10 justify-center sm:justify-start gap-2 data-[state=active]:my-0.5">
                      <Users className="w-4 h-4" />
                      <span className="sr-only sm:not-sr-only">House {!polLoading && `(${reps.length})`}</span>
                    </TabsTrigger>
                    <TabsTrigger value="assembly" className="w-full sm:w-auto px-0 sm:px-4 min-h-10 justify-center sm:justify-start gap-2 data-[state=active]:my-0.5">
                      <Building2 className="w-4 h-4" />
                      <span className="sr-only sm:not-sr-only">Assembly {!polLoading && `(${assembly.length})`}</span>
                    </TabsTrigger>
                    <TabsTrigger value="lga" className="w-full sm:w-auto px-0 sm:px-4 min-h-10 justify-center sm:justify-start gap-2 data-[state=active]:my-0.5">
                      <MapPin className="w-4 h-4" />
                      <span className="sr-only sm:not-sr-only">LGA {!polLoading && `(${lgaChairmen.length})`}</span>
                    </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="constituencies">
                    <ConstituenciesTab data={consData} loading={consLoading} />
                  </TabsContent>

                  {(['all','senate','house','assembly','lga'] as const).map(tab => (
                    <TabsContent key={tab} value={tab}>
                      {polLoading
                        ? <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Loading politicians…</span>
                          </div>
                        : filteredPols.length === 0
                          ? <div className="text-center py-12 text-muted-foreground">
                              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                              <p className="text-sm">No politicians found in this category.</p>
                            </div>
                          : <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="grid md:grid-cols-2 gap-4">
                              {filteredPols.map(p => (
                                <PoliticianCard key={p.id} politician={p} position={p.position} score={createScore(p.score ?? 0)} />
                              ))}
                            </motion.div>}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Related States */}
      <section className="container mx-auto px-4 pb-16">
        <h2 className="text-xl font-display font-semibold mb-6">Other States in {zone}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {(GEOPOLITICAL_ZONES[zone] || []).filter(s => s !== stateName).map(s => (
            <Link key={s} href={`/states/${s.toLowerCase().replace(/\s+/g, '-')}`}>
              <Card className="hover:shadow-md hover:border-[#271E5D]/30 transition-all">
                <CardContent className="p-4 text-center">
                  <p className="font-medium text-sm">{s}</p>
                  <p className="text-xs text-muted-foreground mt-1">View →</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
