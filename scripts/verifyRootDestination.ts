/**
 * Verifies the "/" routing policy (src/utils/rootDestination.ts).
 *
 * The rule this protects: when an admin has the landing page switched on, it
 * shows EVERY time — signed in or not, phone or desktop, first visit or
 * hundredth. It regressed once by being reachable only for logged-out desktop
 * visitors who had already dismissed the onboarding slideshow, which made the
 * front door look like it came and went at random. Every way it could fail to
 * show has a case below.
 *
 * Run by `npm run lint`, alongside verifyArchetypes.
 */
import { resolveRootDestination, type RootDestinationInput } from '../src/utils/rootDestination';

const BUYER = { role: 'BUYER' as const };
const SELLER = { role: 'SELLER' as const };
const ADMIN = { role: 'ADMIN' as const };

const base: RootDestinationInput = {
  authLoading: false,
  user: null,
  landingEnabled: false,
  landingLoading: false,
  isMobile: false,
  onboarded: true,
};

let pass = 0;
let fail = 0;

function expect(label: string, input: Partial<RootDestinationInput>, want: string) {
  const got = resolveRootDestination({ ...base, ...input });
  const actual = got.kind === 'wait' ? 'wait' : got.to;
  const ok = actual === want;
  if (!ok) {
    console.error(`FAIL  ${label}\n        got ${actual}, want ${want}`);
    fail++;
  } else {
    pass++;
  }
}

// ── landing page ON: must show every single time ──
expect('guest, desktop', { landingEnabled: true }, '/discover');
expect('guest, mobile, never onboarded', { landingEnabled: true, isMobile: true, onboarded: false }, '/discover');
expect('guest, mobile, onboarded', { landingEnabled: true, isMobile: true, onboarded: true }, '/discover');
expect('signed-in buyer', { landingEnabled: true, user: BUYER }, '/discover');
expect('signed-in seller', { landingEnabled: true, user: SELLER }, '/discover');
expect('signed-in admin', { landingEnabled: true, user: ADMIN }, '/discover');
expect(
  'signed-in buyer on mobile, never onboarded',
  { landingEnabled: true, user: BUYER, isMobile: true, onboarded: false },
  '/discover',
);
expect(
  'known-on from a previous visit, server not answered yet',
  { landingEnabled: true, landingLoading: true },
  '/discover',
);
expect(
  'known-on, signed in, server still answering',
  { landingEnabled: true, landingLoading: true, user: SELLER },
  '/discover',
);

// ── the one thing that outranks it ──
expect(
  'temporary password must be changed first',
  { landingEnabled: true, user: { ...ADMIN, mustChangePassword: true } },
  '/force-password-change',
);

// ── never guess "off" while the answer is still in flight ──
expect('unknown flag, guest — wait rather than strand on /login', { landingLoading: true }, 'wait');
expect('unknown flag, signed in — wait rather than skip it', { landingLoading: true, user: BUYER }, 'wait');
expect('auth still resolving', { authLoading: true, landingEnabled: true }, 'wait');

// ── landing page OFF: unchanged from before it existed ──
expect('guest -> login', {}, '/login');
expect('mobile first run -> onboarding', { isMobile: true, onboarded: false }, '/onboarding');
expect('mobile, already onboarded, guest -> login', { isMobile: true, onboarded: true }, '/login');
expect('buyer -> buyer dashboard', { user: BUYER }, '/buyer');
expect('seller -> provider dashboard', { user: SELLER }, '/provider');
expect('admin -> admin', { user: ADMIN }, '/admin');
expect(
  'temporary password still wins when landing is off',
  { user: { ...BUYER, mustChangePassword: true } },
  '/force-password-change',
);

// ── no destination is "/" itself, which would loop forever ──
const everyCase: Partial<RootDestinationInput>[] = [
  { landingEnabled: true },
  { landingEnabled: true, user: BUYER },
  { landingEnabled: true, user: SELLER, isMobile: true, onboarded: false },
  {},
  { user: BUYER },
  { user: SELLER },
  { user: ADMIN },
  { isMobile: true, onboarded: false },
  { user: { ...BUYER, mustChangePassword: true } },
];
const loops = everyCase
  .map((c) => resolveRootDestination({ ...base, ...c }))
  .filter((d) => d.kind === 'redirect' && d.to === '/');
if (loops.length > 0) {
  console.error('FAIL  a case redirects "/" back to "/" — infinite loop');
  fail++;
} else {
  pass++;
}

if (fail > 0) {
  console.error(`\nRoot destination policy: ${pass} passed, ${fail} FAILED`);
  process.exit(1);
}
console.log(`Root destination policy verified (${pass} cases).`);
