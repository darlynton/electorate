'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { LoginDialog } from '@/components/auth/login-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const INEC_TIMETABLE_URL = 'https://www.inecnigeria.org/wp-content/uploads/2027-GENERAL-ELECTION-TIMETABLE.pdf';
const OFFICIAL_TIMELINE = [
  { event_date: '2026-09-23', title: 'Campaigns begin', scope: 'Presidential & National Assembly', category: 'campaign' },
  { event_date: '2026-10-07', title: 'Campaigns begin', scope: 'Governorship & State Assembly', category: 'campaign' },
  { event_date: '2027-01-11', title: 'Official Register of Voters published', scope: 'National', category: 'registration' },
  { event_date: '2027-01-21', title: 'Notice of Poll published', scope: 'National', category: 'electoral_process' },
  { event_date: '2027-02-18', title: 'Campaigns end', scope: 'Presidential & National Assembly', category: 'deadline' },
  { event_date: '2027-02-20', title: 'Presidential & National Assembly election', scope: 'National', category: 'election' },
  { event_date: '2027-03-04', title: 'Campaigns end', scope: 'Governorship & State Assembly', category: 'deadline' },
  { event_date: '2027-03-06', title: 'Governorship & State Assembly election', scope: 'National', category: 'election' },
];

const dateFormat = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function partyBadgeClass(party: string | null | undefined) {
  const normalizedParty = party?.match(/\(([A-Z]+)\)/)?.[1] ?? party;
  const classes: Record<string, string> = {
    APC: 'bg-green-700 text-white',
    ADC: 'bg-red-700 text-white',
    NDC: 'bg-blue-700 text-white',
    SDP: 'bg-red-600 text-white',
    AAC: 'bg-black text-white',
    APM: 'bg-emerald-600 text-white',
  };
  return classes[normalizedParty ?? ''] ?? 'bg-muted text-foreground';
}

