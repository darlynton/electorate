'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/use-auth';
import { LoginDialog } from '@/components/auth/login-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import {
  CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight,
  ShieldAlert, ExternalLink, RefreshCw,
} from 'lucide-react';
import type { EditSuggestion, SuggestionStatus } from '@/types';

// ── Types ────────────────────────────────────────────────────────────────────
interface Pagination { page: number; limit: number; total: number; totalPages: number; }
interface ListResponse { data: EditSuggestion[]; pagination: Pagination; }

const STATUS_OPTIONS: { label: string; value: SuggestionStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function AdminContributionsPage() {
  const { session, isAdmin, isLoading: authLoading } = useAuth();

  const [suggestions, setSuggestions] = useState<EditSuggestion[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | 'all'>('pending');
  const [isLoading, setIsLoading] = useState(true);

  const [selected, setSelected] = useState<EditSuggestion | null>(null);
  const [reviewerNote, setReviewerNote] = useState('');
  const [isActioning, setIsActioning] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchContributions = useCallback(async (page = 1) => {
    if (!session?.access_token) return;
    setIsLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      const res = await fetch(`/api/v1/admin/contributions?${qs}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const json: ListResponse = await res.json();
      setSuggestions(json.data ?? []);
      setPagination(json.pagination);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, statusFilter]);

  useEffect(() => { if (isAdmin) fetchContributions(); }, [isAdmin, fetchContributions]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selected || !session?.access_token) return;
    setIsActioning(true);
    setActionMsg(null);
    try {
      const res = await fetch('/api/v1/admin/contributions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: selected.id, action, reviewer_note: reviewerNote.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Action failed');
      setActionMsg({ type: 'success', text: `Suggestion ${action === 'approve' ? 'approved' : 'rejected'}.` });
      setTimeout(() => {
        setSelected(null); setReviewerNote(''); setActionMsg(null);
        fetchContributions(pagination.page);
      }, 1000);
    } catch (err) {
      setActionMsg({ type: 'error', text: err instanceof Error ? err.message : 'Action failed' });
    } finally {
      setIsActioning(false);
    }
  };

  // ── Auth gates ─────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="container max-w-7xl mx-auto py-12 px-4 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!session) return (
    <div className="container max-w-7xl mx-auto py-20 px-4 text-center space-y-4">
      <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Admin Access Required</h1>
      <p className="text-muted-foreground">Sign in with an admin account to review contributions.</p>
      <LoginDialog triggerLabel="Sign In" triggerClassName="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium" />
    </div>
  );

  if (!isAdmin) return (
    <div className="container max-w-7xl mx-auto py-20 px-4 text-center space-y-4">
      <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground">Your account does not have admin privileges.</p>
    </div>
  );

  // ── Summary counts from current page ──────────────────────────────────────
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contributions Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, approve, or reject crowd-sourced edits and new official submissions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchContributions(pagination.page)} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_OPTIONS.filter(o => o.value !== 'all').map(opt => {
          const count = opt.value === statusFilter
            ? pagination.total
            : suggestions.filter(s => s.status === opt.value).length;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-lg border p-3 text-left transition-colors hover:border-primary/60 ${
                statusFilter === opt.value ? 'border-primary bg-primary/5' : 'bg-card'
              }`}
            >
              <p className="text-xs text-muted-foreground capitalize">{opt.label}</p>
              <p className="text-xl font-bold mt-0.5">
                {opt.value === statusFilter ? pagination.total : '—'}
              </p>
            </button>
          );
        })}
        <button
          onClick={() => setStatusFilter('all')}
          className={`rounded-lg border p-3 text-left transition-colors hover:border-primary/60 ${
            statusFilter === 'all' ? 'border-primary bg-primary/5' : 'bg-card'
          }`}
        >
          <p className="text-xs text-muted-foreground">All</p>
          <p className="text-xl font-bold mt-0.5">{statusFilter === 'all' ? pagination.total : '—'}</p>
        </button>
        {pendingCount > 0 && statusFilter !== 'pending' && (
          <div className="col-span-full">
            <p className="text-xs text-amber-600 font-medium">
              ⚠️ {pendingCount} pending item{pendingCount !== 1 ? 's' : ''} on this page need review.
            </p>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Filter:</span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SuggestionStatus | 'all')}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <span>{STATUS_OPTIONS.find(o => o.value === statusFilter)?.label ?? 'All'}</span>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {pagination.total} total result{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Data Table */}
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[90px]">Type</TableHead>
              <TableHead>Politician / Name</TableHead>
              <TableHead className="hidden md:table-cell">Detail</TableHead>
              <TableHead className="hidden lg:table-cell w-[110px]">Submitted</TableHead>
              <TableHead className="hidden sm:table-cell w-[80px]">Submitter</TableHead>
              <TableHead className="w-[90px]">Status</TableHead>
              <TableHead className="w-[80px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : suggestions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                  No contributions found for the selected filter.
                </TableCell>
              </TableRow>
            ) : (
              suggestions.map((s) => {
                const payload = s.payload as Record<string, string>;
                const displayName = s.submission_type === 'suggest_edit'
                  ? s.politician?.full_name ?? '—'
                  : payload.full_name ?? '—';
                const detail = s.submission_type === 'suggest_edit'
                  ? `${payload.field_name} → ${payload.proposed_value?.slice(0, 60) ?? ''}`
                  : `${payload.party ?? ''} · ${payload.state ?? ''}`;

                return (
                  <TableRow key={s.id} className="cursor-pointer group" onClick={() => { setSelected(s); setReviewerNote(''); setActionMsg(null); }}>
                    <TableCell>
                      <Badge variant={s.submission_type === 'suggest_edit' ? 'secondary' : 'default'} className="text-xs whitespace-nowrap">
                        {s.submission_type === 'suggest_edit' ? 'Edit' : 'New'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[160px] truncate">{displayName}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs max-w-xs truncate">
                      {detail}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[80px] truncate">
                      {s.submitter_name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-70 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); setSelected(s); setReviewerNote(''); setActionMsg(null); }}
                        title="Review"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              disabled={pagination.page <= 1} onClick={() => fetchContributions(1)} title="First page">
              «
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              disabled={pagination.page <= 1} onClick={() => fetchContributions(pagination.page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm text-muted-foreground">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              disabled={pagination.page >= pagination.totalPages} onClick={() => fetchContributions(pagination.page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              disabled={pagination.page >= pagination.totalPages} onClick={() => fetchContributions(pagination.totalPages)} title="Last page">
              »
            </Button>
          </div>
        </div>
      )}

      {/* Review detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (() => {
            const payload = selected.payload as Record<string, string | null>;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    Review Contribution
                    <StatusBadge status={selected.status} />
                  </DialogTitle>
                  <DialogDescription>
                    {selected.submission_type === 'suggest_edit' ? 'Edit suggestion' : 'New official submission'}
                    {selected.politician && ` · ${selected.politician.full_name}`}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-1">
                  {/* Payload table */}
                  <Card className="p-0 overflow-hidden">
                    <CardHeader className="py-2.5 px-4 bg-muted/40 border-b">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Submission Details
                      </CardTitle>
                    </CardHeader>
                    <Table>
                      <TableBody>
                        {Object.entries(payload).map(([key, value]) =>
                          value != null ? (
                            <TableRow key={key}>
                              <TableCell className="py-2 w-40 text-xs font-medium text-muted-foreground whitespace-nowrap align-top">
                                {formatLabel(key)}
                              </TableCell>
                              <TableCell className="py-2 text-sm break-words max-w-xs">
                                {value}
                              </TableCell>
                            </TableRow>
                          ) : null,
                        )}
                      </TableBody>
                    </Table>
                  </Card>

                  {/* Reason */}
                  {selected.reason && (
                    <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm space-y-0.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason</p>
                      <p>{selected.reason}</p>
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selected.submitter_name && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Submitter</p>
                        <p>{selected.submitter_name}</p>
                      </div>
                    )}
                    {selected.submitter_email && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Email</p>
                        <p>{selected.submitter_email}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Submitted</p>
                      <p>{new Date(selected.created_at).toLocaleDateString('en-NG', { dateStyle: 'long' })}</p>
                    </div>
                    {selected.source_url && (
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Source</p>
                        <a
                          href={selected.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 truncate max-w-full"
                        >
                          {selected.source_url.replace(/^https?:\/\//, '').slice(0, 40)}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Image */}
                  {selected.image_url && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Supporting Image</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selected.image_url} alt="Submission" className="rounded-lg max-h-60 object-contain border" />
                    </div>
                  )}

                  {/* Review actions (pending only) */}
                  {selected.status === 'pending' && (
                    <div className="border-t pt-4 space-y-3">
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium">Reviewer note <span className="text-muted-foreground font-normal">(optional)</span></p>
                        <Textarea
                          value={reviewerNote}
                          onChange={(e) => setReviewerNote(e.target.value)}
                          placeholder="Add a note explaining your decision..."
                          rows={2}
                        />
                      </div>
                      {actionMsg && (
                        <div className={`rounded-md px-3 py-2 text-sm ${actionMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {actionMsg.text}
                        </div>
                      )}
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" disabled={isActioning} onClick={() => setSelected(null)}>
                          Cancel
                        </Button>
                        <Button
                          variant="destructive" size="sm" disabled={isActioning}
                          onClick={() => handleAction('reject')}
                        >
                          <XCircle className="h-4 w-4 mr-1.5" />
                          {isActioning ? 'Processing…' : 'Reject'}
                        </Button>
                        <Button
                          size="sm" disabled={isActioning}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleAction('approve')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                          {isActioning ? 'Processing…' : 'Approve'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Already reviewed */}
                  {selected.status !== 'pending' && (
                    <div className="border-t pt-4 rounded-lg bg-muted/30 px-4 py-3 space-y-1 text-sm">
                      <p className="font-semibold">
                        {selected.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                        {selected.reviewed_at && (
                          <span className="font-normal text-muted-foreground ml-2">
                            on {new Date(selected.reviewed_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                          </span>
                        )}
                      </p>
                      {selected.reviewer_note && (
                        <p className="text-muted-foreground">{selected.reviewer_note}</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SuggestionStatus }) {
  if (status === 'approved')
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Approved</Badge>;
  if (status === 'rejected')
    return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Rejected</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Pending</Badge>;
}

function formatLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

