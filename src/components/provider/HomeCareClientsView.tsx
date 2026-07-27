import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  HeartPulse,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  CarePlanRecord,
  CarePlanTask,
  CarePlanVisit,
  createCarePlanFromQuote,
  fetchMyCarePlans,
  renewCarePlan,
  updateCarePlan,
} from '../../services/api/carePlanService';
import { fetchUserQuotes, QuoteResponse } from '../../services/api/quoteService';

interface HomeCareClientsViewProps {
  user: any;
}

/** Quote statuses from acceptance onward — mirrors the backend's
 *  PLAN_ELIGIBLE_QUOTE_STATUSES so we never offer a button the API rejects. */
const PLAN_ELIGIBLE_STATUSES = new Set([
  'ACCEPTED',
  'PAYMENT_PENDING',
  'PAID',
  'PENDING_COLLECTION',
  'AWAITING_PICKUP',
  'COMPLETED',
  'HANDED_OVER',
]);

const isHomeCareQuote = (q: QuoteResponse): boolean => {
  const inquiry: any = q.inquiry ?? {};
  const haystack = [
    ...(Array.isArray(inquiry.categoryIds) ? inquiry.categoryIds : []),
    ...(Array.isArray(inquiry.categories) ? inquiry.categories : []),
    inquiry.category ?? '',
  ]
    .join(' ')
    .toLowerCase()
    .replace(/-/g, ' ');
  return haystack.includes('home care');
};

