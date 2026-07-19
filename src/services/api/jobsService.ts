import { apiClient } from './client';

/**
 * Client for the backend `/jobs/*` surface — technician field work.
 *
 * A "job" is a paid quote viewed as work to execute. Owners see their whole
 * book and assign; technicians (staff with MANAGE_JOBS) see only quotes
 * assigned to them. Evidence media is readable by owner, assigned technician,
 * the quote's buyer, and admins — the server enforces all of that; this
 * client is just transport. Responses are `{ statusCode, message, data }`.
 */

export interface JobRecord {
  id: string;
  inquiryId: string;
  inquiryTitle: string;
  status: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  assignedTechnicianId: string | null;
  technicianName: string | null;
  buyerId: string | null;
  buyerName: string | null;
  location: string | null;
  /** The inquiry's schema-form attributes — vehicle details/VIN live here. */
  attributes: Record<string, any>;
  beforeCount: number;
  afterCount: number;
}

export interface JobMediaRecord {
  id: string;
  quoteId: string;
  capturedById: string;
  phase: 'BEFORE' | 'AFTER';
  mediaType: 'IMAGE' | 'VIDEO';
  url: string;
  note: string | null;
  createdAt: string;
}

function payload<T>(res: any, fallback: T): T {
  return (res && 'data' in res ? res.data : res) ?? fallback;
}

export const jobsService = {
  /** Active (paid, not yet handed over) or completed jobs for the caller. */
  async list(scope: 'active' | 'history' = 'active'): Promise<JobRecord[]> {
    const res = await apiClient.get(`/jobs?scope=${scope}`);
    return payload<JobRecord[]>(res, []);
  },

  /** Owner only: assign (or unassign with null) a technician to a job. */
  async assign(quoteId: string, technicianId: string | null) {
    const res = await apiClient.post(`/jobs/${quoteId}/assign`, { technicianId });
    return payload(res, null);
  },

  /** Owner or assigned technician: record one uploaded evidence file. */
  async addMedia(
    quoteId: string,
    media: { phase: 'BEFORE' | 'AFTER'; mediaType: 'IMAGE' | 'VIDEO'; url: string; note?: string },
  ): Promise<JobMediaRecord | null> {
    const res = await apiClient.post(`/jobs/${quoteId}/media`, media);
    return payload<JobMediaRecord | null>(res, null);
  },

  /** Evidence for a job (owner / technician / the job's buyer / admin). */
  async media(quoteId: string): Promise<JobMediaRecord[]> {
    const res = await apiClient.get(`/jobs/${quoteId}/media`);
    return payload<JobMediaRecord[]>(res, []);
  },
};
