/**
 * Role-aware staff Overview — the landing tab for every staff account type.
 * Detects which staff shape the signed-in user is (technician / collection
 * officer / quotation manager / loan officer), self-fetches that role's
 * numbers (same precedent as CollectionPage's self-contained fetch), and
 * renders the shared StaffOverviewHero layout.
 */
import React, { useEffect, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  Landmark,
  PackageCheck,
  QrCode,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import {
  PERMISSIONS,
  hasPermission,
  isCollectionOfficer,
  isLoanOfficer,
  isQuotationManager,
  isTechnician,
} from '../../utils/rbac';
import { jobsService, JobRecord } from '../../services/api/jobsService';
import { collectionService } from '../../services/api/collectionService';
import { loanService } from '../../services/api/loanService';
import { db } from '../../services/api/database';
import StaffOverviewHero, {
  StaffOverviewMetric,
  StaffOverviewRundownItem,
} from './StaffOverviewHero';

const shortDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : undefined;

export default function StaffOverview({ onNavigate }: { onNavigate: (viewId: string) => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<StaffOverviewMetric[]>([]);
  const [rundown, setRundown] = useState<StaffOverviewRundownItem[]>([]);
  const [chips, setChips] = useState<string[]>([]);

  const technician = isTechnician(user);
  const collection = isCollectionOfficer(user);
  const quotation = isQuotationManager(user);
  const loans = isLoanOfficer(user);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (technician) {
          const [active, history] = await Promise.all([
            jobsService.list('active'),
            jobsService.list('history'),
          ]);
          if (cancelled) return;
          const pending = active.filter((j: JobRecord) => j.afterCount === 0);
          setMetrics([
            { id: 'assigned', label: 'Assigned Jobs', value: active.length, footnote: 'On your plate right now', icon: ClipboardList },
            { id: 'pending', label: 'Pending Capture', value: pending.length, footnote: 'No after-evidence yet', icon: Camera },
            { id: 'done', label: 'Jobs Done', value: history.length, footnote: 'Completed & handed over', icon: CheckCircle2 },
          ]);
          setRundown(
            active.map((j) => ({
              id: j.id,
              title: j.inquiryTitle,
              subtitle: [j.buyerName, j.location].filter(Boolean).join(' · ') || undefined,
              status: j.status,
              date: shortDate(j.updatedAt),
            })),
          );
          setChips([`${active.length} assigned`, `${pending.length} pending`]);
        } else if (collection) {
          const [queue, recent] = await Promise.all([
            collectionService.listQueue(),
            collectionService.listRecent(),
          ]);
          if (cancelled) return;
          const canMoney = hasPermission(user, PERMISSIONS.VIEW_ANALYTICS);
          const total = recent.reduce((sum: number, q: any) => sum + Number(q.price || 0), 0);
          setMetrics([
            { id: 'queue', label: 'Pending Collections', value: queue.length, footnote: 'Awaiting handover', icon: QrCode },
            { id: 'recent', label: 'Completed Recently', value: recent.length, footnote: 'Handovers closed out', icon: PackageCheck },
            ...(canMoney
              ? [{ id: 'total', label: 'Total Collected', value: `ZMW ${total.toLocaleString()}`, footnote: 'Across recent handovers', icon: Wallet } as StaffOverviewMetric]
              : []),
          ]);
          setRundown(
            queue.map((q: any) => ({
              id: String(q.id),
              title: q.inquiryTitle || 'Parcel',
              subtitle: q.buyerContact?.name || undefined,
              status: q.status,
              date: shortDate(q.updatedAt),
            })),
          );
          setChips([`${queue.length} in queue`]);
        } else if (quotation || loans) {
          if (loans) {
            const [requests, offers] = await Promise.all([
              loanService.listRequests({ status: 'OPEN' }),
              loanService.listOffers(),
            ]);
            if (cancelled) return;
            const accepted = offers.filter((o: any) =>
              ['ACCEPTED', 'PAID', 'COMPLETED'].includes(String(o.status || '').toUpperCase()),
            );
            setMetrics([
              { id: 'open', label: 'Open Requests', value: requests.length, footnote: 'Awaiting your review', icon: Landmark },
              { id: 'offers', label: 'Offers Made', value: offers.length, footnote: 'All time', icon: FileText },
              { id: 'accepted', label: 'Accepted', value: accepted.length, footnote: 'Offers borrowers took', icon: CheckCircle2 },
            ]);
            setRundown(
              requests.map((r: any) => ({
                id: String(r.id),
                title: r.title || 'Loan request',
                subtitle: r.location || undefined,
                status: String(r.status || 'OPEN').toUpperCase(),
                date: shortDate(r.createdAt),
              })),
            );
            setChips([`${requests.length} open`, `${offers.length} offers`]);
          } else {
            const shopId = user?.parentProviderId ?? user?.id;
            const quotes = shopId
              ? await db.quotes.where('providerId').equals(shopId).toArray()
              : [];
            if (cancelled) return;
            const pending = quotes.filter((q: any) => q.status === 'PENDING');
            const won = quotes.filter((q: any) =>
              ['ACCEPTED', 'PAID', 'PENDING_COLLECTION', 'AWAITING_PICKUP', 'COMPLETED', 'HANDED_OVER'].includes(q.status),
            );
            setMetrics([
              { id: 'pending', label: 'Pending Quotes', value: pending.length, footnote: 'Awaiting buyer decision', icon: FileText },
              { id: 'won', label: 'Accepted', value: won.length, footnote: 'Quotes buyers took', icon: CheckCircle2 },
              { id: 'sent', label: 'Quotes Sent', value: quotes.length, footnote: 'All time', icon: ClipboardList },
            ]);
            const sorted = [...quotes].sort(
              (a: any, b: any) =>
                new Date(b.updatedAt || b.createdAt || 0).getTime() -
                new Date(a.updatedAt || a.createdAt || 0).getTime(),
            );
            setRundown(
              sorted.slice(0, 8).map((q: any) => ({
                id: String(q.id),
                title: q.inquiryTitle || 'Quote',
                status: q.status,
                date: shortDate(q.updatedAt || q.createdAt),
              })),
            );
            setChips([`${pending.length} pending`, `${won.length} accepted`]);
          }
        }
      } catch {
        // Non-fatal: the work tabs still function; the overview just shows zeros.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const firstName = (user?.name || '').trim().split(/\s+/)[0] || '';

  if (technician) {
    return (
      <StaffOverviewHero
        eyebrow="Technician Control Centre"
        headline="Capture every job, before and after."
        firstName={firstName}
        chips={['technician', ...chips]}
        icon={Camera}
        metrics={metrics}
        rundownTitle="Job run-down"
        rundownSubtitle="Every job assigned to you, with its status and capture progress."
        rundown={rundown}
        rundownEmpty="No jobs assigned to you yet — your owner assigns them from their Orders desk."
        ctaLabel="Go to My Jobs"
        onCta={() => onNavigate('my-jobs')}
        onRowClick={() => onNavigate('my-jobs')}
        loading={loading}
      />
    );
  }
  if (collection) {
    return (
      <StaffOverviewHero
        eyebrow="Collection Control Centre"
        headline="Verify every handover, release with confidence."
        firstName={firstName}
        chips={['collection officer', ...chips]}
        icon={QrCode}
        metrics={metrics}
        rundownTitle="Collection run-down"
        rundownSubtitle="Parcels awaiting verification and handover."
        rundown={rundown}
        rundownEmpty="Nothing waiting to be collected right now."
        ctaLabel="Open Collection Desk"
        onCta={() => onNavigate('collection')}
        onRowClick={() => onNavigate('collection')}
        loading={loading}
      />
    );
  }
  if (loans) {
    return (
      <StaffOverviewHero
        eyebrow="Lending Control Centre"
        headline="Review requests, make winning offers."
        firstName={firstName}
        chips={['loan officer', ...chips]}
        icon={Landmark}
        metrics={metrics}
        rundownTitle="Request run-down"
        rundownSubtitle="Open loan requests awaiting your decision."
        rundown={rundown}
        rundownEmpty="No open loan requests right now."
        ctaLabel="Review Requests"
        onCta={() => onNavigate('leads')}
        onRowClick={() => onNavigate('leads')}
        loading={loading}
      />
    );
  }
  // Default: quotation manager (also the safe fallback if a staff account
  // holds an unrecognized permission mix).
  return (
    <StaffOverviewHero
      eyebrow="Quotation Control Centre"
      headline="Quote fast, win the job."
      firstName={firstName}
      chips={['quotation manager', ...chips]}
      icon={FileText}
      metrics={metrics}
      rundownTitle="Quote run-down"
      rundownSubtitle="Your recent quotations and where they stand."
      rundown={rundown}
      rundownEmpty="No quotes yet — start from the buyer inquiries waiting for a response."
      ctaLabel="Review Buyer Inquiries"
      onCta={() => onNavigate('leads')}
      onRowClick={() => onNavigate('my-quotes')}
      loading={loading}
    />
  );
}
