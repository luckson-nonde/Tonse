/**
 * Seed REAL job postings through the actual job-board pipeline — create as
 * a poster, pay if a posting fee is active, approve as admin — so the new
 * public "Employment" surface on /discover has genuine content instead of
 * an empty state. Companion to scripts/seed-demo-storefront.cjs, same
 * conventions (register-or-login, throttle-aware, idempotent re-runs).
 *
 *   node scripts/seed-demo-jobpostings.cjs [baseUrl]
 *
 * Approval needs an admin session. Supply one via env vars — never as a
 * CLI arg, which would sit in shell history and the process list:
 *
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node scripts/seed-demo-jobpostings.cjs [baseUrl]
 *
 * Without them, postings are created (and paid, if a fee is active) but
 * left PENDING_APPROVAL — approve manually in the admin UI, or re-run this
 * script later with the env vars set (idempotent: existing postings are
 * matched by title and only approved, never recreated).
 *
 * Poster: the same demo.buyer@nyuwe.demo account seed-demo-storefront.cjs
 * already establishes — posting a job needs no special role (any
 * authenticated user may post; see job-board.controller.ts's own comment).
 */
const BASE = process.argv[2] || 'http://localhost:3001';
const POSTER_EMAIL = 'demo.buyer@nyuwe.demo';
const POSTER_PASSWORD = 'Demo#1234';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