const newId = () =>
  (crypto as any).randomUUID?.() ?? `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const fmtMoney = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `K${Number(n).toLocaleString()}`;

const fmtVisitDate = (v: CarePlanVisit) => {
  try {
    return `${format(parseISO(v.date), 'EEE d MMM')}${v.startTime ? ` · ${v.startTime}` : ''}`;
  } catch {
    return v.date;
  }
};

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

/**
 * Home Care "My Clients" — the caregiver's (nurse/doctor) working surface.
 * One card per care plan: the client's care profile (seeded from their
 * request), the duty/task list, the visit schedule, and payment tracking
 * (per-visit or monthly-with-paidUntil). Shown only to providers whose
 * categories include home-care (categoryFilter on the nav item).
 */
export default function HomeCareClientsView({ user }: HomeCareClientsViewProps) {
  const effectiveProviderId: string | undefined = user?.parentProviderId ?? user?.id;

  const [plans, setPlans] = useState<CarePlanRecord[]>([]);
  const [eligibleQuotes, setEligibleQuotes] = useState<QuoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newVisitDate, setNewVisitDate] = useState('');
  const [newVisitTime, setNewVisitTime] = useState('');

  const refresh = useCallback(async () => {
    const [planList, quoteList] = await Promise.all([
      fetchMyCarePlans(),
      effectiveProviderId
        ? fetchUserQuotes({ providerId: effectiveProviderId })
        : Promise.resolve([] as QuoteResponse[]),
    ]);
    setPlans(planList);
    const covered = new Set(planList.map((p) => p.quoteId).filter(Boolean));
    setEligibleQuotes(
      quoteList.filter(
        (q) =>
          isHomeCareQuote(q) && PLAN_ELIGIBLE_STATUSES.has(q.status) && !covered.has(q.id),
      ),
    );
  }, [effectiveProviderId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh()
      .catch(() => {
        if (!cancelled) setError('Could not load your clients. Pull to refresh or try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const applyPatch = async (
    plan: CarePlanRecord,
    patch: Parameters<typeof updateCarePlan>[1],
  ) => {
    setBusyId(plan.id);
    setError(null);
    try {
      const saved = await updateCarePlan(plan.id, patch);
      setPlans((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    } catch {
      setError('Could not save that change — please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const startPlan = async (quote: QuoteResponse) => {
    setBusyId(quote.id);
    setError(null);
    try {
      await createCarePlanFromQuote(quote.id);
      await refresh();
    } catch {
      setError('Could not start the care plan — please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const renew = async (plan: CarePlanRecord) => {
    setBusyId(plan.id);
    setError(null);
    try {
      const saved = await renewCarePlan(plan.id);
      setPlans((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    } catch {
      setError('Could not record the renewal — please try again.');
    } finally {
      setBusyId(null);
    }
  };

  // The cross-client agenda: every upcoming scheduled visit, soonest first.
  const upcomingVisits = useMemo(() => {
    const today = todayStr();
    return plans
      .filter((p) => p.status === 'ACTIVE')
      .flatMap((p) =>
        (p.visits ?? [])
          .filter((v) => v.status === 'SCHEDULED' && v.date >= today)
          .map((v) => ({ visit: v, plan: p })),
      )
      .sort((a, b) =>
        `${a.visit.date} ${a.visit.startTime ?? ''}`.localeCompare(
          `${b.visit.date} ${b.visit.startTime ?? ''}`,
        ),
      )
      .slice(0, 8);
  }, [plans]);

  const setVisitStatus = (plan: CarePlanRecord, visitId: string, status: CarePlanVisit['status']) =>
    applyPatch(plan, {
      visits: (plan.visits ?? []).map((v) => (v.id === visitId ? { ...v, status } : v)),
    });

  const toggleVisitPaid = (plan: CarePlanRecord, visitId: string) =>
    applyPatch(plan, {
      visits: (plan.visits ?? []).map((v) => (v.id === visitId ? { ...v, paid: !v.paid } : v)),
    });

  // WEEKLY and MONTHLY plans both run on a paid-until date.
  const isPeriodPlan = (plan: CarePlanRecord) =>
    plan.paymentModel === 'WEEKLY' || plan.paymentModel === 'MONTHLY';

  const planOverdue = (plan: CarePlanRecord) =>
    isPeriodPlan(plan) &&
    (!plan.paidUntil || new Date(plan.paidUntil).getTime() < Date.now());

  const rateSuffix = (plan: CarePlanRecord) =>
    plan.paymentModel === 'MONTHLY' ? 'month' : plan.paymentModel === 'WEEKLY' ? 'week' : 'visit';

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm min-h-[40vh] flex items-center justify-center">
        <p className="text-slate-400 font-medium">Loading your clients…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-2xl font-serif font-bold text-slate-900">My Clients</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* New engagements that haven't been set up as clients yet */}
      {eligibleQuotes.length > 0 && (
        <div className="bg-[#fdf6e9] rounded-2xl border border-[#e8d5ae] p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#a87b26]" />
            <h3 className="text-sm font-bold text-[#7c5a1a] uppercase tracking-wider">
              New Clients To Set Up
            </h3>
          </div>
          {eligibleQuotes.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-[#e8d5ae] px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {q.buyerContact?.name || (q.inquiry as any)?.buyerName || 'Client'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {q.inquiryTitle} · {fmtMoney(q.price)}
                </p>
              </div>
              <button
                onClick={() => startPlan(q)}
                disabled={busyId === q.id}
                className="shrink-0 bg-[#c9973a] hover:bg-[#b3852f] disabled:opacity-60 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {busyId === q.id ? 'Starting…' : 'Start care plan'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming visits across all clients */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarPlus className="w-4 h-4 text-[#a87b26]" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Upcoming Visits
          </h3>
        </div>
        {upcomingVisits.length === 0 ? (
          <p className="text-sm text-slate-400">
            No visits scheduled. Open a client below to add one.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcomingVisits.map(({ visit, plan }) => (
              <li key={visit.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {plan.clientName}
                  </p>
                  <p className="text-xs text-slate-500">{fmtVisitDate(visit)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setVisitStatus(plan, visit.id, 'COMPLETED')}
                    disabled={busyId === plan.id}
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    title="Mark visit done"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setVisitStatus(plan, visit.id, 'CANCELLED')}
                    disabled={busyId === plan.id}
                    className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors"
                    title="Cancel visit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Client roster */}
      {plans.length === 0 && eligibleQuotes.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 sm:p-14 text-center border border-slate-100 shadow-sm flex flex-col items-center min-h-[35vh] justify-center">
          <HeartPulse className="w-12 h-12 text-[#c9973a] mb-4" />
          <p className="text-slate-600 font-semibold text-lg">No clients yet</p>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">
            When a client accepts your home-care quote, they'll appear here so you can plan
            their visits and duties.
          </p>
        </div>
      ) : (
        plans.map((plan) => {
          const expanded = expandedId === plan.id;
          const needs = plan.careNeeds ?? {};
          const services: string[] = Array.isArray(needs.careServices) ? needs.careServices : [];
          const overdue = planOverdue(plan);
          return (
            <div
              key={plan.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
            >
              {/* Card header */}
              <button
                onClick={() => setExpandedId(expanded ? null : plan.id)}
                className="w-full px-4 sm:px-6 py-4 flex items-center justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {plan.clientName}
                    </h3>
                    {plan.status !== 'ACTIVE' && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        {plan.status === 'PAUSED' ? 'Paused' : 'Ended'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {`${fmtMoney(plan.rate)} / ${rateSuffix(plan)}`}
                    {plan.paymentMethod && ` · ${plan.paymentMethod}`}
                    {isPeriodPlan(plan) && (
                      <span className={overdue ? 'text-red-600 font-bold' : 'text-emerald-600'}>
                        {' · '}
                        {overdue
                          ? 'Renewal due'
                          : `Paid until ${format(new Date(plan.paidUntil as string), 'd MMM')}`}
                      </span>
                    )}
                  </p>
                </div>
                {expanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                )}
              </button>

              {expanded && (
                <div className="px-4 sm:px-6 pb-5 space-y-5 border-t border-slate-100 pt-4">
                  {/* Care profile — what this client needs */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <HeartPulse className="w-4 h-4 text-[#a87b26]" />
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Care Profile
                      </h4>
                    </div>
                    {services.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {services.map((s) => (
                          <span
                            key={s}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#fdf6e9] text-[#7c5a1a] border border-[#e8d5ae]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <dl className="text-sm text-slate-600 space-y-1">
                      {needs.careRecipient && (
                        <div>
                          <span className="font-semibold text-slate-700">Who: </span>
                          {needs.careRecipient}
                        </div>
                      )}
                      {needs.visitFrequency && (
                        <div>
                          <span className="font-semibold text-slate-700">Frequency: </span>
                          {needs.visitFrequency}
                        </div>
                      )}
                      {needs.conditionDetails && (
                        <div>
                          <span className="font-semibold text-slate-700">Condition: </span>
                          {needs.conditionDetails}
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Duties / tasks */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList className="w-4 h-4 text-[#a87b26]" />
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Care Duties
                      </h4>
                    </div>
                    <ul className="space-y-1.5">
                      {(plan.tasks ?? []).map((task: CarePlanTask) => (
                        <li key={task.id} className="flex items-center gap-2 group">
                          <button
                            onClick={() =>
                              applyPatch(plan, {
                                tasks: (plan.tasks ?? []).map((t) =>
                                  t.id === task.id ? { ...t, done: !t.done } : t,
                                ),
                              })
                            }
                            disabled={busyId === plan.id}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              task.done
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-white border-slate-300 text-transparent hover:border-[#c9973a]'
                            }`}
                            title={task.done ? 'Mark not done' : 'Mark done'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <span
                            className={`text-sm flex-1 ${
                              task.done ? 'text-slate-400 line-through' : 'text-slate-700'
                            }`}
                          >
                            {task.title}
                          </span>
                          <button
                            onClick={() =>
                              applyPatch(plan, {
                                tasks: (plan.tasks ?? []).filter((t) => t.id !== task.id),
                              })
                            }
                            disabled={busyId === plan.id}
                            className="p-1 rounded text-slate-300 hover:text-red-500 transition-colors"
                            title="Remove duty"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTaskTitle.trim()) {
                            applyPatch(plan, {
                              tasks: [
                                ...(plan.tasks ?? []),
                                { id: newId(), title: newTaskTitle.trim() },
                              ],
                            });
                            setNewTaskTitle('');
                          }
                        }}
                        placeholder="Add a duty (e.g. Change wound dressing)…"
                        className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#c9973a] bg-white text-slate-800"
                      />
                      <button
                        onClick={() => {
                          if (!newTaskTitle.trim()) return;
                          applyPatch(plan, {
                            tasks: [
                              ...(plan.tasks ?? []),
                              { id: newId(), title: newTaskTitle.trim() },
                            ],
                          });
                          setNewTaskTitle('');
                        }}
                        disabled={busyId === plan.id}
                        className="p-2 rounded-lg bg-[#c9973a] hover:bg-[#b3852f] text-white transition-colors"
                        title="Add duty"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Visit schedule */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarPlus className="w-4 h-4 text-[#a87b26]" />
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Visit Schedule
                      </h4>
                    </div>
                    <ul className="space-y-1.5">
                      {(plan.visits ?? [])
                        .slice()
                        .sort((a, b) =>
                          `${a.date} ${a.startTime ?? ''}`.localeCompare(
                            `${b.date} ${b.startTime ?? ''}`,
                          ),
                        )
                        .map((visit) => (
                          <li key={visit.id} className="flex items-center gap-2 text-sm">
                            <span
                              className={`flex-1 ${
                                visit.status === 'CANCELLED'
                                  ? 'text-slate-400 line-through'
                                  : visit.status === 'COMPLETED'
                                    ? 'text-slate-400'
                                    : 'text-slate-700'
                              }`}
                            >
                              {fmtVisitDate(visit)}
                              {visit.status === 'COMPLETED' && ' · done'}
                            </span>
                            {plan.paymentModel === 'PER_VISIT' &&
                              visit.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => toggleVisitPaid(plan, visit.id)}
                                  disabled={busyId === plan.id}
                                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border transition-colors ${
                                    visit.paid
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                      : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-300'
                                  }`}
                                >
                                  {visit.paid ? 'Paid' : 'Unpaid'}
                                </button>
                              )}
                            {visit.status === 'SCHEDULED' && (
                              <>
                                <button
                                  onClick={() => setVisitStatus(plan, visit.id, 'COMPLETED')}
                                  disabled={busyId === plan.id}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                  title="Mark visit done"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setVisitStatus(plan, visit.id, 'CANCELLED')}
                                  disabled={busyId === plan.id}
                                  className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors"
                                  title="Cancel visit"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                    </ul>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <input
                        type="date"
                        value={newVisitDate}
                        min={todayStr()}
                        onChange={(e) => setNewVisitDate(e.target.value)}
                        className="flex-1 min-w-35 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#c9973a] bg-white text-slate-800"
                      />
                      <input
                        type="time"
                        value={newVisitTime}
                        onChange={(e) => setNewVisitTime(e.target.value)}
                        className="w-28 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#c9973a] bg-white text-slate-800"
                      />
                      <button
                        onClick={() => {
                          if (!newVisitDate) return;
                          applyPatch(plan, {
                            visits: [
                              ...(plan.visits ?? []),
                              {
                                id: newId(),
                                date: newVisitDate,
                                startTime: newVisitTime || undefined,
                                status: 'SCHEDULED',
                              },
                            ],
                          });
                          setNewVisitDate('');
                          setNewVisitTime('');
                        }}
                        disabled={busyId === plan.id || !newVisitDate}
                        className="text-xs font-bold px-3 py-2 rounded-lg bg-[#c9973a] hover:bg-[#b3852f] disabled:opacity-50 text-white transition-colors"
                      >
                        Add visit
                      </button>
                    </div>
                  </div>

                  {/* Payment + plan controls */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
                    {isPeriodPlan(plan) && plan.status === 'ACTIVE' && (
                      <button
                        onClick={() => renew(plan)}
                        disabled={busyId === plan.id}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${
                          overdue
                            ? 'bg-[#c9973a] hover:bg-[#b3852f] text-white border-[#c9973a]'
                            : 'bg-white text-[#a87b26] border-[#e8d5ae] hover:bg-[#fdf6e9]'
                        }`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {busyId === plan.id
                          ? 'Recording…'
                          : plan.paymentModel === 'WEEKLY'
                            ? 'Record weekly renewal'
                            : 'Record monthly renewal'}
                      </button>
                    )}
                    {plan.status === 'ACTIVE' ? (
                      <>
                        <button
                          onClick={() => applyPatch(plan, { status: 'PAUSED' })}
                          disabled={busyId === plan.id}
                          className="text-xs font-bold px-3 py-2 rounded-lg bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          Pause plan
                        </button>
                        <button
                          onClick={() => applyPatch(plan, { status: 'ENDED' })}
                          disabled={busyId === plan.id}
                          className="text-xs font-bold px-3 py-2 rounded-lg bg-white text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
                        >
                          End care
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => applyPatch(plan, { status: 'ACTIVE' })}
                        disabled={busyId === plan.id}
                        className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                      >
                        Reactivate plan
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
