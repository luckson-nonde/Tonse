/**
 * Cross-component selected-schedule-date bus. The right-rail CalendarPanel
 * (inside DashboardLayout) and the ScheduleTimelineCard (inside the page
 * children — DynamicAccountRenderer / ProviderHomeView) have no shared
 * parent short of the whole layout, so selection travels the same way as
 * the app's other cross-cutting signals (tonse:data-revalidated,
 * tonse:quotes-changed): a module-level value + a window CustomEvent.
 */

const SCHEDULE_DATE_SELECTED_EVENT = 'tonse:schedule-date-selected';

let selectedDate: Date = new Date();

export function getSelectedScheduleDate(): Date {
  return selectedDate;
}

export function selectScheduleDate(date: Date): void {
  selectedDate = date;
  window.dispatchEvent(
    new CustomEvent(SCHEDULE_DATE_SELECTED_EVENT, { detail: { date } }),
  );
}

/** Subscribe to selection changes; returns an unsubscribe fn. */
export function subscribeToScheduleDate(cb: (date: Date) => void): () => void {
  const handler = (e: Event) => {
    const date = (e as CustomEvent).detail?.date;
    if (date instanceof Date) cb(date);
  };
  window.addEventListener(SCHEDULE_DATE_SELECTED_EVENT, handler);
  return () => window.removeEventListener(SCHEDULE_DATE_SELECTED_EVENT, handler);
}
