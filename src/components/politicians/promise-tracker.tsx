'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import type { CampaignPromise } from '@/types';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

interface PromiseTrackerProps {
  promises: CampaignPromise[];
  politicianName?: string;
}

const statusConfig = {
  kept: {
    icon: CheckCircle,
    color: 'text-[#00C49A]',
    bgColor: 'bg-[#00C49A]/10',
    badgeClass: 'bg-[#00C49A] text-white hover:bg-[#00C49A]/90',
    label: 'Kept',
  },
  broken: {
    icon: XCircle,
    color: 'text-[#E84C30]',
    bgColor: 'bg-[#E84C30]/10',
    badgeClass: 'bg-[#E84C30] text-white hover:bg-[#E84C30]/90',
    label: 'Broken',
  },
  in_progress: {
    icon: Clock,
    color: 'text-[#5D49D6]',
    bgColor: 'bg-[#5D49D6]/10',
    badgeClass: 'bg-[#5D49D6] text-white hover:bg-[#5D49D6]/90',
    label: 'In Progress',
  },
  abandoned: {
    icon: AlertCircle,
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    badgeClass: 'bg-gray-500 text-white hover:bg-gray-500/90',
    label: 'Abandoned',
  },
  unverified: {
    icon: HelpCircle,
    color: 'text-gray-400 dark:text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    badgeClass: 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300/90 dark:hover:bg-gray-600/90',
    label: 'Unverified',
  },
};

const categoryLabels: Record<string, string> = {
  infrastructure: 'Infrastructure',
  health: 'Healthcare',
  education: 'Education',
  security: 'Security',
  economy: 'Economy',
  agriculture: 'Agriculture',
  other: 'Other',
};

export function PromiseTracker({ promises, politicianName }: PromiseTrackerProps) {
  const stats = {
    total: promises.length,
    kept: promises.filter(p => p.status === 'kept').length,
    broken: promises.filter(p => p.status === 'broken').length,
    in_progress: promises.filter(p => p.status === 'in_progress').length,
    abandoned: promises.filter(p => p.status === 'abandoned').length,
    unverified: promises.filter(p => p.status === 'unverified').length,
  };

  const verifiedTotal = stats.kept + stats.broken + stats.in_progress + stats.abandoned;
  const keepRate = verifiedTotal > 0 ? Math.round((stats.kept / verifiedTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-display">Promise Scorecard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatBox 
              label="Kept" 
              value={stats.kept} 
              color="text-[#00C49A]"
              bgColor="bg-[#00C49A]/10"
            />
            <StatBox 
              label="Broken" 
              value={stats.broken} 
              color="text-[#E84C30]"
              bgColor="bg-[#E84C30]/10"
            />
            <StatBox 
              label="In Progress" 
              value={stats.in_progress} 
              color="text-[#5D49D6]"
              bgColor="bg-[#5D49D6]/10"
            />
            <StatBox 
              label="Abandoned" 
              value={stats.abandoned} 
              color="text-gray-500"
              bgColor="bg-gray-100"
            />
            <StatBox 
              label="Unverified" 
              value={stats.unverified} 
              color="text-gray-400"
              bgColor="bg-gray-50"
            />
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Promise Keep Rate (verified only)
            </span>
            <span className={`font-mono font-bold text-lg ${
              keepRate >= 70 ? 'text-[#00C49A]' : 
              keepRate >= 40 ? 'text-[#5D49D6]' : 'text-[#E84C30]'
            }`}>
              {keepRate}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full ${
                keepRate >= 70 ? 'bg-[#00C49A]' : 
                keepRate >= 40 ? 'bg-[#5D49D6]' : 'bg-[#E84C30]'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${keepRate}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Promise List */}
      <div className="space-y-3">
        {promises.map((promise, index) => (
          <PromiseItem key={promise.id} promise={promise} index={index} />
        ))}
      </div>

      {promises.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <HelpCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-muted-foreground">
              No promises tracked yet for {politicianName || 'this politician'}.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Help us track promises by submitting a tip.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBox({ 
  label, 
  value, 
  color, 
  bgColor 
}: { 
  label: string; 
  value: number; 
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg p-3 text-center`}>
      <div className={`font-mono text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function PromiseItem({ promise, index }: { promise: CampaignPromise; index: number }) {
  const config = statusConfig[promise.status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={`${config.bgColor} border-l-4`} style={{ borderLeftColor: config.color.replace('text-', '') }}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {promise.promise_text}
                </p>
                <Badge className={config.badgeClass}>
                  {config.label}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                {promise.category && (
                  <Badge variant="outline" className="text-xs">
                    {categoryLabels[promise.category] || promise.category}
                  </Badge>
                )}
                
                {promise.made_date && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(promise.made_date), 'MMM yyyy')}
                  </span>
                )}

                {promise.source && (
                  <span className="text-xs text-muted-foreground">
                    Source: {promise.source}
                  </span>
                )}
              </div>

              {promise.evidence_url && (
                <a 
                  href={promise.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-[#271E5D] hover:underline"
                >
                  View Evidence
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
