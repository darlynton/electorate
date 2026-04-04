import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Contributor tier system ────────────────────────────────────────────────

export interface ContributorTier {
  key: string;
  label: string;
  emoji: string;
  minScore: number;
  color: string;        // tailwind text color
  bgColor: string;      // tailwind bg color for badge
}

const TIERS: ContributorTier[] = [
  { key: 'guardian',    label: 'Electorate Guardian', emoji: '💎', minScore: 500, color: 'text-purple-700',  bgColor: 'bg-purple-100' },
  { key: 'champion',    label: 'Data Champion',     emoji: '🥇', minScore: 200, color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  { key: 'voice',       label: 'Verified Voice',    emoji: '🥈', minScore: 100, color: 'text-blue-700',   bgColor: 'bg-blue-100' },
  { key: 'contributor', label: 'Contributor',        emoji: '🥉', minScore: 25,  color: 'text-green-700',  bgColor: 'bg-green-100' },
  { key: 'newcomer',    label: 'Newcomer',           emoji: '🌱', minScore: 0,   color: 'text-gray-600',   bgColor: 'bg-gray-100' },
];

export function getContributorTier(score: number): ContributorTier {
  return TIERS.find((t) => score >= t.minScore) ?? TIERS[TIERS.length - 1];
}

export { TIERS as CONTRIBUTOR_TIERS };
