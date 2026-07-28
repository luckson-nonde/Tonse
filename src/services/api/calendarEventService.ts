import { apiClient } from './client';
import { CalendarEvent } from '../../types';

/**
 * Personal calendar entries (generic scheduling module). Talks to the real
 * `/calendar-events` NestJS module — NOT the legacy db.calendarEvents Dexie
 * shim (whose silent-404 write path this service replaces). The backend
 * scopes every call to the JWT user, so no userId is ever sent.
 */

export interface CalendarEventRange {
  /** YYYY-MM-DD inclusive bounds on the BASE date; recurring events whose
   *  base date is on/before dateTo are returned regardless of dateFrom so
   *  the client can expand occurrences into the visible window. */
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  status?: string;
}

export interface CreateCalendarEventPayload {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  location?: string;
  category?: CalendarEvent['category'];
  color?: NonNullable<CalendarEvent['color']>;
  repeatRule?: CalendarEvent['repeatRule'];
  reminderOffsetMinutes?: number;
  status?: CalendarEvent['status'];
}

export type UpdateCalendarEventPayload = Omit<
  Partial<CreateCalendarEventPayload>,
  'startTime' | 'endTime' | 'location' | 'color' | 'reminderOffsetMinutes'
> & {
  /** Explicit nulls clear a previously stored optional value. */
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  color?: NonNullable<CalendarEvent['color']> | null;
  reminderOffsetMinutes?: number | null;
};

export async function fetchMyCalendarEvents(
  range: CalendarEventRange = {},
  opts?: { swr?: boolean },
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  if (range.dateFrom) params.set('dateFrom', range.dateFrom);
  if (range.dateTo) params.set('dateTo', range.dateTo);
  if (range.category) params.set('category', range.category);
  if (range.status) params.set('status', range.status);
  const qs = params.toString();
  const res = await apiClient.get<CalendarEvent[]>(
    `/calendar-events${qs ? `?${qs}` : ''}`,
    { swr: opts?.swr },
  );
  return res.data ?? [];
}

export async function createCalendarEvent(
  payload: CreateCalendarEventPayload,
): Promise<CalendarEvent> {
  const res = await apiClient.post<CalendarEvent>('/calendar-events', payload);
  return res.data!;
}

export async function updateCalendarEvent(
  id: string,
  changes: UpdateCalendarEventPayload,
): Promise<CalendarEvent> {
  const res = await apiClient.patch<CalendarEvent>(`/calendar-events/${id}`, changes);
  return res.data!;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await apiClient.delete(`/calendar-events/${id}`);
}
