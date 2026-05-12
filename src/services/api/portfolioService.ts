import { apiClient } from './client';

export interface PortfolioItem {
  id: string;
  userId: string;
  title: string;
  youtubeUrl: string;
  eventName: string | null;
  eventDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePortfolioItemInput {
  title: string;
  youtubeUrl: string;
  eventName?: string;
  eventDate?: string;
  description?: string;
}

export type UpdatePortfolioItemInput = Partial<CreatePortfolioItemInput>;

export async function fetchUserPortfolio(userId: string): Promise<PortfolioItem[]> {
  const res = await apiClient.get<PortfolioItem[]>(`/portfolio/user/${userId}`);
  return res.data ?? [];
}

export async function createPortfolioItem(payload: CreatePortfolioItemInput): Promise<PortfolioItem> {
  const res = await apiClient.post<PortfolioItem>('/portfolio', payload);
  return res.data as PortfolioItem;
}

export async function updatePortfolioItem(
  id: string,
  payload: UpdatePortfolioItemInput,
): Promise<PortfolioItem> {
  const res = await apiClient.patch<PortfolioItem>(`/portfolio/${id}`, payload);
  return res.data as PortfolioItem;
}

export async function deletePortfolioItem(id: string): Promise<void> {
  await apiClient.delete(`/portfolio/${id}`);
}

/**
 * Extract a YouTube video ID from any of the formats users actually
 * paste — full watch URL, share URL (youtu.be), embed URL, shorts URL,
 * or just a bare video id. Returns null if it can't find one.
 *
 * Examples:
 *   https://www.youtube.com/watch?v=dQw4w9WgXcQ        → dQw4w9WgXcQ
 *   https://youtu.be/dQw4w9WgXcQ                       → dQw4w9WgXcQ
 *   https://www.youtube.com/embed/dQw4w9WgXcQ          → dQw4w9WgXcQ
 *   https://www.youtube.com/shorts/dQw4w9WgXcQ         → dQw4w9WgXcQ
 *   dQw4w9WgXcQ                                        → dQw4w9WgXcQ
 */
export function extractYouTubeId(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();
  if (!url) return null;

  // Bare 11-char id
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;

  // youtu.be/<id>
  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/<id>  or  /shorts/<id>  or  /live/<id>
  const pathMatch = url.match(/youtube\.com\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
  if (pathMatch) return pathMatch[1];

  // youtube.com/watch?v=<id>
  const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  return null;
}

/** Build the embed URL with sensible defaults: rel=0 disables related-
 *  video distractions; modestbranding hides the YouTube logo. */
export function youTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
}

/** Default thumbnail URL for grid previews — no API call needed. */
export function youTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
