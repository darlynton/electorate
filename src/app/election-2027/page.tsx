import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Vote,
  Calendar,
  Users,
  MapPin,
  ArrowRight,
  Clock,
  TrendingUp,
} from 'lucide-react';

const timelineEvents = [
  { date: 'Feb 2026', event: 'INEC publishes voters register', status: 'upcoming' },
  { date: 'May 2026', event: 'Party primaries commence', status: 'upcoming' },
  { date: 'Aug 2026', event: 'Campaign season begins', status: 'upcoming' },
  { date: 'Jan 2027', event: 'Presidential election', status: 'upcoming' },
  { date: 'Mar 2027', event: 'Governorship elections', status: 'upcoming' },
  { date: 'Apr 2027', event: 'State Assembly elections', status: 'upcoming' },
];

const electionCategories = [
  {
    title: 'Presidential',
    description: 'Track presidential candidates, their records, and promises.',
    count: '1 seat',
    icon: '🏛️',
    color: 'bg-[#5D49D6]/10 border-[#5D49D6]/30 hover:border-[#5D49D6]',
  },
  {
    title: 'Senate',
    description: '109 senatorial seats across 36 states and FCT.',
    count: '109 seats',
    icon: '⚖️',
    color: 'bg-[#271E5D]/10 border-[#271E5D]/30 hover:border-[#271E5D]',
  },
  {
    title: 'House of Reps',
    description: '360 federal constituencies electing representatives.',
    count: '360 seats',
    icon: '🏢',
    color: 'bg-[#00C49A]/10 border-[#00C49A]/30 hover:border-[#00C49A]',
  },
  {
    title: 'Governorship',
    description: '36 states plus FCT electing governors.',
    count: '37 seats',
    icon: '👤',
    color: 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500',
  },
  {
    title: 'State Assembly',
    description: '993 state assembly members across all states.',
    count: '993 seats',
    icon: '🏫',
    color: 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500',
  },
  {
    title: 'LGA Chairmen',
    description: '774 local government chairmen nationwide.',
    count: '774 seats',
    icon: '📍',
    color: 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500',
  },
];

export default function Election2027Page() {
  const daysUntilElection = Math.ceil(
    (new Date('2027-02-20').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#271E5D] via-[#2D2463] to-[#271E5D] text-white py-10 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Badge className="bg-[#5D49D6] text-white mb-6">
            2027 General Elections
          </Badge>
          <h1 className="font-display text-3xl md:text-6xl font-bold mb-4 md:mb-6">
            Nigeria Decides{' '}
            <span className="text-[#5D49D6]">2027</span>
          </h1>
          <p className="text-base md:text-xl text-white/80 mb-6 md:mb-8 max-w-2xl mx-auto">
            Track candidates, compare records, and make an informed choice. 
            2,283 seats will be contested across six election categories.
          </p>

          {/* Countdown */}
          <div className="inline-flex items-center gap-2 sm:gap-3 bg-white/10 border border-white/20 rounded-2xl px-4 sm:px-8 py-3 sm:py-4 mb-8 md:mb-10">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#5D49D6] flex-shrink-0" />
            <div>
              <span className="font-mono text-2xl sm:text-3xl font-bold text-[#5D49D6]">{daysUntilElection}</span>
              <span className="text-white/70 ml-1 sm:ml-2 text-sm sm:text-base">days until presidential election</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/politicians">
              <Button size="lg" className="bg-[#5D49D6] text-white hover:bg-[#5D49D6]/90 gap-2">
                <Users className="w-5 h-5" />
                View Incumbents
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 gap-2">
                <TrendingUp className="w-5 h-5" />
                Accountability Rankings
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Election Categories */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              What&apos;s On The Ballot
            </h2>
            <p className="text-muted-foreground mt-2">
              Six categories of elections across federal, state, and local government levels
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {electionCategories.map((cat) => (
              <Card
                key={cat.title}
                className={`border-2 transition-all duration-200 cursor-default ${cat.color}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{cat.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{cat.title}</CardTitle>
                      <Badge variant="secondary" className="mt-1">{cat.count}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-12 md:py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Election Timeline
            </h2>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#271E5D]/20 dark:bg-white/10" />
              <div className="space-y-6">
                {timelineEvents.map((event, i) => (
                  <div key={i} className="flex items-start gap-4 relative">
                    <div className="w-12 h-12 rounded-full bg-[#271E5D]/10 dark:bg-[#5D49D6]/10 border-2 border-[#271E5D]/30 dark:border-[#5D49D6]/30 flex items-center justify-center flex-shrink-0 z-10">
                      <Calendar className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
                    </div>
                    <div className="pt-2">
                      <span className="text-xs font-mono text-[#5D49D6] font-bold">{event.date}</span>
                      <p className="font-medium text-foreground mt-0.5">{event.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-[#271E5D] text-white">
        <div className="container mx-auto px-4 text-center">
          <Vote className="w-12 h-12 text-[#5D49D6] mx-auto mb-4" />
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
            Know Before You Vote
          </h2>
          <p className="text-white/80 max-w-xl mx-auto mb-8">
            Research your incumbents&apos; track records before they ask for your vote again.
          </p>
          <Link href="/politicians">
            <Button size="lg" className="bg-[#5D49D6] text-white hover:bg-[#5D49D6]/90 gap-2">
              Research Officials Now
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

export const metadata = {
  title: 'Election 2027 Tracker',
  description: 'Track all 2027 Nigerian general election races across presidential, senatorial, gubernatorial, and local government levels.',
};
