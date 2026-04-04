'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import type { Vote, VoteCast } from '@/types';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MinusCircle,
  UserX,
  ExternalLink,
  Calendar,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

interface VotingRecordProps {
  votes: Vote[];
  showStats?: boolean;
}

const voteConfig: Record<VoteCast, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
}> = {
  yes: {
    icon: ThumbsUp,
    color: 'text-[#00C49A]',
    bgColor: 'bg-[#00C49A]/10',
    label: 'Voted Yes',
  },
  no: {
    icon: ThumbsDown,
    color: 'text-[#E84C30]',
    bgColor: 'bg-[#E84C30]/10',
    label: 'Voted No',
  },
  abstain: {
    icon: MinusCircle,
    color: 'text-[#5D49D6]',
    bgColor: 'bg-[#5D49D6]/10',
    label: 'Abstained',
  },
  absent: {
    icon: UserX,
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    label: 'Absent',
  },
};

export function VotingRecord({ votes, showStats = true }: VotingRecordProps) {
  const stats = {
    total: votes.length,
    yes: votes.filter(v => v.vote_type === 'yes').length,
    no: votes.filter(v => v.vote_type === 'no').length,
    abstain: votes.filter(v => v.vote_type === 'abstain').length,
    absent: votes.filter(v => v.vote_type === 'absent').length,
  };

  const participationRate = stats.total > 0 
    ? Math.round(((stats.total - stats.absent) / stats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {showStats && stats.total > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Voting Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <VoteStat label="Voted Yes" value={stats.yes} color="text-[#00C49A]" bgColor="bg-[#00C49A]/10" />
              <VoteStat label="Voted No" value={stats.no} color="text-[#E84C30]" bgColor="bg-[#E84C30]/10" />
              <VoteStat label="Abstained" value={stats.abstain} color="text-[#5D49D6]" bgColor="bg-[#5D49D6]/10" />
              <VoteStat label="Absent" value={stats.absent} color="text-gray-500 dark:text-gray-400" bgColor="bg-gray-100 dark:bg-gray-800" />
            </div>

            <div className="flex items-center justify-between py-3 border-t">
              <span className="text-sm text-muted-foreground">Voting Participation Rate</span>
              <span className={`font-mono font-bold text-lg ${
                participationRate >= 80 ? 'text-[#00C49A]' : 
                participationRate >= 60 ? 'text-[#5D49D6]' : 'text-[#E84C30]'
              }`}>
                {participationRate}%
              </span>
            </div>

            {/* Participation bar */}
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${
                  participationRate >= 80 ? 'bg-[#00C49A]' : 
                  participationRate >= 60 ? 'bg-[#5D49D6]' : 'bg-[#E84C30]'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${participationRate}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vote List */}
      {votes.length > 0 ? (
        <div className="space-y-2">
          {votes.map((vote, index) => (
            <VoteItem key={vote.id} vote={vote} index={index} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-muted-foreground">
              No voting records available yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              We are working to collect voting data from the National Assembly.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VoteStat({ 
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

function VoteItem({ vote, index }: { vote: Vote; index: number }) {
  const voteType = vote.vote_type || 'absent';
  const config = voteConfig[voteType as VoteCast];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`${config.bgColor} p-2 rounded-lg`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-medium text-sm text-foreground line-clamp-2">
                    {vote.bill_title}
                  </h4>
                  {vote.bill_id && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bill ID: {vote.bill_id}
                    </p>
                  )}
                </div>
                <Badge className={`${config.bgColor} ${config.color} border-0 flex-shrink-0`}>
                  {config.label}
                </Badge>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(vote.vote_date), 'dd MMM yyyy')}
                </span>
                
                {vote.session && (
                  <span className="text-xs text-muted-foreground">
                    Session: {vote.session}
                  </span>
                )}

                {vote.source_url && (
                  <a 
                    href={vote.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[#271E5D] dark:text-[#5D49D6] hover:underline ml-auto"
                  >
                    Source
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
