/**
 * Catalog-item booking: turns "this listing + this date" into a targeted
 * inquiry, shared by the public shop page and the in-dashboard shop view.
 *
 * The flow the payload encodes:
 *  - listing HAS a price → the price is fixed (`attributes.lockedPrice`,
 *    enforced server-side in QuotesService) and the shop merely confirms
 *    availability → EXPRESS (1 slot / 1h).
 *  - listing has NO price → the shop's response sets price AND availability
 *    → STANDARD (the existing open-priced precedent).
 *
 * `attributes.preferredDateTime` uses the platform's formalized urgency
 * convention, so once the booking is paid it lands on both calendars via
 * derivedGigEvents automatically.
 */
import { format, parseISO } from 'date-fns';
import { createInquiry, type CreateInquiryPayload } from './api/inquiryService';
import { toNumber } from './api/discoverService';

export interface BookingShop {
  /** users.id of the shop owner — the targeting key. */
  sellerId: string;
  name: string;
  categoryIds?: string[];
  location?: string;
  province?: string | null;
  city?: string | null;
}

export interface BookingItem {
  id: string;
  name: string;
  price?: number | string | null;
}

export function buildBookingInquiryPayload(
  shop: BookingShop,
  item: BookingItem,
  preferredDateTime: string,
  note: string,
): CreateInquiryPayload {
  const price = toNumber(item.price);
  const hasPrice = price > 0;

  let dateLabel = preferredDateTime;
  try {
    dateLabel = format(
      parseISO(preferredDateTime),
      preferredDateTime.includes('T') ? "d MMMM yyyy 'at' h:mm a" : 'd MMMM yyyy',
    );
  } catch {
    /* keep the raw value */
  }

  const description = [
    `Availability request for "${item.name}" on ${dateLabel}.`,
    hasPrice ? `Price fixed by the listing: ZMW ${price}.` : '',
    note ? `Note: ${note}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    title: `Booking: ${item.name}`.slice(0, 255),
    description,
    items: JSON.stringify([{ productId: item.id, title: item.name, quantity: 1 }]),
    categoryIds: shop.categoryIds ?? [],
    location: shop.location || 'Zambia',
    province: shop.province ?? undefined,
    city: shop.city ?? undefined,
    status: 'OPEN',
    preferences: JSON.stringify({}),
    attributes: JSON.stringify({
      orderKind: 'SERVICE_BOOKING',
      productId: item.id,
      urgency: 'On a specific date & time',
      preferredDateTime,
      ...(hasPrice && { lockedPrice: price }),
      ...(note && { note }),
    }),
    processType: hasPrice ? 'EXPRESS' : 'STANDARD',
    targetedProviderId: shop.sellerId,
  };
}

/** Create the booking inquiry (throws on failure — callers surface it). */
export async function createBookingInquiry(
  shop: BookingShop,
  item: BookingItem,
  preferredDateTime: string,
  note: string,
): Promise<void> {
  if (!shop.categoryIds?.length) {
    throw new Error("This shop hasn't finished setting up its categories yet.");
  }
  await createInquiry(buildBookingInquiryPayload(shop, item, preferredDateTime, note));
}
