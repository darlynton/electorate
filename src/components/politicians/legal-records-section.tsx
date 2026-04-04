'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import type { LegalRecord } from '@/types';
import { 
  AlertTriangle, 
  Scale, 
  FileText,
  ExternalLink,
  Calendar,
  CheckCircle,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';

interface LegalRecordsSectionProps {
  records: LegalRecord[];
  politicianName?: string;
}

const recordTypeConfig = {
  efcc_investigation: {
    icon: AlertTriangle,
    color: 'text-[#5D49D6]',
    bgColor: 'bg-[#5D49D6]/10',
    label: 'EFCC Investigation',
    severity: 'medium',
  },
  efcc_conviction: {
    icon: AlertTriangle,
    color: 'text-[#E84C30]',
    bgColor: 'bg-[#E84C30]/10',
    label: 'EFCC Conviction',
    severity: 'high',
  },
  icpc_prosecution: {
    icon: Scale,
    color: 'text-[#E84C30]',
    bgColor: 'bg-[#E84C30]/10',
    label: 'ICPC Prosecution',
    severity: 'high',
  },
  court_judgment: {
    icon: Scale,
    color: 'text-[#271E5D] dark:text-[#5D49D6]',
    bgColor: 'bg-[#271E5D]/10 dark:bg-white/10',
    label: 'Court Judgment',
    severity: 'medium',
  },
  cct_proceedings: {
    icon: FileText,
    color: 'text-[#5D49D6]',
    bgColor: 'bg-[#5D49D6]/10',
    label: 'CCT Proceedings',
    severity: 'medium',
  },
  acquittal: {
    icon: CheckCircle,
    color: 'text-[#00C49A]',
    bgColor: 'bg-[#00C49A]/10',
    label: 'Acquittal',
    severity: 'positive',
  },
};

export function LegalRecordsSection({ records, politicianName }: LegalRecordsSectionProps) {
  const hasConviction = records.some(r => r.record_type === 'efcc_conviction');
  const hasProsecution = records.some(r => 
    r.record_type === 'icpc_prosecution' || r.record_type === 'efcc_investigation'
  );

  // Sort by severity and date
  const sortedRecords = [...records].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, positive: 2 };
    const aConfig = recordTypeConfig[a.record_type as keyof typeof recordTypeConfig];
    const bConfig = recordTypeConfig[b.record_type as keyof typeof recordTypeConfig];
    const aSeverity = severityOrder[aConfig?.severity as keyof typeof severityOrder] ?? 1;
    const bSeverity = severityOrder[bConfig?.severity as keyof typeof severityOrder] ?? 1;
    
    if (aSeverity !== bSeverity) return aSeverity - bSeverity;
    
    // Then by date (newest first)
    const aDate = a.date ? new Date(a.date).getTime() : 0;
    const bDate = b.date ? new Date(b.date).getTime() : 0;
    return bDate - aDate;
  });

  return (
    <div className="space-y-6">
      {/* Summary Banner */}
      {records.length > 0 && (
        <Card className={hasConviction ? 'border-[#E84C30] border-2' : hasProsecution ? 'border-[#5D49D6]' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {hasConviction ? (
                <>
                  <AlertTriangle className="w-8 h-8 text-[#E84C30]" />
                  <div>
                    <p className="font-display font-semibold text-[#E84C30]">
                      Has EFCC/ICPC Conviction
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This politician has been convicted of corruption-related offences.
                    </p>
                  </div>
                </>
              ) : hasProsecution ? (
                <>
                  <AlertTriangle className="w-8 h-8 text-[#5D49D6]" />
                  <div>
                    <p className="font-display font-semibold text-[#5D49D6]">
                      Under Investigation/Prosecution
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This politician has pending legal matters with anti-corruption agencies.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Shield className="w-8 h-8 text-[#00C49A]" />
                  <div>
                    <p className="font-display font-semibold text-[#00C49A]">
                      No Major Corruption Issues
                    </p>
                    <p className="text-sm text-muted-foreground">
                      No EFCC convictions or active prosecutions on record.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records List */}
      {sortedRecords.length > 0 ? (
        <div className="space-y-3">
          {sortedRecords.map((record, index) => (
            <LegalRecordItem key={record.id} record={record} index={index} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-[#00C49A] mb-4" />
            <p className="font-display font-semibold text-[#00C49A]">
              Clean Record
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              No legal or corruption records found for {politicianName || 'this politician'}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Card className="bg-gray-50 dark:bg-gray-800/50">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> All legal records are sourced from official court documents, 
            EFCC press releases, and verified news sources. An investigation does not imply guilt. 
            We update records as cases progress.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function LegalRecordItem({ record, index }: { record: LegalRecord; index: number }) {
  const config = recordTypeConfig[record.record_type as keyof typeof recordTypeConfig] || {
    icon: FileText,
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    label: record.record_type,
    severity: 'medium',
  };
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={config.bgColor}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge className={`${config.color} bg-white dark:bg-card border ${config.color.replace('text-', 'border-')}`}>
                    {config.label}
                  </Badge>
                  <h3 className="font-medium text-foreground mt-2">
                    {record.title}
                  </h3>
                </div>
                
                {record.verified && (
                  <Badge variant="outline" className="text-[#00C49A] border-[#00C49A] flex-shrink-0">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              {record.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {record.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-3">
                {record.court && (
                  <span className="text-xs text-muted-foreground">
                    <Scale className="w-3 h-3 inline mr-1" />
                    {record.court}
                  </span>
                )}
                
                {record.case_number && (
                  <span className="text-xs text-muted-foreground">
                    Case: {record.case_number}
                  </span>
                )}
                
                {record.date && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(record.date), 'dd MMM yyyy')}
                  </span>
                )}

                {record.outcome && (
                  <Badge variant="secondary" className="text-xs">
                    Outcome: {record.outcome}
                  </Badge>
                )}
              </div>

              <a 
                href={record.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs text-[#271E5D] dark:text-[#5D49D6] hover:underline"
              >
                View Source Document
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
