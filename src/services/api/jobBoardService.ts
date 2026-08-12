import { apiClient } from './client';

/**
 * Client for the backend job-board surface (`/job-postings/*` +
 * `/job-applications/*`) — the labour job board: any registered user posts
 * a job (goes to admin review), labour-registered providers whose trades
 * match see it in their feed and apply, the poster accepts/rejects
 * applicants. Contact details on either side appear ONLY once an
 * application is ACCEPTED — the backend gates the reveal, these types just
 * mirror it. The backend wraps responses as `{ statusCode, message, data }`.
 */
function payload<T>(res: any, fallback: T): T {
  return (res && 'data' in res ? res.data : res) ?? fallback;
}

export type JobPostingStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'FILLED'
  | 'CLOSED';

export type JobApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export const JOB_RATE_UNITS = ['Per Hour', 'Per Day', 'Per Week', 'Per Month'] as const;
export type JobRateUnit = (typeof JOB_RATE_UNITS)[number];

export interface JobPosting {
  id: string;
  posterId: string;
  title: string;
  description: string;
  workersNeeded: number | null;
  /** numeric column — arrives as a string from Postgres. */
  payOffer: number | string | null;
  payRateUnit: string | null;
  applicationDeadline: string | null;
  location: string | null;
  province: string | null;
  city: string | null;
  attributes: Record<string, any> | null;
  status: JobPostingStatus;
  /** The posting fee snapshotted at creation (numeric → string from Postgres);
   *  null when the post was created while posting was free. */
  feeAmount: number | string | null;
  rejectionReason: string | null;
  approvedByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  tradeCategoryIds: string[];
}

/** Poster's list rows carry applicant tallies. */
export interface MyJobPosting extends JobPosting {
  applicationsCount: number;
  pendingApplicationsCount: number;
  acceptedApplicationsCount: number;
}

/** Seeker feed rows carry poster identity + own-application state. */
export interface JobFeedItem extends JobPosting {
  posterName: string;
  /** How many applications the vacancy has drawn — a count only; who
   *  applied stays poster-side. */
  applicantsCount: number;
  hasApplied: boolean;
  myApplicationStatus: JobApplicationStatus | null;
}

/** Evidence the applicant attached against a posting requirement. `url` is a
 *  `/files/secure/...` path — render it with SecureFile, never a bare <img>. */
export interface JobApplicationAttachment {
  label: string;
  url: string;
}

export interface JobApplicant {
  userId: string;
  name: string;
  profilePicture: string | null;
  city: string | null;
  trades: string[];
  /** Revealed by the backend only when the application is ACCEPTED. */
  phone: string | null;
  email: string | null;
}

export interface JobApplicationRow {
  id: string;
  jobPostingId: string;
  status: JobApplicationStatus;
  coverMessage: string;
  expectedRate: number | string;
  rateUnit: string;
  availabilityDate: string;
  /** Visible to the poster from the moment the application lands — it's what
   *  they judge it on (unlike contact details, which unlock on accept). */
  attachments: JobApplicationAttachment[];
  respondedAt: string | null;
  createdAt: string;
  applicant: JobApplicant;
}

export interface JobPostingWithApplicants extends JobPosting {
  applications: JobApplicationRow[];
}

export interface MyJobApplication {
  id: string;
  jobPostingId: string;
  status: JobApplicationStatus;
  coverMessage: string;
  expectedRate: number | string;
  rateUnit: string;
  availabilityDate: string;
  attachments?: JobApplicationAttachment[] | null;
  respondedAt: string | null;
  createdAt: string;
  posting: {
    id: string;
    title: string;
    status: JobPostingStatus;
    location: string | null;
    city: string | null;
    payOffer: number | string | null;
    payRateUnit: string | null;
    tradeCategoryIds: string[];
  } | null;
  /** Present only once ACCEPTED — how to reach the person who hired you. */
  posterContact: { name: string | null; phone: string | null; email: string | null } | null;
}

/**
 * One posting as an anonymous `/discover` visitor sees it — the backend's
 * public allowlist (`JobBoardService.toPublicPosting`), deliberately NOT a
 * `JobPosting` (no `posterId`/`feeAmount`/`rejectionReason`/
 * `approvedByAdminId` — those never leave the server for this surface) and
 * NOT a `JobFeedItem` (no `hasApplied`/`myApplicationStatus` — there's no
 * session to have applied from).
 */
export interface PublicJobFeedItem {
  id: string;
  title: string;
  description: string;
  workersNeeded: number | null;
  payOffer: number | string | null;
  payRateUnit: string | null;
  applicationDeadline: string | null;
  location: string | null;
  province: string | null;
  city: string | null;
  attributes: Record<string, any> | null;
  status: JobPostingStatus;
  createdAt: string;
  updatedAt: string;
  tradeCategoryIds: string[];
  posterName: string;
  applicantsCount: number;
}

export interface CreateJobPostingInput {
  title: string;
  description: string;
  tradeCategoryIds: string[];
  workersNeeded?: number;
  payOffer?: number;
  payRateUnit?: JobRateUnit;
  applicationDeadline?: string;
  location?: string;
  province?: string;
  city?: string;
  attributes?: Record<string, any>;
}

/** Result of starting a PSP collection for a posting fee — same shape the
 *  ads/venture checkouts return off the shared /payments/checkout endpoints. */
export interface JobPostCheckoutResult {
  reference: string;
  status: 'pending' | 'successful' | 'failed' | 'pay-offline' | string;
  amount: string;
  fee?: string;
  totalCharged?: string;
  /** Which adapter answered ('sandbox' | 'dpo') — picks the pending UI:
   *  simulate button vs the approve-on-phone polling card. */
  provider?: string;
  instruction?: string;
  /** Present on live DPO — the hosted payment page to send the payer to. */
  redirectUrl?: string;
}

