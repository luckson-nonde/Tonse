import { CalendarEvent, CalendarEventCategory, CalendarEventColor } from '../types';

/**
 * Single source of truth for schedule category labels, default colors and
 * the Tailwind classes each color label maps to. Every border hex here is
 * OPAQUE on purpose — translucent border strokes (border-X/NN) mis-rasterize
 * on Mali-GPU Android phones (see DateTimePicker.tsx / the android-ghosting
 * playbook). Never add a /NN alpha suffix to these.
 */

export const CATEGORY_DEFAULT_COLOR: Record<CalendarEventCategory, CalendarEventColor> = {
  MEETING: 'blue',
  REMINDER: 'yellow',
  APPOINTMENT: 'purple',
  EVENT: 'orange',
  PERSONAL: 'green',
  PARCEL_COLLECTION: 'blue',
  MAKE_PAYMENT: 'red',
  OTHER: 'green',
};

export const CATEGORY_OPTIONS: { value: CalendarEventCategory; label: string }[] = [
  { value: 'MEETING', label: 'Meeting' },
  { value: 'REMINDER', label: 'Reminder' },
  { value: 'APPOINTMENT', label: 'Appointment' },
  { value: 'EVENT', label: 'Event' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'PARCEL_COLLECTION', label: 'Parcel Collection' },
  { value: 'MAKE_PAYMENT', label: 'Make Payment' },
  { value: 'OTHER', label: 'Other' },
];

export const CATEGORY_LABELS: Record<CalendarEventCategory, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<CalendarEventCategory, string>;

export interface ColorMeta {
  /** Human label for the swatch picker. */
  label: string;
  /** Solid marker/dot fill (timeline day markers, event indicators). */
  marker: string;
  /** Soft chip: background + text. */
  chipBg: string;
  chipText: string;
  /** Opaque border hex matching the soft chip family. */
  border: string;
  /** Raw hex of the marker fill (for inline styles/swatches). */
  hex: string;
}

export const COLOR_META: Record<CalendarEventColor, ColorMeta> = {
  blue: {
    label: 'Blue',
    marker: 'bg-blue-500',
    chipBg: 'bg-blue-50',
    chipText: 'text-blue-700',
    border: 'border-[#bfdbfe]',
    hex: '#3b82f6',
  },
  green: {
    label: 'Green',
    marker: 'bg-emerald-500',
    chipBg: 'bg-emerald-50',
    chipText: 'text-emerald-700',
    border: 'border-[#a7f3d0]',
    hex: '#10b981',
  },
  orange: {
    label: 'Orange',
    marker: 'bg-orange-500',
    chipBg: 'bg-orange-50',
    chipText: 'text-orange-700',
    border: 'border-[#fed7aa]',
    hex: '#f97316',
  },
  purple: {
    label: 'Purple',
    marker: 'bg-purple-500',
    chipBg: 'bg-purple-50',
    chipText: 'text-purple-700',
    border: 'border-[#e9d5ff]',
    hex: '#a855f7',
  },
  red: {
    label: 'Red',
    marker: 'bg-red-500',
    chipBg: 'bg-red-50',
    chipText: 'text-red-700',
    border: 'border-[#fecaca]',
    hex: '#ef4444',
  },
  yellow: {
    label: 'Yellow',
    marker: 'bg-amber-400',
    chipBg: 'bg-amber-50',
    chipText: 'text-amber-700',
    border: 'border-[#fde68a]',
    hex: '#fbbf24',
  },
};

export const COLOR_OPTIONS = Object.keys(COLOR_META) as CalendarEventColor[];

/** Effective color of an event: explicit swatch wins, else category default. */
export function eventColor(
  event: Pick<CalendarEvent, 'category' | 'color'>,
): CalendarEventColor {
  return event.color ?? CATEGORY_DEFAULT_COLOR[event.category] ?? 'blue';
}

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'None' },
  { value: 10, label: '10 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

export const REPEAT_OPTIONS: { value: CalendarEvent['repeatRule']; label: string }[] = [
  { value: 'NONE', label: 'Never' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];
