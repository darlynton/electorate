'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import type { NewsArticle } from '@/types';
import { 
  ExternalLink, 
  Calendar, 
  AlertTriangle,
  Scale,
  Building2,
  Newspaper,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NewsAggregatorProps {
  articles: NewsArticle[];
  isLoading?: boolean;
}

const categoryConfig = {
  corruption: {
    icon: AlertTriangle,
    color: 'text-[#E84C30]',
    bgColor: 'bg-[#E84C30]/10',
    label: 'Corruption',
  },
  legislation: {
    icon: Scale,
    color: 'text-[#271E5D]',
    bgColor: 'bg-[#271E5D]/10 dark:bg-white/10',
    label: 'Legislation',
  },
  constituency: {
    icon: Building2,
    color: 'text-[#5D49D6]',
    bgColor: 'bg-[#5D49D6]/10',
    label: 'Constituency',
  },
  general: {
    icon: Newspaper,
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    label: 'News',
  },
};

// Source logos (using text fallbacks)
const sourceLogos: Record<string, string> = {
  'Premium Times': 'PT',
  'The Cable': 'TC',
  'Daily Trust': 'DT',
  'Punch': 'PN',
  'Vanguard': 'VG',
  'ThisDay': 'TD',
  'Guardian': 'GD',
  'The Nation': 'TN',
};

export function NewsAggregator({ articles, isLoading }: NewsAggregatorProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <NewsItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Newspaper className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-muted-foreground">
            No news articles found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {articles.map((article, index) => (
        <NewsItem key={article.id} article={article} index={index} />
      ))}
    </div>
  );
}

function NewsItem({ article, index }: { article: NewsArticle; index: number }) {
  const category = article.category || 'general';
  const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.general;
  const Icon = config.icon;
  const sourceInitials = sourceLogos[article.source_name] || article.source_name.substring(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <a 
        href={article.source_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block group"
      >
        <Card className="hover:shadow-md transition-all duration-200 hover:border-[#271E5D]/30">
          <CardContent className="p-4">
            <div className="flex gap-3">
              {/* Source Logo */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-[#271E5D] flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{sourceInitials}</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-[#271E5D] dark:group-hover:text-[#00C49A] transition-colors">
                    {article.headline}
                  </h3>
                  <ExternalLink className="w-4 h-4 flex-shrink-0 text-muted-foreground group-hover:text-[#271E5D] dark:group-hover:text-[#00C49A] transition-colors" />
                </div>

                {article.excerpt && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {article.excerpt}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-2">
                  {/* Source */}
                  <span className="text-xs text-muted-foreground">
                    {article.source_name}
                  </span>

                  {/* Category */}
                  <Badge 
                    variant="secondary" 
                    className={`text-xs px-1.5 py-0 ${config.bgColor} ${config.color}`}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>

                  {/* Date */}
                  {article.published_at && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                    </span>
                  )}

                  {/* Verified source indicator */}
                  {article.is_verified_source && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 text-[#00C49A] border-[#00C49A]">
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </a>
    </motion.div>
  );
}

function NewsItemSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
