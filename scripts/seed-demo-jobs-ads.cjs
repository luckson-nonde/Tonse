/**
 * Seed JOB ADVERTS + SPONSORED ADS from the demo shops (the same accounts
 * seed-demo-storefront.cjs created), then optionally pay + admin-approve so
 * both boards display real content:
 *
 *   job adverts → the labour job board (post → [fee?] → admin approve → feed)
 *   sponsored ads → the AdRail slots (create → PAY → admin approve → live);
 *                   clicking one routes the viewer to the advertiser
 *                   (buyer → targeted inquiry funnel, others → shop page)
 *
 *   node scripts/seed-demo-jobs-ads.cjs [baseUrl] [--admin-email=x --admin-password=y]
 *
 * Payment reality check: ads (and job posts while the posting fee is ON) are
 * REALLY paid through the checkout engine. The simulate endpoint only works
 * when the server's PAYMENT_PROVIDER is `sandbox` — on a live DPO deploy the
 * script parks those items at PENDING_PAYMENT and says so, rather than
 * charging anyone real money.
 *
 * Idempotent: postings dedupe on (poster, title) via /job-postings/mine;
 * ads dedupe on (seller, title) via /ads/my-ads. Admin approval sweeps
 * WHATEVER is pending, so re-running after fixing payment finishes the job.
 */
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://localhost:3001';
const argOf = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};
let ADMIN_EMAIL = argOf('admin-email') || process.env.SEED_ADMIN_EMAIL;
let ADMIN_PASSWORD = argOf('admin-password') || process.env.SEED_ADMIN_PASSWORD;

// Local runs: read admin creds through dotenv, the SAME parser the server
// uses. Shell-extracted values disagree with the server whenever the
// password holds a '#' (dotenv truncates there) or the file is CRLF.
if (!ADMIN_EMAIL && /localhost|127\.0\.0\.1/.test(BASE)) {
  try {
    require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv')).config({
      path: path.join(__dirname, '..', 'backend', '.env'),
    });
    ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  } catch {
    /* no local backend checkout — fine, approvals just skip */
  }
}

const ASSETS = path.join(__dirname, '..', 'src', 'assets', 'images');
const SPECIALTY = path.join(ASSETS, 'specialty');
const CATS = path.join(ASSETS, 'categories');
const PASSWORD = 'Demo#1234';

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

// ── Auth pacing — 5/min server-side on /auth/* ─────────────────────────
let authCalls = 0;
async function login(email, password) {
  if (authCalls > 0 && authCalls % 4 === 0) {
    console.log('   …waiting out the auth throttle (62s)');
    await sleep(62000);
  }
  authCalls++;
  let res = await api('POST', '/auth/login', { email, password });
  if (res.status === 429) {
    console.log('   429 — waiting 65s and retrying');
    await sleep(65000);
    res = await api('POST', '/auth/login', { email, password });
  }
  return res.json?.accessToken ?? null;
}

