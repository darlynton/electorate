'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import type { UserProfile } from '@/lib/use-auth';

// ------------------------------------------
// Types
// ------------------------------------------

interface GeoItem {
  id: string;
  name: string;
}

/** Resolve ID → name from items array; show placeholder when no selection */
function GeoDisplayValue({
  items,
  selectedId,
  placeholder,
}: {
  items: GeoItem[];
  selectedId: string;
  placeholder: string;
}) {
  const name = items.find((i) => i.id === selectedId)?.name;
  return (
    <span
      className="flex flex-1 text-left truncate"
      data-slot="select-value"
      {...(!name ? { 'data-placeholder': '' } : {})}
    >
      {name ?? placeholder}
    </span>
  );
}

interface LocationSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile | null;
  canUpdate: boolean;
  /** Called after successful location save */
  onLocationSaved?: () => void;
}

// ------------------------------------------
// Fetcher helpers
// ------------------------------------------

async function fetchGeo(endpoint: string): Promise<GeoItem[]> {
  const res = await fetch(endpoint);
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []) as GeoItem[];
}

// ------------------------------------------
// Component
// ------------------------------------------

export function LocationSetupDialog({
  open,
  onOpenChange,
  profile,
  canUpdate,
  onLocationSaved,
}: LocationSetupDialogProps) {
  const [states, setStates] = useState<GeoItem[]>([]);
  const [lgas, setLgas] = useState<GeoItem[]>([]);
  const [wards, setWards] = useState<GeoItem[]>([]);
  const [pollingUnits, setPollingUnits] = useState<GeoItem[]>([]);

  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedLga, setSelectedLga] = useState<string>('');
  const [selectedWard, setSelectedWard] = useState<string>('');
  const [selectedPU, setSelectedPU] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Pre-populate from existing profile
  useEffect(() => {
    if (profile?.state_id) setSelectedState(profile.state_id);
    if (profile?.lga_id) setSelectedLga(profile.lga_id);
    if (profile?.ward_id) setSelectedWard(profile.ward_id);
    if (profile?.polling_unit_id) setSelectedPU(profile.polling_unit_id);
  }, [profile]);

  // Load states on mount
  useEffect(() => {
    void fetchGeo('/api/v1/geo/states').then(setStates);
  }, []);

  // Cascade: State → LGAs
  useEffect(() => {
    if (!selectedState) {
      setLgas([]);
      return;
    }
    setLoadingStep('lgas');
    void fetchGeo(`/api/v1/geo/lgas?state_id=${selectedState}`).then((items) => {
      setLgas(items);
      setLoadingStep(null);
    });
  }, [selectedState]);

  // Cascade: LGA → Wards
  useEffect(() => {
    if (!selectedLga) {
      setWards([]);
      return;
    }
    setLoadingStep('wards');
    void fetchGeo(`/api/v1/geo/wards?lga_id=${selectedLga}`).then((items) => {
      setWards(items);
      setLoadingStep(null);
    });
  }, [selectedLga]);

  // Cascade: Ward → Polling Units
  useEffect(() => {
    if (!selectedWard) {
      setPollingUnits([]);
      return;
    }
    setLoadingStep('pus');
    void fetchGeo(`/api/v1/geo/polling-units?ward_id=${selectedWard}`).then(
      (items) => {
        setPollingUnits(items);
        setLoadingStep(null);
      },
    );
  }, [selectedWard]);

  const handleStateChange = useCallback((value: string | null) => {
    setSelectedState(value ?? '');
    setSelectedLga('');
    setSelectedWard('');
    setSelectedPU('');
    setWards([]);
    setPollingUnits([]);
  }, []);

  const handleLgaChange = useCallback((value: string | null) => {
    setSelectedLga(value ?? '');
    setSelectedWard('');
    setSelectedPU('');
    setPollingUnits([]);
  }, []);

  const handleWardChange = useCallback((value: string | null) => {
    setSelectedWard(value ?? '');
    setSelectedPU('');
  }, []);

  const isComplete = selectedState && selectedLga && selectedWard;

  const handleSave = async () => {
    if (!isComplete) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? '';

      const res = await fetch('/api/v1/user/location', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          state_id: selectedState,
          lga_id: selectedLga,
          ward_id: selectedWard,
          ...(selectedPU ? { polling_unit_id: selectedPU } : {}),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to save location');
      }

      setMessage({
        type: 'success',
        text: 'Location saved! You can now rate officials in your constituency.',
      });

      setTimeout(() => {
        onOpenChange(false);
        onLocationSaved?.();
      }, 1200);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save location',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const nextUpdate = profile?.location_last_updated_at
    ? (() => {
        const d = new Date(profile.location_last_updated_at);
        d.setMonth(d.getMonth() + 6);
        return d.toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      })()
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#271E5D] dark:text-[#5D49D6]" />
            {profile?.state_id ? 'Update your location' : 'Set up your location'}
          </DialogTitle>
          <DialogDescription>
            Select your INEC polling unit so we can map you to the right
            constituency. You can change this once every 6 months.
          </DialogDescription>
        </DialogHeader>

        {!canUpdate && nextUpdate ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <AlertCircle className="w-10 h-10 text-amber-500" />
            <p className="text-sm text-center text-muted-foreground">
              You can next update your location on{' '}
              <span className="font-medium text-foreground">{nextUpdate}</span>.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* State */}
            <div className="space-y-2">
              <Label>State</Label>
              <Select value={selectedState} onValueChange={handleStateChange}>
                <SelectTrigger className="w-full">
                  <GeoDisplayValue items={states} selectedId={selectedState} placeholder="Select your state" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                    {states.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* LGA */}
            <div className="space-y-2">
              <Label>Local Government Area (LGA)</Label>
              <Select
                value={selectedLga}
                onValueChange={handleLgaChange}
                disabled={!selectedState || loadingStep === 'lgas'}
              >
                <SelectTrigger className="w-full">
                  <GeoDisplayValue
                    items={lgas}
                    selectedId={selectedLga}
                    placeholder={loadingStep === 'lgas' ? 'Loading LGAs...' : 'Select your LGA'}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                    {lgas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ward */}
            <div className="space-y-2">
              <Label>Ward</Label>
              <Select
                value={selectedWard}
                onValueChange={handleWardChange}
                disabled={!selectedLga || loadingStep === 'wards'}
              >
                <SelectTrigger className="w-full">
                  <GeoDisplayValue
                    items={wards}
                    selectedId={selectedWard}
                    placeholder={loadingStep === 'wards' ? 'Loading wards...' : 'Select your ward'}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                    {wards.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Polling Unit */}
            <div className="space-y-2">
              <Label>Polling Unit <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Select
                value={selectedPU}
                onValueChange={(v) => setSelectedPU(v ?? '')}
                disabled={!selectedWard || loadingStep === 'pus'}
              >
                <SelectTrigger className="w-full">
                  <GeoDisplayValue
                    items={pollingUnits}
                    selectedId={selectedPU}
                    placeholder={loadingStep === 'pus' ? 'Loading polling units...' : 'Select your polling unit'}
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                    {pollingUnits.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {message && (
              <div
                className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {message.text}
              </div>
            )}

            <Button
              className="w-full gap-2 bg-[#271E5D] dark:bg-[#5D49D6] hover:bg-[#271E5D]/90 dark:hover:bg-[#5D49D6]/90"
              disabled={!isComplete || isSaving}
              onClick={handleSave}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Confirm location'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