export function Election2027Hub() {
  const { session } = useAuth();
  const [hub, setHub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submittingCandidateId, setSubmittingCandidateId] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    void fetch('/api/v1/elections/2027', { headers, cache: 'no-store' })
      .then((response) => response.json())
      .then((json) => setHub(json.data))
      .catch(() => setHub(null))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  const presidential = hub?.presidential;
  const electionDate = presidential?.election_date ?? '2027-02-20';
  const timeToElection = useMemo(() => {
    const remaining = new Date(`${electionDate}T00:00:00Z`).getTime() - now;
    return Math.max(0, Math.ceil(remaining / 86_400_000));
  }, [electionDate, now]);
  const timeline = hub?.timeline?.length ? hub.timeline : OFFICIAL_TIMELINE;
  const electoratePoll = presidential?.electorate_poll ?? {
    total_responses: 0,
    responses_by_candidacy: {},
    your_response_candidacy_id: null,
  };
  const candidates = presidential?.candidacies ?? [];

  const submitResponse = async (candidacyId: string) => {
    if (!session?.access_token) return;
    setSubmittingCandidateId(candidacyId);
    setPollError(null);

    try {
      const response = await fetch('/api/v1/elections/2027/electorate-poll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ candidacy_id: candidacyId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'Unable to record your response');

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const updated = await fetch('/api/v1/elections/2027', { headers, cache: 'no-store' });
      setHub((await updated.json()).data);
    } catch (error) {
      setPollError(error instanceof Error ? error.message : 'Unable to record your response');
    } finally {
      setSubmittingCandidateId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-br from-[#271E5D] via-[#2D2463] to-[#271E5D] py-10 text-white md:py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-5 bg-[#5D49D6] text-white">2027 General Election Hub</Badge>
          <h1 className="font-display text-4xl font-bold md:text-6xl">Nigeria Decides <span className="text-[#9c8cff]">2027</span></h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/80 md:text-xl">Official dates, candidate records, and the Electorate presidential community poll.</p>
          <div className="mx-auto mt-7 inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-left">
            <Clock className="h-6 w-6 text-[#9c8cff]" />
            <div><p className="font-mono text-3xl font-bold text-[#9c8cff]">{timeToElection}</p><p className="text-sm text-white/75">days until Presidential & National Assembly polling · 20 February 2027</p></div>
          </div>
        </div>
      </section>

      <section className="bg-[#F8F6F1] py-12 dark:bg-[#121210] md:py-16"><div className="container mx-auto px-4">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-[#5D49D6]">Electorate poll</p><h2 className="font-display text-3xl font-bold">Who would you support?</h2><p className="mt-1 max-w-2xl text-muted-foreground">A one-response-per-account community pulse. It is not a representative scientific poll and does not forecast the election.</p></div><Badge variant="outline">{electoratePoll.total_responses.toLocaleString()} response{electoratePoll.total_responses === 1 ? '' : 's'}</Badge></div>
        {loading ? <Card><CardContent className="py-10 text-center text-muted-foreground">Loading the Electorate poll…</CardContent></Card> : <Card><CardContent className="space-y-4 py-6">{candidates.map((candidacy: any) => { const votes = electoratePoll.responses_by_candidacy[candidacy.id] ?? 0; const percentage = electoratePoll.total_responses ? Math.round((votes / electoratePoll.total_responses) * 100) : 0; const selected = electoratePoll.your_response_candidacy_id === candidacy.id; const hasResponded = Boolean(electoratePoll.your_response_candidacy_id); const initials = candidacy.politician.full_name.split(' ').map((name: string) => name[0]).join('').slice(0, 2); return <button key={candidacy.id} type="button" disabled={!session || hasResponded || submittingCandidateId !== null} onClick={() => void submitResponse(candidacy.id)} className={`w-full rounded-xl border p-4 text-left transition-colors ${selected ? 'border-[#5D49D6] bg-[#5D49D6]/5' : 'hover:border-[#5D49D6]/60'} disabled:cursor-default disabled:hover:border-border`}><div className="flex flex-wrap items-center gap-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-muted-foreground">{candidacy.politician.photo_url ? <img className="h-full w-full object-cover" src={candidacy.politician.photo_url} alt={candidacy.politician.full_name} /> : <span aria-label={`No portrait available for ${candidacy.politician.full_name}`}>{initials}</span>}</div><div className="min-w-0 flex-1"><p className="font-semibold">{candidacy.politician.full_name}</p><Badge className={`mt-1 ${partyBadgeClass(candidacy.party)}`}>{candidacy.party ?? 'Party not recorded'}</Badge></div><div className="text-right"><p className="font-mono font-bold">{percentage}%</p><p className="text-xs text-muted-foreground">{votes} response{votes === 1 ? '' : 's'}</p></div>{selected && <Badge variant="secondary">Your choice</Badge>}{submittingCandidateId === candidacy.id && <span className="text-sm text-muted-foreground">Saving…</span>}</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-[#5D49D6]" style={{ width: `${percentage}%` }} /></div></button>; })}{pollError && <p role="alert" className="text-sm text-destructive">{pollError}</p>}{session && electoratePoll.your_response_candidacy_id && <p className="border-t pt-4 text-sm text-muted-foreground">Your response is recorded and cannot be changed.</p>}{!session && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-sm text-muted-foreground">Sign in to submit your response.</p><LoginDialog triggerLabel="Sign in to vote" triggerClassName="inline-flex h-9 items-center rounded-md bg-[#271E5D] px-4 text-sm font-medium text-white" /></div>}</CardContent></Card>}
      </div></section>

      <section className="bg-card py-12 md:py-16"><div className="container mx-auto px-4"><div className="mx-auto max-w-3xl"><div className="mb-8 text-center"><p className="text-sm font-semibold uppercase tracking-wider text-[#5D49D6]">Official timetable</p><h2 className="font-display text-3xl font-bold">2027 Election timeline</h2><p className="mt-2 text-sm text-muted-foreground">Last verified: 15 September 2026 · Source: Independent National Electoral Commission (INEC)</p><a className="mt-2 inline-flex items-center gap-1 text-sm text-[#5D49D6] hover:underline" href={INEC_TIMETABLE_URL} target="_blank" rel="noreferrer">Official INEC timetable <ExternalLink className="h-3.5 w-3.5" /></a></div><div className="space-y-5 border-l-2 border-[#5D49D6]/30 pl-6">{timeline.map((event: any) => <div key={`${event.event_date}-${event.title}`} className="relative"><span className="absolute -left-[33px] top-1 h-3.5 w-3.5 rounded-full bg-[#5D49D6]" /><p className="font-mono text-sm font-bold text-[#5D49D6]">{dateFormat.format(new Date(`${event.event_date}T00:00:00Z`))}</p><p className="font-semibold">{event.title}</p><div className="mt-1 flex flex-wrap gap-2"><Badge variant="secondary" className="capitalize">{event.category.replace('_', ' ')}</Badge><span className="text-sm text-muted-foreground">{event.scope}</span></div></div>)}</div></div></div></section>
    </div>
  );
}