async function api(method, p, body, token) {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.json().catch(() => null);
  return { status: res.status, json: raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tokenOf = (j) => j?.accessToken || j?.token || j?.tokens?.accessToken;

/** Auth endpoints share a 5/min throttle — pace every call. */
let authCalls = 0;
async function authApi(p, body) {
  if (authCalls > 0 && authCalls % 4 === 0) {
    console.log('   …waiting out the auth throttle (62s)');
    await sleep(62000);
  }
  authCalls++;
  let res = await api('POST', p, body);
  if (res.status === 429) {
    console.log('   429 — waiting 65s and retrying');
    await sleep(65000);
    res = await api('POST', p, body);
  }
  return res;
}

async function login(email, password) {
  const res = await authApi('/auth/login', { email, password });
  return tokenOf(res.json);
}

/** Real vacancies, each shaped to match what VacancyComposerForm submits
 *  (postShape:'vacancy' + resp_list/min_requirements/employment_type/
 *  pay_note in attributes) so JobAttributesDisplay renders a proper ad
 *  body, not the legacy flat-specs fallback. */
const VACANCIES = [
  {
    title: 'Carpenter — Site Crew',
    trades: ['carpenter'],
    description:
      'Joining a residential construction crew in Lusaka for the next phase of a housing development. Steady work, tools provided on site.',
    workersNeeded: 2,
    payOffer: 350,
    payRateUnit: 'Per Day',
    location: 'Woodlands, Lusaka',
    province: 'Lusaka',
    city: 'Lusaka',
    attributes: {
      postShape: 'vacancy',
      resp_list: [
        'Frame and fit roof trusses, door frames and window frames',
        'Read and work from architectural drawings',
        'Work safely alongside the bricklaying and roofing crews',
      ],
      min_requirements: ['3+ years carpentry experience', 'Own hand tools', "Grade 12 Certificate"],
      employment_type: 'Contract',
      pay_note: 'Daily rate, paid weekly on Fridays',
      req_experience: '3-5 years',
      req_own_tools: true,
      req_documents: ['NRC / National ID', 'CV / Résumé'],
    },
  },
  {
    title: 'Electrician — Residential Wiring',
    trades: ['electrician'],
    description:
      'Licensed electrician needed for new-build residential wiring in Kabulonga — first fix through to certification.',
    workersNeeded: 1,
    payOffer: 6500,
    payRateUnit: 'Per Month',
    location: 'Kabulonga, Lusaka',
    province: 'Lusaka',
    city: 'Lusaka',
    attributes: {
      postShape: 'vacancy',
      resp_list: [
        'First and second fix wiring on new-build homes',
        'Install and test distribution boards',
        'Sign off work against the Zambian wiring code',
      ],
      min_requirements: ["TEVETA electrical trade certificate", '2+ years post-qualification experience'],
      employment_type: 'Full-time',
      req_experience: '1-3 years',
      req_certifications: 'TEVETA electrical trade certificate',
      req_documents: ['Trade certificate', 'NRC / National ID'],
    },
  },
  {
    title: 'General Labourer — Construction Site',
    trades: ['general_labourer'],
    description:
      'General labourers needed for an active construction site in Ndola — mixing, carrying materials, site cleanup.',
    workersNeeded: 5,
    payOffer: 150,
    payRateUnit: 'Per Day',
    location: 'Ndola',
    province: 'Copperbelt',
    city: 'Ndola',
    attributes: {
      postShape: 'vacancy',
      resp_list: ['Mix and carry building materials', 'Assist tradespeople as directed', 'Keep the site clean and safe'],
      min_requirements: ['Physically fit', 'Able to start immediately'],
      employment_type: 'Casual / Piece work',
      pay_note: 'Cash paid daily at close of work',
      req_documents: ['NRC / National ID'],
    },
  },
  {
    title: 'Warehouse Team — Logistics Hub',
    trades: ['warehouse_worker', 'forklift_operator'],
    description:
      'A logistics hub in Kitwe is hiring warehouse staff for picking, packing and forklift work. Training given on-site.',
    workersNeeded: 4,
    payOffer: 3200,
    payRateUnit: 'Per Month',
    location: 'Kitwe',
    province: 'Copperbelt',
    city: 'Kitwe',
    attributes: {
      postShape: 'vacancy',
      resp_list: ['Pick and pack outbound orders', 'Operate a forklift once certified', 'Maintain stock accuracy in the warehouse system'],
      min_requirements: ['Grade 12 Certificate', 'Comfortable with physical work'],
      employment_type: 'Full-time',
      req_documents: ['Grade 12 Certificate', 'CV / Résumé'],
    },
  },
  {
    title: 'House Cleaner — Full-Time',
    trades: ['house_cleaner'],
    description:
      'A family in Ibex Hill is looking for a full-time house cleaner — general housekeeping, laundry, ironing.',
    workersNeeded: 1,
    payOffer: 1800,
    payRateUnit: 'Per Month',
    location: 'Ibex Hill, Lusaka',
    province: 'Lusaka',
    city: 'Lusaka',
    attributes: {
      postShape: 'vacancy',
      resp_list: ['General house cleaning, 6 days a week', 'Laundry and ironing', 'Light meal preparation on request'],
      min_requirements: ['3+ years experience', 'Contactable references'],
      employment_type: 'Full-time',
      req_documents: ['NRC / National ID', 'References'],
    },
  },
  {
    title: 'Delivery Riders — Motorcycle Fleet',
    trades: ['delivery_rider'],
    description:
      'An e-commerce delivery service in Lusaka is expanding its rider fleet — own motorcycle preferred, company bikes available for the right candidates.',
    workersNeeded: 6,
    payOffer: 120,
    payRateUnit: 'Per Day',
    location: 'Lusaka',
    province: 'Lusaka',
    city: 'Lusaka',
    attributes: {
      postShape: 'vacancy',
      resp_list: ['Collect and deliver parcels on assigned routes', 'Confirm deliveries via the rider app', 'Handle customer payments on delivery'],
      min_requirements: ["Valid motorcycle licence", 'Smartphone with data'],
      employment_type: 'Casual / Piece work',
      pay_note: 'Base rate plus per-delivery bonus',
      req_documents: ["Driver's Licence", 'NRC / National ID'],
    },
  },
  {
    title: 'Farm Workers — Harvest Season',
    trades: ['farm_worker', 'crop_harvesting'],
    description:
      'Seasonal farm workers needed for the harvest on a commercial farm outside Chisamba. Accommodation available.',
    workersNeeded: 10,
    payOffer: 130,
    payRateUnit: 'Per Day',
    location: 'Chisamba',
    province: 'Central',
    city: 'Chisamba',
    attributes: {
      postShape: 'vacancy',
      resp_list: ['Harvest and sort produce by hand', 'Load produce for transport', 'Follow farm safety procedures'],
      min_requirements: ['Able to work outdoors', 'Available for the full harvest period'],
      employment_type: 'Seasonal',
      pay_note: 'On-farm accommodation and one meal a day included',
      req_documents: ['NRC / National ID'],
    },
  },
];

(async () => {
  console.log(`Seeding job postings against ${BASE}`);

  const posterToken = await login(POSTER_EMAIL, POSTER_PASSWORD);
  if (!posterToken) {
    console.error(`FAIL: could not log in as poster ${POSTER_EMAIL} — run seed-demo-storefront.cjs first.`);
    process.exit(1);
  }

  let adminToken = null;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!adminToken) console.log(`— admin login failed for ${ADMIN_EMAIL}; postings will be left PENDING_APPROVAL.`);
  } else {
    console.log('— no SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD set; postings will be left PENDING_APPROVAL.');
  }

  // Idempotency: postings this poster already created, matched by title —
  // a re-run tops up approval status without ever creating a duplicate.
  const mine = await api('GET', '/job-postings/mine', null, posterToken);
  const existingByTitle = new Map((mine.json ?? []).map((p) => [p.title, p]));

  let created = 0;
  let approved = 0;
  let failed = 0;

  for (const v of VACANCIES) {
    let posting = existingByTitle.get(v.title);

    if (!posting) {
      const res = await api(
        'POST',
        '/job-postings',
        {
          title: v.title,
          description: v.description,
          tradeCategoryIds: v.trades,
          workersNeeded: v.workersNeeded,
          payOffer: v.payOffer,
          payRateUnit: v.payRateUnit,
          location: v.location,
          province: v.province,
          city: v.city,
          attributes: v.attributes,
        },
        posterToken,
      );
      if (res.status !== 201 && res.status !== 200) {
        console.log(`FAIL create "${v.title}" (${res.status}) ${JSON.stringify(res.json).slice(0, 160)}`);
        failed++;
        continue;
      }
      posting = res.json;
      created++;
      console.log(`ok   created "${v.title}" → ${posting.status}`);

      // A posting fee may be active — pay from the poster's venture balance
      // (no PSP round-trip) so the review queue actually sees it. Free-tier
      // environments skip straight to PENDING_APPROVAL and this is a no-op.
      if (posting.status === 'PENDING_PAYMENT') {
        const pay = await api('POST', `/job-postings/${posting.id}/pay-from-balance`, null, posterToken);
        if (pay.status === 201 || pay.status === 200) {
          posting = pay.json;
          console.log(`ok   paid "${v.title}" → ${posting.status}`);
        } else {
          console.log(`FAIL pay "${v.title}" (${pay.status}) ${JSON.stringify(pay.json).slice(0, 160)} — insufficient venture balance? Approve manually once paid.`);
        }
      }
    } else {
      console.log(`—    "${v.title}" already exists → ${posting.status}`);
    }

    if (posting.status === 'PENDING_APPROVAL' && adminToken) {
      const res = await api('POST', `/admin/job-postings/${posting.id}/approve`, null, adminToken);
      if (res.status === 201 || res.status === 200) {
        approved++;
        console.log(`ok   approved "${v.title}"`);
      } else {
        console.log(`FAIL approve "${v.title}" (${res.status}) ${JSON.stringify(res.json).slice(0, 160)}`);
      }
    }
  }

  console.log(`\ncreated ${created}, approved ${approved}, failed ${failed}`);

  const feed = await api('GET', '/job-postings/public');
  console.log(`public feed now: ${Array.isArray(feed.json) ? feed.json.length : 0} open posting(s)`);
})().catch((e) => {
  console.error('SEED ERROR', e);
  process.exit(1);
});
