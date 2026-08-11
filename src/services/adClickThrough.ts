import type { NavigateFunction } from 'react-router-dom';
import { saveAdInquiryIntent } from './adInquiryIntent';

/** The bits of an ad a click needs. Structural, so both the rail's
 *  `Advertisement` and the pop-up's copy of it satisfy it. */
export interface ClickableAd {
  id: string;
  title: string;
  shopProfileId: string | null;
}

/** The bits of the signed-in user a click needs (null = guest). */
export interface ClickViewer {
  role?: string;
}

/**
 * What happens when someone clicks an advert — ONE implementation, shared by
 * the on-page rails (AdCarousel) and the Spotlight pop-up.
 *
 * A click drops the buyer straight into the inquiry funnel aimed at the
 * advertiser — no shop page, no directory, no searching: the ad already says
 * who they're buying from. First stop is "how do you want to buy"
 * (ProcessSelection); the intent (incl. ad attribution) is stashed first so it
 * survives the login bounce for a visitor who isn't signed in yet.
 *
 * Non-buyers (a seller seeing the sidebar rail) can't file an inquiry and are
 * blocked out of /buyer/* anyway, so they keep the old destination — the
 * advertiser's public shop page, `?ad=` carrying the attribution.
 *
 * Shared rather than duplicated because ad attribution decides who gets
 * credited for a sale: two copies that drift is two different answers to
 * "which ad won this customer".
 */
export function runAdClickThrough(
  ad: ClickableAd,
  user: ClickViewer | null | undefined,
  navigate: NavigateFunction,
): void {
  if (!ad.shopProfileId) return;
  const shopPage = `/discover/${ad.shopProfileId}?ad=${encodeURIComponent(ad.id)}`;

  if (user && user.role !== 'BUYER') {
    navigate(shopPage);
    return;
  }

  saveAdInquiryIntent({ shopProfileId: ad.shopProfileId, adId: ad.id, adTitle: ad.title });

  if (!user) {
    // Sign in first — Login resumes the funnel for buyer accounts and falls
    // back to the shop page for anything else.
    navigate('/login', { state: { pendingAdTitle: ad.title } });
    return;
  }
  navigate('/buyer/process-selection');
}
