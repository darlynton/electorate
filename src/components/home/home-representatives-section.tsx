'use client';

import { useAuth } from '@/lib/use-auth';
import { MyRepresentatives } from '@/components/politicians/my-representatives';

/**
 * Thin client wrapper: checks auth + location and conditionally renders
 * the MyRepresentatives panel on the home page.
 */
export function HomeRepresentativesSection() {
  const { session, profile, isLoading } = useAuth();

  const constituencySet = !!(
    profile?.state_id &&
    profile?.lga_id &&
    profile?.ward_id
  );

  if (isLoading || !session || !constituencySet) return null;

  return (
    <section className="py-4 bg-card border-b border-border">
      <div className="container mx-auto px-4 max-w-2xl">
        <MyRepresentatives
          key={`${profile.state_id}-${profile.lga_id}-${profile.ward_id}`}
          locationSet={constituencySet}
        />
      </div>
    </section>
  );
}
