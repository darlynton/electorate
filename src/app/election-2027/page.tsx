import type { Metadata } from 'next';
import { Election2027Hub } from '@/components/elections/election-2027-hub';

export const metadata: Metadata = {
  title: '2027 Election Hub | Electorate',
  description: 'Official 2027 Nigerian election dates, candidate records, and the Electorate presidential community poll.',
};

export default function Election2027Page() {
  return <Election2027Hub />;
}