export interface ApplyToJobInput {
  coverMessage: string;
  expectedRate: number;
  rateUnit: JobRateUnit;
  availabilityDate: string;
  attachments?: JobApplicationAttachment[];
}

export const jobBoardService = {
  // ── Poster ──────────────────────────────────────────────────────────
  async createPosting(input: CreateJobPostingInput): Promise<JobPosting | null> {
    const res = await apiClient.post<JobPosting>('/job-postings', input);
    return payload<JobPosting | null>(res, null);
  },

  async listMyPostings(): Promise<MyJobPosting[]> {
    const res = await apiClient.get<MyJobPosting[]>('/job-postings/mine');
    return payload<MyJobPosting[]>(res, []);
  },

  async getPosting(id: string): Promise<JobPostingWithApplicants | null> {
    const res = await apiClient.get<JobPostingWithApplicants>(`/job-postings/${id}`);
    return payload<JobPostingWithApplicants | null>(res, null);
  },

  /** Edit + resubmit a REJECTED posting — back into the review queue. */
  async resubmitPosting(
    id: string,
    input: Partial<CreateJobPostingInput>,
  ): Promise<JobPosting | null> {
    const res = await apiClient.patch<JobPosting>(`/job-postings/${id}`, input);
    return payload<JobPosting | null>(res, null);
  },

  /** Start a PSP collection (mobile money / card) for a PENDING_PAYMENT posting. */
  async checkoutPosting(
    id: string,
    dto: { channel?: 'mobile-money' | 'card'; phone?: string; operator?: string },
  ): Promise<JobPostCheckoutResult> {
    const res = await apiClient.post<JobPostCheckoutResult>(
      `/job-postings/${encodeURIComponent(id)}/checkout`,
      dto,
    );
    return payload<JobPostCheckoutResult>(res, {} as JobPostCheckoutResult);
  },

  /** Pay the posting fee from the poster's venture balance — instant, no PSP
   *  round-trip. Also the path that free-promotes if the admin fee is now off. */
  async payPostingFromBalance(id: string): Promise<JobPosting | null> {
    const res = await apiClient.post<JobPosting>(
      `/job-postings/${encodeURIComponent(id)}/pay-from-balance`,
    );
    return payload<JobPosting | null>(res, null);
  },

  /** Poll a checkout's PSP status — the endpoint is reference-generic. */
  async getPaymentStatus(reference: string): Promise<JobPostCheckoutResult> {
    const res = await apiClient.get<JobPostCheckoutResult>(
      `/payments/checkout/${encodeURIComponent(reference)}`,
    );
    return payload<JobPostCheckoutResult>(res, {} as JobPostCheckoutResult);
  },

  /** Sandbox-only: stand in for the poster approving on their phone. */
  async simulatePayment(
    reference: string,
    outcome: 'successful' | 'failed' = 'successful',
  ): Promise<{ handled: boolean }> {
    const res = await apiClient.post(
      `/payments/checkout/${encodeURIComponent(reference)}/simulate`,
      { outcome },
    );
    return payload(res, { handled: false });
  },

  async closePosting(id: string): Promise<JobPosting | null> {
    const res = await apiClient.post<JobPosting>(`/job-postings/${id}/close`);
    return payload<JobPosting | null>(res, null);
  },

  async markFilled(id: string): Promise<JobPosting | null> {
    const res = await apiClient.post<JobPosting>(`/job-postings/${id}/fill`);
    return payload<JobPosting | null>(res, null);
  },

  async acceptApplication(applicationId: string): Promise<JobApplicationRow | null> {
    const res = await apiClient.post<JobApplicationRow>(`/job-applications/${applicationId}/accept`);
    return payload<JobApplicationRow | null>(res, null);
  },

  async rejectApplication(applicationId: string): Promise<JobApplicationRow | null> {
    const res = await apiClient.post<JobApplicationRow>(`/job-applications/${applicationId}/reject`);
    return payload<JobApplicationRow | null>(res, null);
  },

  // ── Seeker ──────────────────────────────────────────────────────────
  async listFeed(): Promise<JobFeedItem[]> {
    const res = await apiClient.get<JobFeedItem[]>('/job-postings/feed');
    return payload<JobFeedItem[]>(res, []);
  },

  async applyToJob(jobPostingId: string, input: ApplyToJobInput): Promise<MyJobApplication | null> {
    const res = await apiClient.post<MyJobApplication>(`/job-postings/${jobPostingId}/apply`, input);
    return payload<MyJobApplication | null>(res, null);
  },

  async listMyApplications(): Promise<MyJobApplication[]> {
    const res = await apiClient.get<MyJobApplication[]>('/job-applications/mine');
    return payload<MyJobApplication[]>(res, []);
  },

  // ── Public (no session — /discover) ────────────────────────────────
  async listPublicFeed(): Promise<PublicJobFeedItem[]> {
    const res = await apiClient.get<PublicJobFeedItem[]>('/job-postings/public');
    return payload<PublicJobFeedItem[]>(res, []);
  },

  /** Null for anything not APPROVED — the backend 404s a pending/rejected/
   *  missing id identically, so a public caller can't distinguish them. */
  async getPublicPosting(id: string): Promise<PublicJobFeedItem | null> {
    try {
      const res = await apiClient.get<PublicJobFeedItem>(
        `/job-postings/public/${encodeURIComponent(id)}`,
      );
      return payload<PublicJobFeedItem | null>(res, null);
    } catch {
      return null;
    }
  },
};
