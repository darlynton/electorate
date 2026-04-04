'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MapPin,
  Users,
  Building2,
  Search,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountabilityScoreRing } from '@/components/politicians/accountability-score-ring';

// Types for API-sourced data
interface StateData {
  name: string;
  slug: string;
  zone: string;
  politician_count: number;
  senators: number;
  average_score: number;
}

interface ZoneStats {
  zone: string;
  stateCount: number;
  avgScore: number;
  totalPoliticians: number;
}

const zoneColors: Record<string, string> = {
  'North-Central': 'bg-blue-500',
  'North-East': 'bg-amber-500',
  'North-West': 'bg-orange-500',
  'South-East': 'bg-green-500',
  'South-South': 'bg-teal-500',
  'South-West': 'bg-purple-500',
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function StatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [stateData, setStateData] = useState<StateData[]>([]);
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/states')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setStateData(json.data.states ?? []);
          setZoneStats(
            (json.data.byZone as Array<{
              zone: string;
              states: StateData[];
              total_politicians: number;
              average_score: number;
            }>).map((z) => ({
              zone: z.zone,
              stateCount: z.states.length,
              avgScore: z.average_score,
              totalPoliticians: z.total_politicians,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredStates = useMemo(() => {
    return stateData.filter((state) => {
      const matchesSearch = state.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesZone = !selectedZone || state.zone === selectedZone;
      return matchesSearch && matchesZone;
    });
  }, [stateData, searchQuery, selectedZone]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-federal-green to-federal-green/90 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/nigeria-map.svg')] opacity-5 bg-center bg-no-repeat bg-contain" />
        <div className="container mx-auto px-4 py-10 md:py-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge className="mb-4 bg-gold/20 text-gold border-gold/30">
              36 States + FCT
            </Badge>
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Explore by State
            </h1>
            <p className="text-base md:text-lg text-white/80 mb-6 md:mb-8">
              Discover how your elected officials are performing at every level.
              Track accountability scores, voting records, and constituent
              projects across all 36 states and the Federal Capital Territory.
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search for a state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-12 text-base bg-white dark:bg-card text-foreground placeholder:text-muted-foreground border-2 border-gray-200 dark:border-border focus:border-[#271E5D] dark:focus:border-[#5D49D6] rounded-xl w-full"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Zone Overview */}
      <section className="container mx-auto px-4 -mt-8 relative z-10 mb-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            : zoneStats.map((zone) => (
                <motion.button
                  key={zone.zone}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    setSelectedZone(selectedZone === zone.zone ? null : zone.zone)
                  }
                  className={`p-4 rounded-xl text-left transition-all ${
                    selectedZone === zone.zone
                      ? 'bg-federal-green text-white shadow-lg'
                      : 'bg-card shadow-md hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-3 h-3 rounded-full ${zoneColors[zone.zone]}`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        selectedZone === zone.zone
                          ? 'text-white/80'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {zone.zone}
                    </span>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      selectedZone === zone.zone ? 'text-white' : 'text-federal-green'
                    }`}
                  >
                    {zone.stateCount}
                  </p>
                  <p
                    className={`text-xs ${
                      selectedZone === zone.zone
                        ? 'text-white/70'
                        : 'text-muted-foreground'
                    }`}
                  >
                    States{zone.avgScore > 0 ? ` • Avg. ${zone.avgScore}%` : ''}
                  </p>
                </motion.button>
              ))}
        </div>
        {selectedZone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 text-center"
          >
            <button
              onClick={() => setSelectedZone(null)}
              className="text-sm text-teal hover:underline"
            >
              Clear filter
            </button>
          </motion.div>
        )}
      </section>

      {/* States Grid */}
      <section className="container mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-semibold">
            {selectedZone ? `${selectedZone} States` : 'All States'}
            <span className="text-muted-foreground font-normal ml-2">
              ({loading ? '…' : filteredStates.length})
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredStates.map((state) => (
              <motion.div key={state.name} variants={item}>
                <Link href={`/states/${state.slug}`}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 group cursor-pointer border-transparent hover:border-teal/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg group-hover:text-teal transition-colors">
                            {state.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                zoneColors[state.zone]
                              }`}
                            />
                            {state.zone}
                          </CardDescription>
                        </div>
                        {state.average_score > 0 && (
                          <AccountabilityScoreRing score={state.average_score} size="sm" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          <span>{state.senators} Senators</span>
                        </div>
                        {state.politician_count > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{state.politician_count} Officials</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end">
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-teal group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && filteredStates.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No states found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
