'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccountabilityScoreRing } from './accountability-score-ring';
import type { Politician, Position, AccountabilityScore } from '@/types';
import { 
  MapPin, 
  Building2, 
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface PoliticianCardProps {
  politician: Politician;
  position?: Position;
  score?: AccountabilityScore;
  attendanceRate?: number;
  promisesKept?: number;
  promisesTotal?: number;
  hasEFCCRecord?: boolean;
}

export function PoliticianCard({
  politician,
  position,
  score,
  attendanceRate = 0,
  promisesKept = 0,
  promisesTotal = 0,
  hasEFCCRecord = false,
}: PoliticianCardProps) {
  const getPartyColor = (party: string) => {
    const colors: Record<string, string> = {
      APC: 'bg-[#271E5D] text-white',
      PDP: 'bg-[#E84C30] text-white',
      LP: 'bg-[#00C49A] text-white',
      NNPP: 'bg-[#5D49D6] text-white',
      APGA: 'bg-purple-600 text-white',
      ADC: 'bg-blue-600 text-white',
    };
    return colors[party] || 'bg-gray-500 text-white';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link href={`/politicians/${politician.slug}`}>
        <Card className="group hover:shadow-lg transition-all duration-300 hover:border-[#271E5D]/30 dark:hover:border-white/20 cursor-pointer overflow-hidden">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Photo */}
              <div className="relative w-20 h-20 flex-shrink-0">
                <div className="w-full h-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {politician.photo_url ? (
                    <Image
                      src={politician.photo_url}
                      alt={politician.full_name}
                      fill
                      sizes="80px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#271E5D]/10 dark:bg-white/10">
                      <span className="text-2xl font-display text-[#271E5D] dark:text-white">
                        {politician.full_name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                {/* Score ring overlay — only when a real score exists */}
                {score && (score.total ?? score.overall) > 0 && (
                  <div className="absolute -bottom-1 -right-1">
                    <AccountabilityScoreRing score={score.total ?? score.overall} size="sm" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-lg text-foreground truncate group-hover:text-[#271E5D] dark:group-hover:text-[#00C49A] transition-colors">
                      {politician.full_name}
                    </h3>
                    {position && (
                      <p className="text-sm text-muted-foreground truncate">
                        {position.title}
                        {position.constituency && ` — ${position.constituency}`}
                      </p>
                    )}
                  </div>
                  {position && (
                    <Badge className={`${getPartyColor(position.party)} flex-shrink-0`}>
                      {position.party}
                    </Badge>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {politician.state_of_origin}
                  </span>
                  {position?.chamber && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {position.chamber}
                    </span>
                  )}
                  {position?.office_level && position.office_level !== 'federal' && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {position.office_level === 'state' ? 'State' : 'LGA'}
                    </Badge>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3">
                  {/* Attendance — only when real data exists */}
                  {attendanceRate > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#00C49A]" />
                      <span className="text-xs font-mono font-medium">{attendanceRate}%</span>
                      <span className="text-xs text-muted-foreground">attendance</span>
                    </div>
                  )}

                  {/* Promises */}
                  {promisesTotal > 0 && (
                    <div className="flex items-center gap-1">
                      {promisesKept > promisesTotal / 2 ? (
                        <CheckCircle className="w-3 h-3 text-[#00C49A]" />
                      ) : (
                        <XCircle className="w-3 h-3 text-[#E84C30]" />
                      )}
                      <span className="text-xs font-mono font-medium">
                        {promisesKept}/{promisesTotal}
                      </span>
                      <span className="text-xs text-muted-foreground">promises</span>
                    </div>
                  )}

                  {/* EFCC Status */}
                  {hasEFCCRecord && (
                    <Badge variant="destructive" className="text-xs px-1.5 py-0">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      EFCC
                    </Badge>
                  )}

                  {/* No data state */}
                  {attendanceRate === 0 && promisesTotal === 0 && !hasEFCCRecord && (
                    <span className="text-xs text-muted-foreground italic">No activity data yet</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
