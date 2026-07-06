import {
  ShieldCheck,
  MapPin,
  Lock,
  Building2,
  FileText,
  Camera,
  CreditCard,
  ClipboardList,
  UserCog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Per-form copy for the Universal Consent Modal. Only the "why we collect
 * this" content varies by form — the fixed chrome ("Before We Continue",
 * the Privacy Matters trust card, the consent sentence, the button labels)
 * lives in ConsentModal itself. Seeded from the old RegistrationStepShell
 * "Why this matters" tips + the product spec examples.
 */
export interface ConsentConfig {
  /** Header icon (defaults to ShieldCheck if omitted). */
  icon?: LucideIcon;
  /** e.g. "Why we collect your NRC" */
  whyTitle: string;
  /** One or two plain-language sentences on why this info is collected. */
  whyBody: string;
  /** Overrides the default "Your Privacy Matters" body copy. */
  privacyBody?: string;
  /** Overrides the default consent-checkbox sentence. */
  consentLabel?: string;
}

export const DEFAULT_PRIVACY_BODY =
  'Your information is encrypted, securely stored, and only used for verification, platform security, and legal compliance. TONSE never sells your personal information.';

export const DEFAULT_CONSENT_LABEL =
  'I understand why this information is required and consent to the collection, verification, secure storage, and processing of my information in accordance with the TONSE Privacy Policy and Terms of Service.';

export const consentConfigs: Record<string, ConsentConfig> = {
  identity: {
    icon: ShieldCheck,
    whyTitle: 'Why we collect your NRC',
    whyBody:
      'To verify your identity, protect our community, and prevent fraud — so every account belongs to a real person. One NRC means one account, which stops impersonation before it starts.',
  },
  location: {
    icon: MapPin,
    whyTitle: 'Why we ask for your location',
    whyBody:
      'To help customers discover nearby products and services and to keep delivery pricing accurate. Your exact address stays private until a buyer accepts your quote.',
  },
  credentials: {
    icon: Lock,
    whyTitle: 'Why we secure your credentials',
    whyBody:
      'To protect access to your account. Your password is hashed before it leaves your browser, and your NRC anchors secure account recovery if you ever forget it.',
  },
  business: {
    icon: Building2,
    whyTitle: 'Why we collect your business documents',
    whyBody:
      'To verify your business against the official Zambian registry (PACRA & ZRA), build buyer trust, and enable secure transactions with customers and suppliers.',
  },
  businessVerification: {
    icon: FileText,
    whyTitle: 'Why we verify your documents',
    whyBody:
      'To confirm the person and the business behind the account are genuine. A verified profile earns a trust badge that helps customers buy with confidence.',
  },
  store: {
    icon: Camera,
    whyTitle: 'Why we ask for store photos',
    whyBody:
      'To confirm you operate a real storefront and to show buyers what to expect. Clear photos speed up admin verification of your shop.',
  },
  banking: {
    icon: CreditCard,
    whyTitle: 'Why we collect payment details',
    whyBody:
      'To securely process your payouts and protect every financial transaction. Payment data is handled over encrypted channels and is never shared for marketing.',
  },
  inquiry: {
    icon: ClipboardList,
    whyTitle: 'Why we ask for these details',
    whyBody:
      'Richer detail — photos, brand, specs, and urgency — lets verified providers identify your exact need and send sharper, more accurate quotes.',
  },
  profile: {
    icon: UserCog,
    whyTitle: 'Why we keep your profile information',
    whyBody:
      'To keep your account verified and your business discoverable. Changes to identity or location details may be re-checked to protect the marketplace.',
  },
};

export type ConsentKey = keyof typeof consentConfigs;

/** Safe lookup with a generic fallback so an unknown key never crashes. */
export function resolveConsentConfig(key: string): ConsentConfig {
  return (
    consentConfigs[key] ?? {
      icon: ShieldCheck,
      whyTitle: 'Why we collect this information',
      whyBody:
        'To verify your account, keep the marketplace safe, and meet data-privacy requirements. Your information is only used for verification and platform security.',
    }
  );
}