/** Multipart image upload → hosted URL (spaces or local disk, per env). */
async function uploadImage(token, ...segments) {
  const file = path.join(...segments);
  const form = new FormData();
  form.append(
    'file',
    new Blob([fs.readFileSync(file)], { type: 'image/webp' }),
    path.basename(file).replace(/\s+/g, '-'),
  );
  const res = await fetch(`${BASE}/files/upload?category=ads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const raw = await res.json().catch(() => null);
  const json = raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw;
  return json?.url ?? null;
}

/** PSP checkout + sandbox settle. Returns 'paid' | 'left-pending' | 'failed'. */
async function payViaCheckout(kind, checkoutPath, token, label) {
  const co = await api('POST', checkoutPath, { channel: 'mobile-money', phone: '0955000199', operator: 'airtel' }, token);
  const ref = co.json?.reference;
  if (!ref) {
    console.log(`FAIL ${kind} checkout ${label} (${co.status}) ${JSON.stringify(co.json).slice(0, 120)}`);
    return 'failed';
  }
  const sim = await api('POST', `/payments/checkout/${encodeURIComponent(ref)}/simulate`, { outcome: 'successful' }, token);
  if (sim.json?.handled) return 'paid';
  // Live PSP (dpo): simulate is refused by design — leave it pending, loudly.
  console.log(`— ${kind} '${label}' awaits REAL payment (provider is live; simulate refused ${sim.status})`);
  return 'left-pending';
}

const deadline = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

/** Vacancy attribute bundles mirror what VacancyComposerForm writes, so the
 *  job cards render the full letter-first layout: responsibilities, minimum
 *  requirements, documents, the urgency pair — all of it. */
const JOBS = [
  {
    email: 'demo.labour@nyuwe.demo',
    postings: [
      {
        title: 'Experienced Bricklayers — Housing Project (Chalala)',
        description:
          'Mulungushi Works Crew is expanding its site teams for a 40-unit housing development in Chalala. We are looking for bricklayers who can read simple drawings, keep clean courses, and work to programme.',
        tradeCategoryIds: ['bricklayer'],
        workersNeeded: 6,
        payOffer: 350,
        payRateUnit: 'Per Day',
        applicationDeadline: deadline(21),
        location: 'Chalala, Lusaka',
        province: 'Lusaka',
        city: 'Lusaka',
        attributes: {
          postShape: 'vacancy',
          urgency: 'Immediately',
          employment_type: 'Contract',
          resp_list: [
            'Set out and lay block courses to line and level',
            'Mix and apply mortar to specification',
            'Keep the work area safe and materials accounted for',
          ],
          min_requirements: [
            '3+ years on residential sites',
            'Able to read basic setting-out drawings',
            'Two contactable references from previous foremen',
          ],
          req_experience: '3+ years',
          req_own_tools: true,
          req_documents: ['NRC / National ID', 'CV / Résumé'],
        },
      },
      {
        title: 'Certified Electrician — Commercial Fit-Outs',
        description:
          'We wire shop and office fit-outs across Lusaka CBD. You will run conduit, terminate DBs, and test installations under our site supervisor. EIZ registration is a must — clients audit our teams.',
        tradeCategoryIds: ['electrician'],
        workersNeeded: 2,
        payOffer: 6500,
        payRateUnit: 'Per Month',
        applicationDeadline: deadline(30),
        location: 'CBD, Lusaka',
        province: 'Lusaka',
        city: 'Lusaka',
        attributes: {
          postShape: 'vacancy',
          urgency: 'Immediately',
          employment_type: 'Full-time',
          resp_list: [
            'First-fix and second-fix wiring on commercial fit-outs',
            'Terminate and label distribution boards',
            'Test, record and hand over installations',
          ],
          min_requirements: [
            'TEVETA craft certificate or equivalent',
            'EIZ registration',
            '5+ years commercial experience',
          ],
          req_experience: '5+ years',
          req_certifications: 'EIZ registration',
          req_documents: ['NRC / National ID', 'Grade 12 Certificate', 'CV / Résumé'],
        },
      },
    ],
  },
  {
    email: 'demo.construction@nyuwe.demo',
    postings: [
      {
        title: 'Forklift Operator — Builders Yard (Makeni)',
        description:
          'Buildmart Zambia needs a certified forklift operator for our Makeni yard: offloading cement trucks, staging customer orders, and daily equipment checks. Straight shifts, overtime paid.',
        tradeCategoryIds: ['forklift_operator'],
        workersNeeded: 1,
        payOffer: 4200,
        payRateUnit: 'Per Month',
        applicationDeadline: deadline(14),
        location: 'Makeni, Lusaka',
        province: 'Lusaka',
        city: 'Lusaka',
        attributes: {
          postShape: 'vacancy',
          urgency: 'Immediately',
          employment_type: 'Full-time',
          resp_list: [
            'Offload and stage inbound building materials',
            'Pick and load customer orders safely',
            'Daily pre-start checks and defect reporting',
          ],
          min_requirements: ['Valid forklift operator permit', '1+ years yard experience'],
          req_experience: '1+ years',
          req_certifications: 'Forklift operator permit',
          req_documents: ['NRC / National ID', "Driver's Licence"],
        },
      },
    ],
  },
  {
    email: 'demo.groceries@nyuwe.demo',
    postings: [
      {
        title: 'Delivery Riders — Grocery Orders (Soweto Market)',
        description:
          'Soweto Fresh Market delivers grocery boxes across Lusaka. We need reliable riders with their own motorcycles for daily routes — fuel and airtime allowance on top of the daily rate.',
        tradeCategoryIds: ['delivery_rider'],
        workersNeeded: 4,
        payOffer: 250,
        payRateUnit: 'Per Day',
        applicationDeadline: deadline(14),
        location: 'Soweto Market, Lusaka',
        province: 'Lusaka',
        city: 'Lusaka',
        attributes: {
          postShape: 'vacancy',
          urgency: 'Immediately',
          employment_type: 'Casual / Piece work',
          pay_note: 'Daily rate plus fuel and airtime allowance',
          resp_list: [
            'Collect packed orders and deliver on assigned routes',
            'Confirm deliveries in the app and return payments',
            'Keep the delivery box clean and food-safe',
          ],
          min_requirements: ['Own motorcycle in roadworthy condition', "Valid rider's licence", 'Smartphone'],
          req_experience: '1+ years',
          req_own_tools: true,
          req_documents: ['NRC / National ID', "Driver's Licence"],
        },
      },
    ],
  },
  {
    email: 'demo.pastry-bakery@nyuwe.demo',
    postings: [
      {
        title: 'Pastry Cook — Early Shift (Sunrise Bakery)',
        description:
          'Sunrise Bakery Lusaka bakes through the night for morning trade. We are hiring a pastry cook for the 03:00 shift: laminated doughs, bread rolls, and finishing custom cake bases.',
        tradeCategoryIds: ['cook'],
        workersNeeded: 1,
        payOffer: 3800,
        payRateUnit: 'Per Month',
        applicationDeadline: deadline(21),
        location: 'Kamwala, Lusaka',
        province: 'Lusaka',
        city: 'Lusaka',
        attributes: {
          postShape: 'vacancy',
          urgency: 'On a specific date & time',
          preferredDateTime: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 16),
          employment_type: 'Full-time',
          resp_list: [
            'Prepare doughs and pastries to our recipes',
            'Run the early-shift ovens to the bake plan',
            'Keep HACCP records current',
          ],
          min_requirements: ['Food handler certificate', '3+ years bakery experience'],
          req_experience: '3+ years',
          req_certifications: 'Food handler certificate',
          req_documents: ['NRC / National ID', 'CV / Résumé'],
        },
      },
    ],
  },
  {
    email: 'demo.apartments@nyuwe.demo',
    postings: [
      {
        title: 'Housekeeper — Serviced Apartments (Kabulonga)',
        description:
          'Kabulonga Stays runs short-stay serviced apartments. We need a housekeeper who takes pride in hotel-standard turnarounds: linen, bathrooms, kitchenettes, and guest-ready presentation.',
        tradeCategoryIds: ['house_cleaner'],
        workersNeeded: 2,
        payOffer: 2800,
        payRateUnit: 'Per Month',
        applicationDeadline: deadline(21),
        location: 'Kabulonga, Lusaka',
        province: 'Lusaka',
        city: 'Lusaka',
        attributes: {
          postShape: 'vacancy',
          urgency: 'Immediately',
          employment_type: 'Full-time',
          resp_list: [
            'Full turnarounds between guest stays',
            'Linen, laundry and inventory management',
            'Report maintenance issues same-day',
          ],
          min_requirements: ['1+ years housekeeping (lodge or hotel preferred)', 'Contactable references'],
          req_experience: '1+ years',
          req_documents: ['NRC / National ID'],
        },
      },
    ],
  },
  {
    email: 'demo.events@nyuwe.demo',
    postings: [
      {
        title: 'Event Setup Crew — Weekend Work',
        description:
          'Savanna Events Co. sets up weddings and corporate functions every weekend. We keep a pool of reliable general labourers for rigging, furniture, and strike-down. Work is physical and fast.',
        tradeCategoryIds: ['general_labourer', 'loader'],
        workersNeeded: 10,
        payOffer: 300,
        payRateUnit: 'Per Day',
        applicationDeadline: deadline(30),
        location: 'Showgrounds, Lusaka',
        province: 'Lusaka',
        city: 'Lusaka',
        attributes: {
          postShape: 'vacancy',
          urgency: 'Immediately',
          employment_type: 'Casual / Piece work',
          resp_list: [
            'Load, transport and place event furniture and staging',
            'Assist riggers with tents and lighting trusses',
            'Strike down and pack the warehouse after events',
          ],
          min_requirements: ['Physically fit', 'Available Friday–Sunday', 'Team player'],
          req_documents: ['NRC / National ID'],
        },
      },
    ],
  },
  {
    email: 'demo.machinery-hire@nyuwe.demo',
    postings: [
      {
        title: 'Heavy Duty Driver — Lowbed & Tipper (Cross-Province)',
        description:
          'Zambezi Plant Hire moves excavators and graders between sites across Zambia. We need a heavy duty driver with lowbed experience and a clean record for cross-province machine moves.',
        tradeCategoryIds: ['driver_heavy'],
        workersNeeded: 2,
        payOffer: 7500,
        payRateUnit: 'Per Month',
        applicationDeadline: deadline(30),
        location: 'Industrial Area, Lusaka',
        province: 'Lusaka',
        city: 'Lusaka',
        attributes: {
          postShape: 'vacancy',
          urgency: 'Immediately',
          employment_type: 'Full-time',
          resp_list: [
            'Move plant between sites on the lowbed',
            'Chain down and secure machines to standard',
            'Keep trip logs and daily inspection sheets',
          ],
          min_requirements: ['Valid CE licence', '5+ years heavy haulage', 'Clean driving record'],
          req_experience: '5+ years',
          req_documents: ['NRC / National ID', "Driver's Licence", 'CV / Résumé'],
        },
      },
    ],
  },
  {
    email: 'demo.agriculture@nyuwe.demo',
    postings: [
      {
        title: 'Seasonal Farm Workers — Harvest (Chisamba)',
        description:
          'Chisamba Agro Supplies is recruiting a harvest crew for partner farms this season. Accommodation on site, transport from Chisamba township, and piece-work bonuses for high pickers.',
        tradeCategoryIds: ['farm_worker', 'crop_harvesting'],
        workersNeeded: 20,
        payOffer: 180,
        payRateUnit: 'Per Day',
        applicationDeadline: deadline(14),
        location: 'Chisamba',
        province: 'Central',
        city: 'Chisamba',
        attributes: {
          postShape: 'vacancy',
          urgency: 'On a specific date & time',
          preferredDateTime: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
          employment_type: 'Seasonal',
          pay_note: 'Daily rate plus piece-work bonus per crate over target',
          resp_list: [
            'Harvest, sort and crate produce to grade',
            'Field hygiene and careful handling',
            'Load collection vehicles',
          ],
          min_requirements: ['Able-bodied and willing to work outdoors', 'Available for the full season'],
          req_documents: ['NRC / National ID'],
        },
      },
    ],
  },
];

/** Sponsored ads — one strong image each, placed on the homepage banner, the
 *  secondary sidebar, and the category rail TARGETED at the shop's own
 *  category (labour's ad lands on the job-posting funnel rails). */
const ADS = [
  { email: 'demo.electronics@nyuwe.demo', title: 'PS5 Bundles in Stock — Kwacha Gadget Hub', img: [SPECIALTY, 'electronics', 'gaming-sell.webp'], target: 'electronics', placements: ['HOMEPAGE_CENTER', 'CATEGORY_SIDEBAR'] },
  { email: 'demo.fashion@nyuwe.demo', title: 'New Chitenge Drops — Kamwala Threads', img: [SPECIALTY, 'Fashion', "Women's Clothing.webp"], target: 'fashion', placements: ['HOMEPAGE_CENTER', 'CATEGORY_SIDEBAR'] },
  { email: 'demo.machinery-hire@nyuwe.demo', title: 'Excavators from K8,500/day — Zambezi Plant Hire', img: [SPECIALTY, 'machinery-hire', 'Excavator.webp'], target: 'machinery-hire', placements: ['CATEGORY_SIDEBAR', 'SECONDARY_SIDEBAR'] },
  { email: 'demo.events@nyuwe.demo', title: 'Garden Weddings — Savanna Events Co.', img: [SPECIALTY, 'events', 'event-venues.webp'], target: 'events', placements: ['CATEGORY_SIDEBAR', 'SECONDARY_SIDEBAR'] },
  { email: 'demo.groceries@nyuwe.demo', title: 'Weekly Produce Boxes — Soweto Fresh Market', img: [SPECIALTY, 'groceries', 'fresh-produce.webp'], target: 'groceries', placements: ['HOMEPAGE_CENTER', 'CATEGORY_SIDEBAR'] },
  { email: 'demo.entertainment@nyuwe.demo', title: 'Book a DJ This Weekend — Ngoma Entertainment', img: [SPECIALTY, 'entertainment', 'DJs.webp'], target: 'entertainment', placements: ['CATEGORY_SIDEBAR', 'SECONDARY_SIDEBAR'] },
  { email: 'demo.labour@nyuwe.demo', title: 'Vetted Site Crews — Mulungushi Works', img: [CATS, 'Construction & Building.webp'], target: 'labour', placements: ['CATEGORY_SIDEBAR', 'SECONDARY_SIDEBAR'] },
  { email: 'demo.loans@nyuwe.demo', title: 'Salary Loans up to K50,000 — Pamodzi', img: [SPECIALTY, 'loans', 'loan-salary.webp'], target: 'loans', placements: ['HOMEPAGE_CENTER', 'SECONDARY_SIDEBAR'] },
];

(async () => {
  const tokens = {};
  const emails = [...new Set([...JOBS.map((j) => j.email), ...ADS.map((a) => a.email)])];
  for (const email of emails) {
    tokens[email] = await login(email, PASSWORD);
    if (!tokens[email]) console.log(`FAIL login ${email}`);
  }

  // ── Job adverts ──────────────────────────────────────────────────────
  let jobsCreated = 0;
  for (const shop of JOBS) {
    const token = tokens[shop.email];
    if (!token) continue;
    const mine = await api('GET', '/job-postings/mine', null, token);
    const have = new Set((Array.isArray(mine.json) ? mine.json : []).map((p) => p.title));
    for (const posting of shop.postings) {
      if (have.has(posting.title)) {
        console.log(`— job '${posting.title}' already exists, skipping`);
        continue;
      }
      const res = await api('POST', '/job-postings', posting, token);
      const ok = res.status === 201 || res.status === 200;
      console.log(`${ok ? 'ok ' : 'FAIL'} job ${posting.title} (${res.status})${ok ? ` → ${res.json?.status}` : ' ' + JSON.stringify(res.json).slice(0, 140)}`);
      if (!ok) continue;
      jobsCreated++;
      if (res.json?.status === 'PENDING_PAYMENT') {
        await payViaCheckout('job', `/job-postings/${res.json.id}/checkout`, token, posting.title);
      }
    }
  }

  // ── Sponsored ads ────────────────────────────────────────────────────
  let adsCreated = 0;
  for (const ad of ADS) {
    const token = tokens[ad.email];
    if (!token) continue;
    const mine = await api('GET', '/ads/my-ads', null, token);
    const have = new Set((Array.isArray(mine.json) ? mine.json : []).map((a) => a.title));
    if (have.has(ad.title)) {
      console.log(`— ad '${ad.title}' already exists, skipping`);
      continue;
    }
    const mediaUrl = await uploadImage(token, ...ad.img);
    if (!mediaUrl) {
      console.log(`FAIL upload for ad '${ad.title}'`);
      continue;
    }
    const res = await api('POST', '/ads/create', {
      title: ad.title,
      mediaType: 'IMAGE',
      mediaUrl,
      placements: ad.placements,
      ...(ad.placements.includes('CATEGORY_SIDEBAR') ? { targetCategoryId: ad.target } : {}),
      startDate: deadline(0),
      endDate: deadline(13), // 14-day campaign
    }, token);
    const ok = res.status === 201 || res.status === 200;
    console.log(`${ok ? 'ok ' : 'FAIL'} ad ${ad.title} (${res.status})${ok ? '' : ' ' + JSON.stringify(res.json).slice(0, 140)}`);
    if (!ok) continue;
    adsCreated++;
    await payViaCheckout('ad', `/ads/${res.json.id}/checkout`, token, ad.title);
  }

  // ── Admin approval sweep (optional) ──────────────────────────────────
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!adminToken) {
      console.log('FAIL admin login — approvals skipped');
    } else {
      const pendingJobs = await api('GET', '/admin/job-postings/pending', null, adminToken);
      for (const p of Array.isArray(pendingJobs.json) ? pendingJobs.json : []) {
        const r = await api('POST', `/admin/job-postings/${p.id}/approve`, {}, adminToken);
        console.log(`${r.status < 300 ? 'ok ' : 'FAIL'} approve job '${p.title}' (${r.status})`);
      }
      const pendingAds = await api('GET', '/admin/ads/pending', null, adminToken);
      for (const a of Array.isArray(pendingAds.json) ? pendingAds.json : []) {
        const r = await api('POST', `/admin/ads/${a.id}/approve`, {}, adminToken);
        console.log(`${r.status < 300 ? 'ok ' : 'FAIL'} approve ad '${a.title}' (${r.status})`);
      }
    }
  } else {
    console.log('\n(no --admin-email/--admin-password — pending items await approval in the admin UI)');
  }

  const feed = await api('GET', '/ads/active?placement=HOMEPAGE_CENTER');
  console.log(`\ncreated ${jobsCreated} job adverts, ${adsCreated} ads | homepage ads now live: ${Array.isArray(feed.json) ? feed.json.length : '?'}`);
})().catch((e) => {
  console.error('SEED ERROR', e);
  process.exit(1);
});
