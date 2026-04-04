// ── Crowd-sourced politician scoring framework ─────────────────────────────
// Dimension configurations, helpers, and score calculations

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type LegislatorDimension =
  | 'constituency_presence'
  | 'legislative_activity'
  | 'constituency_projects'
  | 'accessibility'
  | 'transparency';

export type ExecutiveDimension =
  | 'infrastructure'
  | 'security'
  | 'healthcare_education'
  | 'economic_activity'
  | 'transparency_communication';

export type RatingDimension = LegislatorDimension | ExecutiveDimension;

export type PoliticianType = 'legislator' | 'executive';

// ═══════════════════════════════════════════════════════════════════════════
// DIMENSION CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export interface DimensionConfig {
  key: RatingDimension;
  label: string;
  description: string;
  emoji: string;
  color: string; // tailwind color class for charts / badges
}

export const LEGISLATOR_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'constituency_presence',
    label: 'Constituency Presence',
    description: 'How visible and present is the official in their constituency?',
    emoji: '🏠',
    color: 'text-teal',
  },
  {
    key: 'legislative_activity',
    label: 'Legislative Activity',
    description: 'How active are they in lawmaking, bills, and motions?',
    emoji: '📜',
    color: 'text-blue-600',
  },
  {
    key: 'constituency_projects',
    label: 'Constituency Projects',
    description: 'Are they delivering development projects to the constituency?',
    emoji: '🏗️',
    color: 'text-amber-600',
  },
  {
    key: 'accessibility',
    label: 'Accessibility',
    description: 'Can constituents easily reach and communicate with them?',
    emoji: '📞',
    color: 'text-purple-600',
  },
  {
    key: 'transparency',
    label: 'Transparency',
    description: 'Are they open about activities, spending, and declarations?',
    emoji: '🔍',
    color: 'text-federal-green',
  },
];

export const EXECUTIVE_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'infrastructure',
    label: 'Infrastructure',
    description: 'Roads, bridges, buildings, and public facilities delivery',
    emoji: '🏗️',
    color: 'text-teal',
  },
  {
    key: 'security',
    label: 'Security',
    description: 'Safety and security management in their jurisdiction',
    emoji: '🛡️',
    color: 'text-blue-600',
  },
  {
    key: 'healthcare_education',
    label: 'Healthcare & Education',
    description: 'Quality and access to healthcare and education services',
    emoji: '🏥',
    color: 'text-amber-600',
  },
  {
    key: 'economic_activity',
    label: 'Economic Activity',
    description: 'Job creation, business environment, and economic growth',
    emoji: '💰',
    color: 'text-purple-600',
  },
  {
    key: 'transparency_communication',
    label: 'Transparency & Comms',
    description: 'Openness, public communication, and accountability',
    emoji: '📢',
    color: 'text-federal-green',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine if a politician is a legislator or executive based on their chamber
 */
export function getPoliticianType(chamber?: string): PoliticianType {
  if (!chamber) return 'legislator';
  return chamber === 'Executive' ? 'executive' : 'legislator';
}

/**
 * Get the dimension configs for a politician type
 */
export function getDimensions(type: PoliticianType): DimensionConfig[] {
  return type === 'executive' ? EXECUTIVE_DIMENSIONS : LEGISLATOR_DIMENSIONS;
}

/**
 * Get just the dimension keys for a politician type
 */
export function getDimensionKeys(type: PoliticianType): RatingDimension[] {
  return getDimensions(type).map((d) => d.key);
}

/**
 * Calculate overall score (0-100) from dimension averages on a 1-5 scale.
 * Formula: average of all dimensions × 20
 */
export function calculateOverallScore(
  dimensionAverages: Record<string, number>
): number {
  const values = Object.values(dimensionAverages).filter((v) => v > 0);
  if (values.length === 0) return 0;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.round(avg * 20); // 1-5 → 0-100
}

/**
 * Get the current rating period in YYYY-MM format
 */
export function getCurrentRatingPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
