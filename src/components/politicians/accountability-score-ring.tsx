'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AccountabilityScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showGrade?: boolean;
  className?: string;
}

export function AccountabilityScoreRing({
  score,
  size = 'md',
  showLabel = false,
  showGrade = false,
  className,
}: AccountabilityScoreRingProps) {
  const getColor = (score: number) => {
    if (score === 0) return { stroke: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.1)' }; // gray = unrated
    if (score >= 70) return { stroke: '#22C55E', bg: 'rgba(34, 197, 94, 0.1)' };
    if (score >= 40) return { stroke: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
    return { stroke: '#E84C30', bg: 'rgba(232, 76, 48, 0.1)' };
  };

  const getGrade = (score: number) => {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  };

  const sizes = {
    sm: { width: 36, strokeWidth: 3, fontSize: 'text-xs' },
    md: { width: 56, strokeWidth: 4, fontSize: 'text-sm' },
    lg: { width: 80, strokeWidth: 5, fontSize: 'text-lg' },
    xl: { width: 120, strokeWidth: 6, fontSize: 'text-2xl' },
  };

  const config = sizes[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const colors = getColor(score);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={config.width}
        height={config.width}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill={colors.bg}
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <motion.circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="transparent"
          stroke={colors.stroke}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showGrade ? (
          <span 
            className={cn('font-display font-bold', config.fontSize)}
            style={{ color: colors.stroke }}
          >
            {getGrade(score)}
          </span>
        ) : (
          <span 
            className={cn('font-mono font-bold', config.fontSize)}
            style={{ color: colors.stroke }}
          >
            {score === 0 ? '—' : score}
          </span>
        )}
      </div>

      {showLabel && (
        <span className="ml-2 text-sm text-muted-foreground">
          Accountability Score
        </span>
      )}
    </div>
  );
}

// Compact version for small spaces
export function ScoreBadge({ score }: { score: number }) {
  const getColorClass = (score: number) => {
    if (score >= 70) return 'bg-[#00C49A] text-white';
    if (score >= 40) return 'bg-[#F59E0B] text-white';
    return 'bg-[#E84C30] text-white';
  };

  return (
    <span className={cn(
      'inline-flex items-center justify-center w-8 h-8 rounded-full font-mono font-bold text-sm',
      getColorClass(score)
    )}>
      {score}
    </span>
  );
}
