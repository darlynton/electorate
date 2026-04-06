'use client';

import { useMemo, useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/use-auth';
import { LoginDialog } from '@/components/auth/login-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from '@/components/ui/select';

interface SuggestEditDialogProps {
  politicianId: string;
  politicianName: string;
  currentData?: {
    full_name?: string;
    party?: string;
    title?: string;
    chamber?: string;
    constituency?: string;
    state?: string;
    contact_phone?: string;
    contact_email?: string;
    office_address?: string;
    website_url?: string;
    twitter_handle?: string;
    facebook_url?: string;
  };
  triggerClassName?: string;
}

type FieldOption = {
  label: string;
  value: string;
  group?: string;
};

const FIELD_OPTIONS: FieldOption[] = [
  // Basic info
  { label: 'Full Name', value: 'full_name', group: 'Basic Info' },
  { label: 'Party', value: 'party', group: 'Basic Info' },
  { label: 'Title / Office', value: 'title', group: 'Basic Info' },
  { label: 'Constituency', value: 'constituency', group: 'Basic Info' },
  { label: 'State', value: 'state', group: 'Basic Info' },
  { label: 'Biography', value: 'biography', group: 'Basic Info' },
  { label: 'Photo', value: 'photo_url', group: 'Basic Info' },
  // Contact details
  { label: 'Phone Number', value: 'contact_phone', group: 'Contact' },
  { label: 'Email Address', value: 'contact_email', group: 'Contact' },
  { label: 'Office Address', value: 'office_address', group: 'Contact' },
  { label: 'Website URL', value: 'website_url', group: 'Contact' },
  // Social media (X and Facebook only)
  { label: 'Twitter / X Handle', value: 'twitter_handle', group: 'Social Media' },
  { label: 'Facebook URL', value: 'facebook_url', group: 'Social Media' },
  // Other
  { label: 'Other', value: 'other' },
];

export function SuggestEditDialog({ politicianId, politicianName, currentData, triggerClassName }: SuggestEditDialogProps) {
  const { session, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [fieldName, setFieldName] = useState('party');
  const [proposedValue, setProposedValue] = useState('');
  const [reason, setReason] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentValue = useMemo(() => {
    if (!currentData || fieldName === 'other' || fieldName === 'biography' || fieldName === 'photo_url') return '';
    const key = fieldName as keyof typeof currentData;
    return (currentData[key] as string) ?? '';
  }, [currentData, fieldName]);

  const resetForm = () => {
    setFieldName('party');
    setProposedValue('');
    setReason('');
    setSourceUrl('');
    setSubmitterName('');
    setSubmitterEmail('');
    setPhoto(null);
    setMessage(null);
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('submission_type', 'suggest_edit');
      formData.append('politician_id', politicianId);
      formData.append('field_name', fieldName);
      formData.append('current_value', currentValue);
      // For photo_url: proposed_value is the filename; the real value is the uploaded image.
      formData.append('proposed_value', proposedValue || (fieldName === 'photo_url' && photo ? photo.name : '—'));
      formData.append('reason', reason);

      if (sourceUrl.trim()) formData.append('source_url', sourceUrl.trim());
      if (submitterName.trim()) formData.append('submitter_name', submitterName.trim());
      if (submitterEmail.trim()) formData.append('submitter_email', submitterEmail.trim());
      if (photo) formData.append('photo', photo);

      const response = await fetch('/api/v1/contributions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: formData,
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error || 'Failed to submit your suggestion.');
      }

      setMessage({ type: 'success', text: 'Thanks! Your edit suggestion has been submitted for review.' });
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1000);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Failed to submit your suggestion.';
      setMessage({ type: 'error', text });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <LoginDialog
        triggerLabel={isLoading ? 'Loading...' : 'Sign in to Suggest an Edit'}
        triggerClassName={
          triggerClassName ??
          'inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-clip-padding px-2.5 h-7 text-sm font-medium text-white hover:bg-white/10 transition-colors'
        }
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (!next) resetForm();
    }}>
      <DialogTrigger
        className={
          triggerClassName ??
          'inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-clip-padding px-2.5 h-7 text-sm font-medium text-white hover:bg-white/10 transition-colors'
        }
      >
          <Flag className="h-4 w-4" />
          Suggest an Edit
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suggest an edit</DialogTitle>
          <DialogDescription>
            Help improve {politicianName}&apos;s profile. Add a source link so moderators can verify quickly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="field_name">Field to update</Label>
            <Select value={fieldName} onValueChange={(value) => setFieldName(value ?? 'other')}>
              <SelectTrigger id="field_name">
                <span className="flex-1 text-left text-sm truncate">
                  {FIELD_OPTIONS.find((o) => o.value === fieldName)?.label ?? 'Select a field'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {['Basic Info', 'Contact', 'Social Media'].map((group) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{group}</SelectLabel>
                    {FIELD_OPTIONS.filter((o) => o.group === group).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="current_value">Current value</Label>
            <Input id="current_value" value={currentValue} readOnly placeholder="Current value" />
          </div>

          {fieldName === 'photo_url' ? (
            <div className="grid gap-2">
              <Label htmlFor="photo">New photo <span className="text-destructive">*</span></Label>
              <Input
                id="photo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setPhoto(file);
                  if (file) setProposedValue(file.name);
                }}
              />
              <p className="text-xs text-muted-foreground">Upload a clear, recent photo. Converted to optimized WebP on upload.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="proposed_value">Proposed value</Label>
              <Textarea
                id="proposed_value"
                value={proposedValue}
                onChange={(event) => setProposedValue(event.target.value)}
                placeholder="What should this be changed to?"
                required
                rows={3}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Why should this be updated?"
              required
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="source_url">Source URL (optional)</Label>
            <Input
              id="source_url"
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://example.com/source"
            />
          </div>

          {fieldName !== 'photo_url' && (
            <div className="grid gap-2">
              <Label htmlFor="photo">Supporting image (optional)</Label>
              <Input
                id="photo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Images are converted to optimized WebP and stored in Electorate storage.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="submitter_name">Your name (optional)</Label>
              <Input
                id="submitter_name"
                value={submitterName}
                onChange={(event) => setSubmitterName(event.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="submitter_email">Email (optional)</Label>
              <Input
                id="submitter_email"
                type="email"
                value={submitterEmail}
                onChange={(event) => setSubmitterEmail(event.target.value)}
                placeholder="jane@email.com"
              />
            </div>
          </div>

          {message && (
            <div className={`rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || proposedValue.trim().length === 0 || reason.trim().length < 3}>
              {isSubmitting ? 'Submitting...' : 'Submit Suggestion'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
