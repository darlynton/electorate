'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MyRepresentatives } from '@/components/politicians/my-representatives';

/**
 * Thin client wrapper: checks auth + location and conditionally renders
 * the MyRepresentatives panel on the home page.
 */
export function HomeRepresentativesSection() {
  const [ready, setReady] = useState(false);
  const [locationSet, setLocationSet] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !mounted) { setReady(true); return; }

      try {
        const res = await fetch('/api/v1/user/location', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.lga_id) setLocationSet(true);
        }
      } catch { /* ignore */ }

      if (mounted) setReady(true);
    }
    check();
    return () => { mounted = false; };
  }, []);

  if (!ready || !locationSet) return null;

  return (
    <section className="py-4 bg-card border-b border-border">
      <div className="container mx-auto px-4 max-w-2xl">
        <MyRepresentatives locationSet={locationSet} />
      </div>
    </section>
  );
}
