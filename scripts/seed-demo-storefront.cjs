/**
 * Seed the TEMPLATE DEMO ACCOUNTS — one seller per landing-page category,
 * each with image-rich products, plus a demo buyer whose direct purchases
 * light up salesCount so the best-sellers band and Trending sort have real
 * signal. See scripts/DEMO_ACCOUNTS.md for the account list.
 *
 *   node scripts/seed-demo-storefront.cjs [baseUrl]     (default :3001)
 *
 * Naming is DETERMINISTIC so the accounts double as test templates:
 *   email    demo.<category>@nyuwe.demo   (buyer: demo.buyer@nyuwe.demo)
 *   password Demo#1234                    (every demo account)
 *   phone    0955000101, 0955000102, …    nrc  900001/10/1, 900002/10/1, …
 *
 * Safe to re-run: an already-registered account is detected (register
 * conflict → login succeeds) and skipped entirely, so products and purchase
 * counts never duplicate. API-only — point it at any environment.
 * Registration is throttled 5/min server-side → batches of 4 with 62s waits.
 */
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:3001';
const ASSETS = path.join(__dirname, '..', 'src', 'assets', 'images');
const SPECIALTY = path.join(ASSETS, 'specialty');
const CATS = path.join(ASSETS, 'categories');
const PASSWORD = 'Demo#1234';

let seq = 0;
const nextSeq = () => ++seq;

