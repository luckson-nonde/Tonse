/**
 * Care Plans API service — Home Care (clinical-services/home-care).
 *
 * A care plan is one caregiver↔client engagement, born from a quote the
 * client accepted. The provider's "My Clients" view manages the whole plan
 * (care needs + task list + visit schedule + payment tracking) as one record.
 *
 * MONTHLY plans follow the shop-paywall pattern: a `paidUntil` timestamp
 * extended by an explicit (simulated) renewal — no auto-recurring billing.
 */

import { apiClient } from './client';

export interface CarePlanTask {
  id: string;
  title: string;
  frequency?: string;
  notes?: string;
  done?: boolean;
}

export interface CarePlanVisit {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  /** HH:mm */
  startTime?: string;
  endTime?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  paid?: boolean;
  notes?: string;
}

export interface CarePlanRecord {
  id: string;
  providerId: string;
  buyerId: string;
  quoteId: string | null;
  clientName: string;
  careNeeds: Record<string, any> | null;
  tasks: CarePlanTask[] | null;
  visits: CarePlanVisit[] | null;
  paymentModel: 'PER_VISIT' | 'WEEKLY' | 'MONTHLY';
  rate: number | null;
  /** Agreed payment method from the accepted quote (e.g. "MTN Mobile Money"). */
  paymentMethod: string | null;
  paidUntil: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fields the provider can PATCH. careNeeds is JSON-stringified on the wire
 *  (whitelist-pipe convention — see UpdateCarePlanDto). */
export interface CarePlanPatch {
  clientName?: string;
  careNeeds?: Record<string, any>;
  tasks?: CarePlanTask[];
  visits?: CarePlanVisit[];
  paymentModel?: 'PER_VISIT' | 'WEEKLY' | 'MONTHLY';
  rate?: number;
  paymentMethod?: string;
  status?: 'ACTIVE' | 'PAUSED' | 'ENDED';
  notes?: string;
}

function normalizePlan(plan: any): CarePlanRecord {
  return {
    ...plan,
    rate: plan?.rate === null || plan?.rate === undefined ? null : Number(plan.rate),
    tasks: Array.isArray(plan?.tasks) ? plan.tasks : [],
    visits: Array.isArray(plan?.visits) ? plan.visits : [],
  };
}

/** The caller's client roster (provider perspective). [] on failure. */
export async function fetchMyCarePlans(): Promise<CarePlanRecord[]> {
  try {
    const res = await apiClient.get<any[]>('/care-plans');
    return Array.isArray(res.data) ? res.data.map(normalizePlan) : [];
  } catch (error) {
    console.error('Error fetching care plans:', error);
    return [];
  }
}

/** Idempotent — returns the existing plan if one was already started for the quote. */
export async function createCarePlanFromQuote(quoteId: string): Promise<CarePlanRecord> {
  const res = await apiClient.post<any>('/care-plans', { quoteId });
  if (!res.data) throw new Error('Care plan creation returned no data');
  return normalizePlan(res.data);
}

export async function updateCarePlan(id: string, patch: CarePlanPatch): Promise<CarePlanRecord> {
  const { careNeeds, ...rest } = patch;
  const payload: Record<string, any> = { ...rest };
  if (careNeeds !== undefined) payload.careNeeds = JSON.stringify(careNeeds);
  const res = await apiClient.patch<any>(`/care-plans/${id}`, payload);
  if (!res.data) throw new Error('Care plan update returned no data');
  return normalizePlan(res.data);
}

/** Simulated monthly renewal — extends paidUntil by 30 days. */
export async function renewCarePlan(id: string, method?: string): Promise<CarePlanRecord> {
  const res = await apiClient.post<any>(`/care-plans/${id}/renew`, method ? { method } : {});
  if (!res.data) throw new Error('Care plan renewal returned no data');
  return normalizePlan(res.data);
}
