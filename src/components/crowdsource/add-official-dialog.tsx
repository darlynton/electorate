'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/use-auth';
import { LoginDialog } from '@/components/auth/login-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NIGERIAN_STATES } from '@/types';

interface AddOfficialDialogProps {
  triggerClassName?: string;
}

export function AddOfficialDialog({ triggerClassName }: AddOfficialDialogProps) {
  const { session, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [chamber, setChamber] = useState('House');
  const [officeLevel, setOfficeLevel] = useState('federal');
  const [state, setState] = useState('Lagos');
  const [constituency, setConstituency] = useState('');
  const [party, setParty] = useState('');
  const [startDate, setStartDate] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  // Contact details
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  // Social media
  const [twitterHandle, setTwitterHandle] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  // Meta
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const resetForm = () => {
    setFullName('');
    setTitle('');
    setChamber('House');
    setOfficeLevel('federal');
    setState('Lagos');
    setConstituency('');
    setParty('');
    setStartDate('');
    setSourceUrl('');
    setNotes('');
    setContactPhone('');
    setContactEmail('');
    setOfficeAddress('');
    setWebsiteUrl('');
    setTwitterHandle('');
    setFacebookUrl('');
    setInstagramHandle('');
    setTiktokHandle('');
    setYoutubeUrl('');
    setLinkedinUrl('');
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
      formData.append('submission_type', 'add_official');
      formData.append('full_name', fullName);
      formData.append('title', title);
      formData.append('chamber', chamber);
      formData.append('office_level', officeLevel);
      formData.append('state', state);
      formData.append('party', party);
      formData.append('source_url', sourceUrl);
      if (constituency.trim()) formData.append('constituency', constituency.trim());
      if (startDate.trim()) formData.append('start_date', startDate);
      if (notes.trim()) formData.append('notes', notes.trim());
      // Contact details
      if (contactPhone.trim()) formData.append('contact_phone', contactPhone.trim());
      if (contactEmail.trim()) formData.append('contact_email', contactEmail.trim());
      if (officeAddress.trim()) formData.append('office_address', officeAddress.trim());
      if (websiteUrl.trim()) formData.append('website_url', websiteUrl.trim());
      // Social media
      if (twitterHandle.trim()) formData.append('twitter_handle', twitterHandle.trim());
      if (facebookUrl.trim()) formData.append('facebook_url', facebookUrl.trim());
      if (instagramHandle.trim()) formData.append('instagram_handle', instagramHandle.trim());
      if (tiktokHandle.trim()) formData.append('tiktok_handle', tiktokHandle.trim());
      if (youtubeUrl.trim()) formData.append('youtube_url', youtubeUrl.trim());
      if (linkedinUrl.trim()) formData.append('linkedin_url', linkedinUrl.trim());
      // Meta
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
        throw new Error(json.error || 'Failed to submit official.');
      }

      setMessage({ type: 'success', text: 'Thanks! The new official submission is now pending review.' });
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1000);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Failed to submit official.';
      setMessage({ type: 'error', text });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <LoginDialog
        triggerLabel={isLoading ? 'Loading...' : 'Sign in to Add an Official'}
        triggerClassName={
          triggerClassName ??
          'inline-flex items-center justify-center gap-2 rounded-md bg-white text-[#271E5D] hover:bg-white/90 px-4 py-2 text-sm font-medium transition-colors'
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
          'inline-flex items-center justify-center gap-2 rounded-md bg-white text-[#271E5D] hover:bg-white/90 px-4 py-2 text-sm font-medium transition-colors'
        }
      >
        <PlusCircle className="h-4 w-4" />
        Add an Official
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a missing official</DialogTitle>
          <DialogDescription>
            Submit a missing elected official. Moderators will verify before publishing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="party">Party</Label>
              <Input id="party" value={party} onChange={(e) => setParty(e.target.value)} placeholder="APC, PDP, LP..." required />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Chamber</Label>
              <Select value={chamber} onValueChange={(value) => setChamber(value ?? 'House')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select chamber" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Executive">Executive</SelectItem>
                  <SelectItem value="Senate">Senate</SelectItem>
                  <SelectItem value="House">House</SelectItem>
                  <SelectItem value="State Assembly">State Assembly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Office level</Label>
              <Select value={officeLevel} onValueChange={(value) => setOfficeLevel(value ?? 'federal')}>
                <SelectTrigger>
                  <SelectValue placeholder="Office level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="federal">Federal</SelectItem>
                  <SelectItem value="state">State</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>State</Label>
              <Select value={state} onValueChange={(value) => setState(value ?? 'Lagos')}>
                <SelectTrigger>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {NIGERIAN_STATES.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="title">Title / office</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="House Representative" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="constituency">Constituency (optional)</Label>
              <Input id="constituency" value={constituency} onChange={(e) => setConstituency(e.target.value)} placeholder="Ikeja Federal Constituency" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="start_date">Start date (optional)</Label>
              <Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="source_url">Source URL</Label>
              <Input id="source_url" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." required />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional context, election date, replacement info..." />
          </div>

          {/* Contact details */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3 text-muted-foreground">Contact Details (optional)</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input id="contact_phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+234 ..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input id="contact_email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="official@email.com" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <div className="grid gap-2">
                <Label htmlFor="office_address">Office address</Label>
                <Input id="office_address" value={officeAddress} onChange={(e) => setOfficeAddress(e.target.value)} placeholder="Senate Building, Three Arms Zone..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="website_url">Website</Label>
                <Input id="website_url" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* Social media */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3 text-muted-foreground">Social Media (optional)</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="twitter_handle">Twitter / X</Label>
                <Input id="twitter_handle" value={twitterHandle} onChange={(e) => setTwitterHandle(e.target.value)} placeholder="@handle" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="facebook_url">Facebook</Label>
                <Input id="facebook_url" type="url" value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <div className="grid gap-2">
                <Label htmlFor="instagram_handle">Instagram</Label>
                <Input id="instagram_handle" value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="@handle" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tiktok_handle">TikTok</Label>
                <Input id="tiktok_handle" value={tiktokHandle} onChange={(e) => setTiktokHandle(e.target.value)} placeholder="@handle" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <div className="grid gap-2">
                <Label htmlFor="youtube_url">YouTube</Label>
                <Input id="youtube_url" type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="linkedin_url">LinkedIn</Label>
                <Input id="linkedin_url" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="photo">Photo (optional)</Label>
            <Input id="photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">Uploaded photos are auto-resized and converted to WebP before storage.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="submitter_name">Your name (optional)</Label>
              <Input id="submitter_name" value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="submitter_email">Email (optional)</Label>
              <Input id="submitter_email" type="email" value={submitterEmail} onChange={(e) => setSubmitterEmail(e.target.value)} />
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
            <Button type="submit" disabled={isSubmitting || !fullName.trim() || !title.trim() || !party.trim() || !sourceUrl.trim()}>
              {isSubmitting ? 'Submitting...' : 'Submit Official'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