function dataUrl(...segments) {
  const file = path.join(...segments);
  const ext = path.extname(file).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

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

/** One seller per master category. img: path segments under assets/images. */
const SELLERS = [
  {
    slug: 'electronics', category: 'electronics', shop: 'Kwacha Gadget Hub',
    products: [
      { name: 'HP EliteBook 840 G8 — 16GB / 512GB SSD', price: 14500, originalPrice: 16800, stock: 8, cat: 'Electronics', brand: 'HP', img: [SPECIALTY, 'electronics', 'laptops-both.webp'] },
      { name: 'JBL PartyBox 110 Bluetooth Speaker', price: 5200, stock: 12, cat: 'Electronics', brand: 'JBL', img: [SPECIALTY, 'electronics', 'audio-video-sell.webp'] },
      { name: 'PlayStation 5 Console + 2 Controllers', price: 13900, originalPrice: 15500, stock: 5, cat: 'Electronics', brand: 'Sony', img: [SPECIALTY, 'electronics', 'gaming-sell.webp'] },
      { name: 'Hisense 4-Plate Electric Stove', price: 4300, stock: 10, cat: 'Electronics', brand: 'Hisense', img: [SPECIALTY, 'electronics', 'home-appliances-sell.webp'] },
    ],
  },
  {
    slug: 'machinery-hire', category: 'machinery-hire', shop: 'Zambezi Plant Hire',
    products: [
      { name: 'CAT 320 Excavator — Daily Hire', price: 8500, stock: 3, cat: 'Heavy Machinery for Hire', img: [SPECIALTY, 'machinery-hire', 'Excavator.webp'] },
      { name: '25-Tonne Mobile Crane — Daily Hire', price: 12000, stock: 2, cat: 'Heavy Machinery for Hire', img: [SPECIALTY, 'machinery-hire', 'Mobile Crane.webp'] },
      { name: '30-Tonne Tipper Truck — Daily Hire', price: 5500, originalPrice: 6500, stock: 6, cat: 'Heavy Machinery for Hire', img: [SPECIALTY, 'machinery-hire', 'Tipper Truck.webp'] },
      { name: '3-Tonne Forklift — Daily Hire', price: 3200, stock: 4, cat: 'Heavy Machinery for Hire', img: [SPECIALTY, 'machinery-hire', 'Forklift.webp'] },
    ],
  },
  {
    slug: 'clinical-services', category: 'clinical-services', shop: 'Lusaka Care Diagnostics',
    products: [
      { name: 'Full Blood Count Lab Panel', price: 350, stock: 100, cat: 'Clinical Services', img: [SPECIALTY, 'Clinical Services', 'Hospital Labs.webp'] },
      { name: 'Prescription Fulfilment & Delivery', price: 150, stock: 100, cat: 'Clinical Services', img: [SPECIALTY, 'Clinical Services', 'Pharmacies.webp'] },
    ],
  },
  {
    slug: 'events', category: 'events', shop: 'Savanna Events Co.',
    products: [
      { name: 'Garden Wedding Venue — Full Day', price: 18000, stock: 4, cat: 'Events', img: [SPECIALTY, 'events', 'event-venues.webp'] },
      { name: 'Full Catering Package — 100 Guests', price: 22000, originalPrice: 25000, stock: 6, cat: 'Events', img: [SPECIALTY, 'events', 'Event Catering.webp'] },
      { name: 'Premium Decor & Styling Package', price: 9500, stock: 8, cat: 'Events', img: [SPECIALTY, 'events', 'Event Decor.webp'] },
      { name: 'PA System & Stage Equipment Rental', price: 4800, stock: 5, cat: 'Events', img: [SPECIALTY, 'events', 'event-equipment-rental.webp'] },
    ],
  },
  {
    slug: 'apartments', category: 'apartments', shop: 'Kabulonga Stays',
    products: [
      { name: 'Serviced Apartment — Short Stay / Night', price: 1200, stock: 10, cat: 'Apartments & Housing', img: [SPECIALTY, 'appartments', 'short-stay-serviced.webp'] },
      { name: '2-Bed Long-Term Rental — Monthly', price: 8500, stock: 3, cat: 'Apartments & Housing', img: [SPECIALTY, 'appartments', 'Long-Term Rentals.webp'] },
      { name: 'Student Boarding Room — Monthly', price: 1800, originalPrice: 2200, stock: 12, cat: 'Apartments & Housing', img: [SPECIALTY, 'appartments', 'Boarding & Student Rooms.webp'] },
    ],
  },
  {
    slug: 'entertainment', category: 'entertainment', shop: 'Ngoma Entertainment',
    products: [
      { name: 'Professional DJ Package — Full Event', price: 3500, stock: 10, cat: 'Entertainment', img: [SPECIALTY, 'entertainment', 'DJs.webp'] },
      { name: 'Live Band — 4-Hour Performance', price: 8000, stock: 6, cat: 'Entertainment', img: [SPECIALTY, 'entertainment', 'Live Bands.webp'] },
      { name: 'MC & Host — Weddings and Corporate', price: 2500, originalPrice: 3000, stock: 10, cat: 'Entertainment', img: [SPECIALTY, 'entertainment', 'mc-hosts.webp'] },
      { name: 'Dance Crew Performance', price: 4200, stock: 8, cat: 'Entertainment', img: [SPECIALTY, 'entertainment', 'Dancers.webp'] },
    ],
  },
  {
    slug: 'labour', category: 'labour', shop: 'Mulungushi Works Crew',
    products: [
      { name: 'Construction Crew — 5 Workers / Day', price: 2800, stock: 10, cat: 'Labour & Skills', img: [CATS, 'Construction & Building.webp'] },
      { name: 'Certified Welder — Day Rate', price: 900, stock: 10, cat: 'Labour & Skills', img: [CATS, 'Skilled Trades.webp'] },
      { name: 'Domestic Cleaning Team — Full House', price: 750, originalPrice: 950, stock: 15, cat: 'Labour & Skills', img: [CATS, 'Domestic & Household.webp'] },
    ],
  },
  {
    slug: 'fashion', category: 'fashion', shop: 'Kamwala Threads',
    products: [
      { name: "Women's Chitenge Two-Piece Set", price: 650, stock: 20, cat: 'Fashion', img: [SPECIALTY, 'Fashion', "Women's Clothing.webp"] },
      { name: "Men's Tailored Suit — 2 Piece", price: 2400, originalPrice: 2900, stock: 10, cat: 'Fashion', img: [SPECIALTY, 'Fashion', "Men's Clothing.webp"] },
      { name: 'Leather Loafers — Genuine Hide', price: 850, stock: 15, cat: 'Fashion', img: [SPECIALTY, 'Fashion', 'Shoes & Footwear.webp'] },
      { name: 'Copper Jewelry & Accessories Set', price: 420, stock: 25, cat: 'Fashion', img: [SPECIALTY, 'Fashion', 'Accessories & Jewelry.webp'] },
    ],
  },
  {
    slug: 'furniture', category: 'furniture', shop: 'Ndola Furniture Works',
    products: [
      { name: '6-Seater Living Room Sofa Suite', price: 12500, originalPrice: 14800, stock: 4, cat: 'Furniture', img: [SPECIALTY, 'furnture', 'living-room-sell.webp'] },
      { name: 'Executive Office Desk & Chair Set', price: 6800, stock: 6, cat: 'Furniture', img: [SPECIALTY, 'furnture', 'office-sell.webp'] },
      { name: 'Queen Bedroom Suite — Mukwa Wood', price: 9800, stock: 3, cat: 'Furniture', img: [SPECIALTY, 'furnture', 'bedroom-sell.webp'] },
    ],
  },
  {
    slug: 'groceries', category: 'groceries', shop: 'Soweto Fresh Market',
    products: [
      { name: 'Fresh Produce Box — Weekly Family', price: 380, stock: 30, cat: 'Groceries', img: [SPECIALTY, 'groceries', 'fresh-produce.webp'] },
      { name: 'Pantry Staples Bundle — Mealie Meal, Oil, Sugar', price: 520, stock: 40, cat: 'Groceries', img: [SPECIALTY, 'groceries', 'pantry-staples.webp'] },
      { name: 'Beverages Crate — Assorted', price: 260, originalPrice: 310, stock: 50, cat: 'Groceries', img: [SPECIALTY, 'groceries', 'beverages.webp'] },
      { name: 'Snacks & Sweets Hamper', price: 180, stock: 35, cat: 'Groceries', img: [SPECIALTY, 'groceries', 'snacks-sweets.webp'] },
    ],
  },
];

/** slug → product-name-substring buys (quantity). Spread across categories
 *  so the best-sellers band shows variety, not one shop. */
const BUYS = [
  ['electronics', 'PlayStation', 3],
  ['electronics', 'JBL', 2],
  ['fashion', 'Chitenge', 4],
  ['groceries', 'Fresh Produce', 5],
  ['furniture', 'Sofa', 1],
  ['events', 'Decor', 2],
  ['entertainment', 'DJ', 3],
  ['apartments', 'Serviced', 2],
  ['machinery-hire', 'Tipper', 1],
  ['labour', 'Cleaning', 2],
];

(async () => {
  const productIds = {}; // slug → [{id, name}]
  let registered = 0;

  /** Register, or detect an existing template account via login. Returns
   *  { token, existed } — existing accounts are skipped by the caller so
   *  re-runs never duplicate products or purchases. */
  async function registerOrLogin(payload) {
    if (registered > 0 && registered % 4 === 0) {
      console.log('   …waiting out the registration throttle (62s)');
      await sleep(62000);
    }
    registered++;
    let res = await api('POST', '/auth/register', payload);
    if (res.status === 429) {
      console.log('   429 — waiting 65s and retrying');
      await sleep(65000);
      res = await api('POST', '/auth/register', payload);
    }
    const freshToken = tokenOf(res.json);
    if (freshToken) return { token: freshToken, existed: false };
    const login = await api('POST', '/auth/login', { email: payload.email, password: PASSWORD });
    const existingToken = tokenOf(login.json);
    if (existingToken) return { token: existingToken, existed: true };
    console.log(`FAIL ${payload.email}: register ${res.status} ${JSON.stringify(res.json).slice(0, 140)}`);
    return { token: null, existed: false };
  }

  for (const seller of SELLERS) {
    const email = `demo.${seller.slug}@nyuwe.demo`;
    const n = nextSeq();
    const { token, existed } = await registerOrLogin({
      email, password: PASSWORD, name: seller.shop,
      phone: `0955000${100 + n}`, role: 'SELLER', nrc: `${900000 + n}/10/1`,
      categoryIds: [seller.category],
    });
    if (!token) continue;
    if (existed) {
      console.log(`— ${seller.shop} (${email}) already seeded, skipping`);
      continue;
    }
    productIds[seller.slug] = [];

    for (const p of seller.products) {
      const res = await api('POST', '/products', {
        name: p.name,
        description: `${p.name} — quality you can trust from ${seller.shop}. Verified Zambian seller on Nyuwe; collect in person or arrange delivery.`,
        category: p.cat,
        price: p.price,
        ...(p.originalPrice ? { originalPrice: p.originalPrice } : {}),
        stock: p.stock,
        brand: p.brand,
        condition: 'New',
        images: [dataUrl(...p.img)],
        isActive: true,
      }, token);
      const ok = res.status === 201 || res.status === 200;
      console.log(`${ok ? 'ok ' : 'FAIL'} ${seller.shop} · ${p.name} (${res.status})${ok ? '' : ' ' + JSON.stringify(res.json).slice(0, 160)}`);
      if (ok && res.json?.id) productIds[seller.slug].push({ id: res.json.id, name: p.name });
    }
    console.log(`✔ ${seller.shop} — ${productIds[seller.slug].length} products`);
  }

  // Demo buyer → direct purchases light up salesCount (the ONLY sales signal
  // the storefront ranks by) through the real endpoint, escrow and all.
  const n = nextSeq();
  const buyer = await registerOrLogin({
    email: 'demo.buyer@nyuwe.demo', password: PASSWORD, name: 'Demo Buyer',
    phone: `0955000${100 + n}`, role: 'BUYER', nrc: `${900000 + n}/10/1`,
  });
  if (buyer.token && !buyer.existed) {
    for (const [slug, match, qty] of BUYS) {
      const target = (productIds[slug] || []).find((p) => p.name.includes(match));
      if (!target) continue;
      const res = await api('POST', `/products/${target.id}/buy`, { quantity: qty }, buyer.token);
      console.log(`${res.status === 201 || res.status === 200 ? 'ok ' : 'FAIL'} buy ${qty}× ${target.name} (${res.status})`);
    }
  } else if (buyer.existed) {
    console.log('— Demo Buyer already seeded, skipping purchases');
  }

  // A few anonymous product views → the Trending sort has signal too.
  for (const list of Object.values(productIds)) {
    for (const p of list.slice(0, 2)) {
      for (let i = 0; i < 3; i++) await api('GET', `/products/${p.id}`);
    }
  }

  const home = await api('GET', '/storefront/home');
  console.log(`\nstorefront/home → cards: ${home.json?.cards?.length}, mode: ${home.json?.mode}`);
  for (const c of home.json?.categories ?? []) {
    console.log(`  ${c.name.padEnd(28)} products: ${String(c.productCount).padStart(3)}  shops: ${c.shopCount}`);
  }
  console.log('\nDone. Accounts are documented in scripts/DEMO_ACCOUNTS.md (password: ' + PASSWORD + ')');
})().catch((e) => {
  console.error('SEED ERROR', e);
  process.exit(1);
});
