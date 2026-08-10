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
};
