'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, MapPin, Users, Vote } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { LoginDialog } from '@/components/auth/login-dialog';
import { LocationSetupDialog } from '@/components/auth/location-setup-dialog';
import { Button } from '@/components/ui/button';

export function HomeHeroActions() {
  const { session, profile, canUpdateLocation, refreshProfile } = useAuth();
  const [locationOpen, setLocationOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const constituencySet = !!(
    profile?.state_id &&
    profile?.lga_id &&
    profile?.ward_id
  );

  return (
    <>
      <div className="flex flex-col justify-center gap-4 sm:flex-row">
        <Link href="/politicians">
          <Button size="lg" className="gap-2 bg-[#5D49D6] text-white hover:bg-[#5D49D6]/90">
            <Users className="h-5 w-5" />
            Explore Officials
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>

        {constituencySet ? (
          <Link href="/election-2027">
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-2 border-[#271E5D]/20 bg-white text-[#271E5D] hover:bg-[#271E5D]/5 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <Vote className="h-5 w-5" />
              Vote Presidency Election
            </Button>
          </Link>
        ) : (
          <Button
            size="lg"
            variant="outline"
            className="gap-2 border-2 border-[#271E5D]/20 bg-white text-[#271E5D] hover:bg-[#271E5D]/5 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            onClick={() => (session ? setLocationOpen(true) : setLoginOpen(true))}
          >
            <MapPin className="h-5 w-5" />
            Set Your Constituency
          </Button>
        )}
      </div>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        triggerLabel=""
      />
      <LocationSetupDialog
        open={locationOpen}
        onOpenChange={setLocationOpen}
        profile={profile}
        canUpdate={canUpdateLocation}
        onLocationSaved={() => {
          void refreshProfile();
        }}
      />
    </>
  );
}
