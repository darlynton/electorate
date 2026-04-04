'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MapPin,
  Building2,
  Calendar,
  Users,
  ExternalLink,
  Share2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Eye,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AccountabilityScoreRing } from '@/components/politicians/accountability-score-ring';
import { NewsAggregator } from '@/components/politicians/news-aggregator';
import { LegalRecordsSection } from '@/components/politicians/legal-records-section';
import { RatingSection } from '@/components/politicians/rating-section';
import { RatingDialog } from '@/components/politicians/rating-dialog';
import type { RatingsData } from '@/components/politicians/rating-section';
import { SuggestEditDialog } from '@/components/crowdsource';
import type {
  Politician,
  Position,
  LegalRecord,
  NewsArticle,
  Project,
  AccountabilityScore,
} from '@/types';

const getPartyColor = (party: string) => {
  const colors: Record<string, string> = {
    APC: 'bg-green-600',
    PDP: 'bg-red-600',
    LP: 'bg-green-500',
    NNPP: 'bg-yellow-600',
    APGA: 'bg-purple-600',
  };
  return colors[party] || 'bg-gray-500';
};

const formatCurrency = (amount: number) => {
  if (amount >= 1000000000) {
    return `₦${(amount / 1000000000).toFixed(1)}B`;
  }
  if (amount >= 1000000) {
    return `₦${(amount / 1000000).toFixed(1)}M`;
  }
  return `₦${amount.toLocaleString()}`;
};

// ── Helper: single row in Contact & Social card ────────────────────────────
function ContactRow({
  icon,
  label,
  href,
  value,
  external,
}: {
  icon: string;
  label: string;
  href?: string;
  value?: string | null;
  external?: boolean;
}) {
  const content = (
    <span className={`flex items-start gap-2 text-sm ${
      value ? 'text-foreground' : 'text-muted-foreground italic'
    }`}>
      <span className="w-5 text-center shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 break-words">{value ?? 'Not listed'}</span>
      {href && value && external && <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />}
    </span>
  );

  if (href && value) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="block hover:text-teal transition-colors"
        title={label}
      >
        {content}
      </a>
    );
  }
  return <div title={label}>{content}</div>;
}

export default function PoliticianProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [notFound404, setNotFound404] = useState(false);

  const [politician, setPolitician] = useState<(Politician & { positions: Position[] }) | null>(null);
  const [legalRecords, setLegalRecords] = useState<LegalRecord[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ratingsData, setRatingsData] = useState<RatingsData | null>(null);
  const [score, setScore] = useState<AccountabilityScore>({
    overall: 0,
    attendance: 0,
    voting_consistency: 0,
    promise_fulfillment: 0,
    transparency: 0,
    constituent_engagement: 0,
  });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/v1/politicians/${slug}`)
      .then((res) => {
        if (res.status === 404) { setNotFound404(true); return null; }
        return res.json();
      })
      .then((json) => {
        if (!json) return;
        const data = json.data;
        setPolitician(data);
        setLegalRecords(data.legal_records ?? []);
        setNews(data.news_articles ?? []);
        setProjects(
          (data.projects ?? []).map((p: Project & { title?: string; name?: string; allocated_amount?: number }) => ({
            ...p,
            name: p.name ?? p.title ?? '',
            budget: p.budget ?? p.allocated_amount ?? 0,
          }))
        );

        const rawScore: number = data.accountability_score ?? 0;
        const stats = data.stats ?? {};
        const attendanceRate: number = stats.attendance_rate ?? 0;

        setScore({
          overall: rawScore,
          attendance: attendanceRate,
          voting_consistency: 0,
          promise_fulfillment: 0,
          transparency: 0,
          constituent_engagement: 0,
          trend: 'stable',
          last_updated: new Date().toISOString(),
        });
      })
      .catch((err) => console.error('Failed to load politician', err))
      .finally(() => setLoading(false));
  }, [slug]);

  // Eagerly fetch crowd-sourced ratings (displayed on hero + breakdown bar)
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/v1/politicians/${slug}/ratings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setRatingsData(json.data);
      })
      .catch(() => {});
  }, [slug]);

  if (notFound404) {
    notFound();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <section className="bg-gradient-to-br from-federal-green to-federal-green/90 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <Skeleton className="w-48 h-48 rounded-2xl bg-white/20" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-10 w-64 bg-white/20" />
                <Skeleton className="h-6 w-48 bg-white/20" />
                <Skeleton className="h-4 w-96 bg-white/20" />
              </div>
            </div>
          </div>
        </section>
        <div className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!politician) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Politician not found.</p>
      </div>
    );
  }



  const initials = politician.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Use the first current position, falling back to the first position
  const position = (politician.positions ?? []).find((p) => p.is_current) ?? politician.positions?.[0];

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-federal-green to-federal-green/90 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-5" />
        <div className="container mx-auto px-4 py-6 lg:py-12 relative">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 sm:gap-2 text-sm text-white/70 mb-6 overflow-hidden">
            <Link href="/" className="hover:text-white transition-colors shrink-0">
              Home
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0" />
            <Link href="/politicians" className="hover:text-white transition-colors shrink-0">
              Politicians
            </Link>
            <ChevronRight className="h-4 w-4 shrink-0" />
            <span className="text-white truncate">{politician.full_name}</span>
          </nav>

          <div className="flex flex-wrap lg:flex-nowrap gap-4 lg:gap-8 items-start">
            {/* Profile Photo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="w-28 h-28 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl">
                {politician.photo_url ? (
                  <Image
                    src={politician.photo_url}
                    alt={politician.full_name}
                    fill
                    sizes="(min-width: 1024px) 12rem, 10rem"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gold to-gold/80 flex items-center justify-center">
                    <span className="text-4xl lg:text-5xl font-display font-bold text-federal-green">
                      {initials}
                    </span>
                  </div>
                )}
              </div>
              <div
                className={`absolute -bottom-2 -right-2 w-12 h-12 rounded-full ${getPartyColor(
                  position?.party ?? ''
                )} flex items-center justify-center text-white font-bold text-sm border-4 border-white shadow-lg`}
              >
                {position?.party}
              </div>
            </motion.div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0 basis-full lg:basis-auto order-3 lg:order-none">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-2">
                  {politician.full_name}
                </h1>
                <p className="text-lg sm:text-xl text-gold font-semibold mb-3 sm:mb-4">
                  {position?.title}
                </p>

                <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-white/70" />
                    <span>{position?.chamber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-white/70" />
                    <span>{position?.constituency}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-white/70" />
                    <span>10th Assembly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-white/70" />
                    <span>{politician.state_of_origin} State</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <RatingDialog
                    politicianSlug={slug}
                    politicianName={politician.full_name}
                    chamber={position?.chamber}
                    totalRatings={ratingsData?.total_ratings ?? 0}
                    onRatingsLoaded={setRatingsData}
                  />
                  {/* Share button hidden */}
                  <SuggestEditDialog
                    politicianId={politician.id}
                    politicianName={politician.full_name}
                    currentData={{
                      full_name: politician.full_name,
                      party: position?.party,
                      title: position?.title,
                      chamber: position?.chamber,
                      constituency: position?.constituency,
                      state: position?.state,
                      contact_phone: politician.contact_phone,
                      contact_email: politician.contact_email,
                      office_address: politician.office_address,
                      website_url: politician.website_url,
                      twitter_handle: politician.twitter_handle,
                      facebook_url: politician.facebook_url,
                    }}
                  />
                  {politician.twitter_handle && (
                    <a
                      href={`https://twitter.com/${politician.twitter_handle.replace(
                        '@',
                        ''
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-white/30 text-white hover:bg-white/10"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {politician.twitter_handle}
                      </Button>
                    </a>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Accountability Score Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="order-2 lg:order-none ml-auto"
            >
              <Card className="w-[156px] sm:w-[180px] lg:w-72 bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader className="pb-1 sm:pb-2">
                  <CardTitle className="text-sm font-medium text-white/80">
                    Electorating Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center pt-0 pb-3 sm:pb-6">
                  <AccountabilityScoreRing score={ratingsData?.overall ?? score.overall} size="md" />
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                    {ratingsData && ratingsData.total_ratings > 0 ? (
                      <>
                        <Star className="h-4 w-4 text-gold fill-gold" />
                        <span className="text-xs sm:text-sm text-white/70">
                          {ratingsData.total_ratings} {ratingsData.total_ratings !== 1 ? 'Ratings' : 'Rating'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Minus className="h-4 w-4 text-white/50" />
                        <span className="text-xs sm:text-sm text-white/70">Not yet rated</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Score Breakdown Bar */}
      <section className="bg-card border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-3 sm:gap-6 py-4 justify-center lg:justify-start">
            {ratingsData && ratingsData.total_ratings > 0 ? (
              ratingsData.dimensions.map((dim) => (
                <Tooltip key={dim.key}>
                  <TooltipTrigger className="flex items-center gap-2">
                    <span className="text-base">{dim.emoji}</span>
                    <span className="text-sm text-muted-foreground">
                      {dim.label}:{' '}
                      <span className="font-semibold text-foreground">
                        {dim.average.toFixed(1)}/5
                      </span>
                    </span>
                  </TooltipTrigger>
                    <TooltipContent>
                    Based on {dim.count} {dim.count !== 1 ? 'Electoratings' : 'Electorating'} from constituents
                  </TooltipContent>
                </Tooltip>
              ))
            ) : (
              <span className="text-sm text-muted-foreground py-1">
                ⭐ No Electoratings yet — be the first!
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Tabs */}
      <section className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full max-w-full justify-start overflow-x-auto flex-nowrap mb-6 md:mb-8 p-1 bg-muted/50 no-scrollbar">
            <TabsTrigger value="overview" className="gap-2 px-3 sm:px-4 min-h-10 data-[state=active]:my-0.5">
              <Eye className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="news" className="gap-2 px-3 sm:px-4 min-h-10 data-[state=active]:my-0.5">
              <FileText className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">News ({news.length})</span>
            </TabsTrigger>
            <TabsTrigger value="legal" className="gap-2 px-3 sm:px-4 min-h-10 data-[state=active]:my-0.5">
              <AlertTriangle className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Legal ({legalRecords.length})</span>
            </TabsTrigger>
            <TabsTrigger value="constituency" className="gap-2 px-3 sm:px-4 min-h-10 data-[state=active]:my-0.5">
              <MapPin className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Constituency</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
            <TabsContent value="overview">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Left Column - Bio */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Biography */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Biography</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground leading-relaxed">
                          {politician.biography ||
                            'No biography available for this politician.'}
                        </p>
                        {politician.education && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-semibold mb-2">Education</h4>
                            <p className="text-sm text-muted-foreground">
                              {typeof politician.education === 'string' 
                                ? politician.education 
                                : politician.education.map(e => `${e.degree}, ${e.institution}`).join('; ')}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Quick Stats — legislators only */}
                    {position?.chamber !== 'Executive' && (() => {
                      const polAny = politician as unknown as Record<string, unknown>;
                      const polStats = (polAny?.stats ?? {}) as Record<string, number>;
                      const votesOnRecord = (polAny?.votes as unknown[])?.length ?? 0;
                      const attendanceRate = polStats.attendance_rate ?? 0;
                      return (
                        <div className="grid md:grid-cols-2 gap-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">
                                Legislative Activity
                              </CardTitle>
                              <CardDescription>
                                10th Assembly — voting &amp; attendance
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Bills Voted On</span>
                                  <span className={`font-semibold ${votesOnRecord > 0 ? 'text-federal-green' : 'text-muted-foreground'}`}>
                                    {votesOnRecord > 0 ? votesOnRecord : '—'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Attendance Rate</span>
                                  <span className={`font-semibold ${
                                    attendanceRate >= 80 ? 'text-federal-green' :
                                    attendanceRate >= 50 ? 'text-gold' :
                                    attendanceRate > 0 ? 'text-coral-red' : 'text-muted-foreground'
                                  }`}>
                                    {attendanceRate > 0 ? `${attendanceRate}%` : '—'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Bills Sponsored</span>
                                  <span className="text-xs text-muted-foreground italic">Coming soon</span>
                                </div>
                                <Separator />
                                <p className="text-xs text-muted-foreground">
                                  {votesOnRecord > 0 || attendanceRate > 0
                                    ? 'Sourced from NASS public records'
                                    : 'NASS data integration in progress'}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })()}

                  </div>

                  {/* Right Column - Sidebar */}
                  <div className="space-y-6">
                    {/* Contact & Social Info */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Contact & Social</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2.5 text-sm">
                        {/* Always-visible editable fields */}
                        <ContactRow
                          icon="📞"
                          label="Phone"
                          href={politician.contact_phone ? `tel:${politician.contact_phone}` : undefined}
                          value={politician.contact_phone}
                        />
                        <ContactRow
                          icon="✉️"
                          label="Email"
                          href={politician.contact_email ? `mailto:${politician.contact_email}` : undefined}
                          value={politician.contact_email}
                        />
                        <ContactRow
                          icon="🌐"
                          label="Website"
                          href={politician.website_url ?? undefined}
                          value={politician.website_url ? 'Visit website' : undefined}
                          external
                        />
                        <ContactRow
                          icon="🏢"
                          label="Office"
                          value={politician.office_address || 'National Assembly Complex, Three Arms Zone, Abuja'}
                        />
                        <Separator />
                        <ContactRow
                          icon="𝕏"
                          label="Twitter / X"
                          href={politician.twitter_handle ? `https://twitter.com/${politician.twitter_handle.replace('@', '')}` : undefined}
                          value={politician.twitter_handle}
                          external
                        />
                        <ContactRow
                          icon="📘"
                          label="Facebook"
                          href={politician.facebook_url ?? undefined}
                          value={politician.facebook_url ? 'Facebook page' : undefined}
                          external
                        />
                        {/* Additional socials — shown only when populated */}
                        {politician.instagram_handle && (
                          <ContactRow
                            icon="📷"
                            label="Instagram"
                            href={`https://instagram.com/${politician.instagram_handle.replace('@', '')}`}
                            value={politician.instagram_handle}
                            external
                          />
                        )}
                        {politician.tiktok_handle && (
                          <ContactRow
                            icon="🎵"
                            label="TikTok"
                            href={`https://tiktok.com/@${politician.tiktok_handle.replace('@', '')}`}
                            value={politician.tiktok_handle}
                            external
                          />
                        )}
                        {politician.youtube_url && (
                          <ContactRow
                            icon="▶️"
                            label="YouTube"
                            href={politician.youtube_url}
                            value="YouTube channel"
                            external
                          />
                        )}
                        {politician.linkedin_url && (
                          <ContactRow
                            icon="💼"
                            label="LinkedIn"
                            href={politician.linkedin_url}
                            value="LinkedIn profile"
                            external
                          />
                        )}
                      </CardContent>
                    </Card>

                    {/* Legal Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Legal Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {legalRecords.length === 0 ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="text-sm">No legal records found</span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 text-amber-600 mb-3">
                              <AlertTriangle className="h-5 w-5" />
                              <span className="text-sm font-medium">
                                {legalRecords.length} record(s) found
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => setActiveTab('legal')}
                            >
                              View Details
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Community Score – Rate CTA */}
                    <Card className="border-gold/40 bg-gradient-to-b from-gold/5 to-transparent">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Star className="h-5 w-5 text-gold fill-gold" />
                          Electorating Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {ratingsData && ratingsData.total_ratings > 0 ? (
                          <div className="space-y-3">
                            <div className="text-center">
                              <span
                                className="text-4xl font-bold font-mono"
                                style={{
                                  color:
                                    ratingsData.overall >= 70
                                      ? '#22C55E'
                                      : ratingsData.overall >= 40
                                        ? '#F59E0B'
                                        : '#E84C30',
                                }}
                              >
                                {ratingsData.overall}%
                              </span>
                              <p className="text-xs text-muted-foreground mt-1">
                                Based on {ratingsData.total_ratings} {ratingsData.total_ratings !== 1 ? 'Electoratings' : 'Electorating'}
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              {ratingsData.dimensions.slice(0, 3).map((dim) => (
                                <div key={dim.key} className="flex items-center justify-between text-sm">
                                  <span>{dim.emoji} {dim.label}</span>
                                  <span className="font-semibold">{dim.average.toFixed(1)}/5</span>
                                </div>
                              ))}
                              {ratingsData.dimensions.length > 3 && (
                                <p className="text-xs text-muted-foreground">+{ratingsData.dimensions.length - 3} more dimensions</p>
                              )}
                            </div>
                            <RatingDialog
                              politicianSlug={slug}
                              politicianName={politician.full_name}
                              chamber={position?.chamber}
                              totalRatings={ratingsData?.total_ratings ?? 0}
                              onRatingsLoaded={setRatingsData}
                              triggerVariant="sidebar"
                              triggerLabel="Add Your Electorating"
                            />
                          </div>
                        ) : (
                          <div className="text-center space-y-3">
                            <div className="flex justify-center gap-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className="h-6 w-6 text-gray-300" />
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              No Electoratings yet. Be the first from your constituency!
                            </p>
                            <RatingDialog
                              politicianSlug={slug}
                              politicianName={politician.full_name}
                              chamber={position?.chamber}
                              totalRatings={0}
                              onRatingsLoaded={setRatingsData}
                              triggerVariant="sidebar"
                              triggerLabel="Add Your Electorating"
                              triggerClassName="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-federal-green text-white text-sm font-medium px-3 h-8 hover:bg-federal-green/90 transition-colors"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Recent News */}
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Latest News</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab('news')}
                        >
                          View All
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {news.slice(0, 2).map((article) => (
                            <a
                              key={article.id}
                              href={article.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block group"
                            >
                              <p className="text-sm font-medium group-hover:text-teal transition-colors line-clamp-2">
                                {article.headline || article.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {article.source_name} •{' '}
                                {new Date(article.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </a>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* News Tab */}
            <TabsContent value="news">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>News & Media</CardTitle>
                    <CardDescription>
                      Latest news articles mentioning this politician
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <NewsAggregator articles={news} />
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Legal Tab */}
            <TabsContent value="legal">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Legal Records</CardTitle>
                    <CardDescription>
                      Court cases, investigations, and legal proceedings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LegalRecordsSection records={legalRecords} />
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Constituency Tab */}
            <TabsContent value="constituency">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-6">
                  {/* Constituency Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        {position?.constituency}
                      </CardTitle>
                      <CardDescription>
                        {politician.state_of_origin} State •{' '}
                        {position?.chamber}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-surface rounded-lg">
                          <p className="text-3xl font-bold text-federal-green">
                            {projects.length}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total Projects
                          </p>
                        </div>
                        <div className="text-center p-4 bg-surface rounded-lg">
                          <p className="text-3xl font-bold text-teal">
                            {formatCurrency(
                              projects.reduce((sum, p) => sum + (p.budget || 0), 0)
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total Budget
                          </p>
                        </div>
                        <div className="text-center p-4 bg-surface rounded-lg">
                          <p className="text-3xl font-bold text-gold">
                            {projects.filter((p) => p.status === 'completed').length}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Completed
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Projects List */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Constituency Projects</CardTitle>
                      <CardDescription>
                        Infrastructure and development projects
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {projects.map((project) => (
                          <div
                            key={project.id}
                            className="p-4 bg-surface rounded-lg border"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold">{project.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {project.location}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  project.status === 'completed'
                                    ? 'default'
                                    : project.status === 'in_progress'
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {project.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {project.description}
                            </p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Budget: {formatCurrency(project.budget || 0)}
                              </span>
                              {project.contractor && (
                                <span className="text-muted-foreground">
                                  Contractor: {project.contractor}
                                </span>
                              )}
                            </div>
                            {project.progress_percentage !== undefined && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground">
                                    Progress
                                  </span>
                                  <span className="text-xs font-medium">
                                    {project.progress_percentage}%
                                  </span>
                                </div>
                                <Progress
                                  value={project.progress_percentage}
                                  className="h-2"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>

        </Tabs>
      </section>
    </div>
  );
}
