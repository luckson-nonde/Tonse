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
 * Safe to re-run: an already-registered account is detected (login-first)
 * and skipped entirely, so products and purchase counts never duplicate.
 * API-only — point it at any environment. Auth endpoints are throttled
 * 5/min server-side → every 4th auth call waits 62s.
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

  // ── WAVE 2 — first shops for the uncovered masters, second shops for the
  //    busy ones. Appended AFTER wave 1 so re-runs keep wave-1 phone/NRC
  //    numbering stable (seq is order-dependent). Every image comes from the
  //    product's own category folder under assets/images/specialty.
  {
    slug: 'automotive', category: 'automotive', shop: 'Great North Auto Spares',
    products: [
      { name: 'Toyota Hilux Brake Pads & Discs Set', price: 1450, stock: 14, cat: 'Automotive', brand: 'Toyota', img: [SPECIALTY, 'automotive', 'car-parts-new.webp'] },
      { name: 'Car Accessories Bundle — Mats, Covers, Organiser', price: 480, stock: 20, cat: 'Automotive', img: [SPECIALTY, 'automotive', 'car-accessories.webp'] },
      { name: '24/7 Breakdown Recovery — Lusaka & Highway', price: 950, stock: 10, cat: 'Automotive', img: [SPECIALTY, 'automotive', 'car-breakdown-recovery.webp'] },
      { name: 'Workshop Tool Kit — 216 Piece', price: 2200, originalPrice: 2600, stock: 8, cat: 'Automotive', img: [SPECIALTY, 'automotive', 'automotive-tools.webp'] },
    ],
  },
  {
    slug: 'beauty', category: 'beauty', shop: 'Mona Beauty Studio',
    products: [
      { name: 'Skincare Ritual Set — Cleanser, Toner, Moisturiser', price: 520, stock: 25, cat: 'Beauty', img: [SPECIALTY, 'beauty', 'skincare.webp'] },
      { name: 'Pro Makeup Palette & Brush Kit', price: 680, originalPrice: 820, stock: 18, cat: 'Beauty', img: [SPECIALTY, 'beauty', 'makeup-cosmetics.webp'] },
      { name: 'Haircare Bundle — Shampoo, Treatment, Oil', price: 340, stock: 30, cat: 'Beauty', img: [SPECIALTY, 'beauty', 'haircare.webp'] },
      { name: 'Signature Fragrance — Eau de Parfum 100ml', price: 750, stock: 15, cat: 'Beauty', img: [SPECIALTY, 'beauty', 'fragrances.webp'] },
    ],
  },
  {
    slug: 'construction', category: 'construction', shop: 'Buildmart Zambia',
    products: [
      { name: 'Cement, Blocks & River Sand — Starter Pack', price: 3800, stock: 20, cat: 'Construction', img: [SPECIALTY, 'construction', 'building-materials.webp'] },
      { name: 'Hardware Tool Set — Site Grade', price: 1650, stock: 12, cat: 'Construction', img: [SPECIALTY, 'construction', 'hardware-tools.webp'] },
      { name: 'Plumbing Fixtures Bundle — Full Bathroom', price: 5200, originalPrice: 5900, stock: 6, cat: 'Construction', img: [SPECIALTY, 'construction', 'plumbing-fixtures.webp'] },
      { name: 'Electrical Supplies Pack — Wiring & DBs', price: 2900, stock: 10, cat: 'Construction', img: [SPECIALTY, 'construction', 'electrical-supplies.webp'] },
    ],
  },
  {
    slug: 'agriculture', category: 'agriculture', shop: 'Chisamba Agro Supplies',
    products: [
      { name: 'Maize Seed & Fertiliser Pack — 1 Hectare', price: 2400, stock: 25, cat: 'Agriculture', img: [SPECIALTY, 'agriculture', 'crop-production.webp'] },
      { name: 'Broiler Starter Kit — 100 Chicks + Feed', price: 1850, stock: 15, cat: 'Agriculture', img: [SPECIALTY, 'agriculture', 'poultry-farming.webp'] },
      { name: 'Livestock Veterinary Visit — On-Farm', price: 600, stock: 30, cat: 'Agriculture', img: [SPECIALTY, 'agriculture', 'livestock-veterinary.webp'] },
      { name: 'Drip Irrigation Kit — 0.5 Hectare', price: 4300, originalPrice: 4900, stock: 8, cat: 'Agriculture', img: [SPECIALTY, 'agriculture', 'irrigation-hardware.webp'] },
    ],
  },
  {
    slug: 'home-decor', category: 'home-decor', shop: 'Salama Home & Decor',
    products: [
      { name: 'Blackout Curtains & Blinds — Per Window', price: 850, stock: 20, cat: 'Home Decor', img: [SPECIALTY, 'home-decor', 'curtains-blinds.webp'] },
      { name: 'Pendant Lighting & Lamp Set', price: 1200, stock: 12, cat: 'Home Decor', img: [SPECIALTY, 'home-decor', 'lighting-lamps.webp'] },
      { name: 'Persian-Style Rug — 200×300cm', price: 1600, originalPrice: 1950, stock: 10, cat: 'Home Decor', img: [SPECIALTY, 'home-decor', 'rugs-carpets.webp'] },
      { name: 'Wall Art & Mirror Gallery Set', price: 780, stock: 15, cat: 'Home Decor', img: [SPECIALTY, 'home-decor', 'wall-art-mirrors.webp'] },
    ],
  },
  {
    slug: 'it-products', category: 'it-products', shop: 'TechPoint Zambia',
    products: [
      { name: 'Dell OptiPlex Business Desktop — i5 / 16GB', price: 9800, stock: 10, cat: 'IT Products', brand: 'Dell', img: [SPECIALTY, 'it-products', 'business-computers.webp'] },
      { name: 'HP LaserJet Pro Printer + Toner Bundle', price: 4600, stock: 8, cat: 'IT Products', brand: 'HP', img: [SPECIALTY, 'it-products', 'printers-office-equipment.webp'] },
      { name: 'Office Networking Kit — Router, Switch, APs', price: 3800, originalPrice: 4300, stock: 6, cat: 'IT Products', img: [SPECIALTY, 'it-products', 'networking-hardware.webp'] },
      { name: 'Microsoft 365 Business — Annual Licence', price: 1450, stock: 40, cat: 'IT Products', brand: 'Microsoft', img: [SPECIALTY, 'it-products', 'software-licenses.webp'] },
    ],
  },
  {
    slug: 'it-services', category: 'it-services', shop: 'Digital Mine IT Solutions',
    products: [
      { name: 'Business Website — Design & Build', price: 6500, stock: 10, cat: 'IT Services', img: [SPECIALTY, 'it-services', 'software-web-development.webp'] },
      { name: 'IT Support Retainer — Monthly, up to 20 Seats', price: 3200, stock: 12, cat: 'IT Services', img: [SPECIALTY, 'it-services', 'IT Support & Maintenance.webp'] },
      { name: 'Office Network & CCTV Security Setup', price: 5400, originalPrice: 6200, stock: 8, cat: 'IT Services', img: [SPECIALTY, 'it-services', 'networking-security.webp'] },
    ],
  },
  {
    slug: 'telecommunications', category: 'telecommunications', shop: 'AirLink Communications',
    products: [
      { name: 'Home Fibre Installation — 50Mbps Package', price: 1250, stock: 30, cat: 'Telecommunications', img: [SPECIALTY, 'telecommunications', 'Internet Service Providers.webp'] },
      { name: 'Satellite & VSAT Installation — Remote Sites', price: 8500, stock: 6, cat: 'Telecommunications', img: [SPECIALTY, 'telecommunications', 'Satellite & VSAT Installation.webp'] },
      { name: 'Corporate Mobile Fleet Package — 20 Lines', price: 4200, stock: 10, cat: 'Telecommunications', img: [SPECIALTY, 'telecommunications', 'Mobile Network Services.webp'] },
    ],
  },
  {
    slug: 'drilling-services', category: 'drilling-services', shop: 'Kafue Borehole Drillers',
    products: [
      { name: 'Borehole Drilling & Casing — Complete', price: 28000, originalPrice: 32000, stock: 5, cat: 'Drilling Services', img: [SPECIALTY, 'drilling-services', 'Borehole Drilling.webp'] },
      { name: 'Geotechnical Site Investigation', price: 15000, stock: 6, cat: 'Drilling Services', img: [SPECIALTY, 'drilling-services', 'Geotechnical Drilling.webp'] },
      { name: 'Mining Exploration Drilling — Per Metre', price: 950, stock: 40, cat: 'Drilling Services', img: [SPECIALTY, 'drilling-services', 'Mining Exploration.webp'] },
    ],
  },
  {
    slug: 'pastry-bakery', category: 'pastry-bakery', shop: 'Sunrise Bakery Lusaka',
    products: [
      { name: 'Fresh Bread & Pastries Box — Daily', price: 120, stock: 60, cat: 'Pastry & Bakery', img: [SPECIALTY, 'Pastry and Bakery', 'Bread & Pastries.webp'] },
      { name: 'Custom Celebration Cake — 3 Tier', price: 1800, originalPrice: 2100, stock: 10, cat: 'Pastry & Bakery', img: [SPECIALTY, 'Pastry and Bakery', 'Custom Cakes.webp'] },
    ],
  },
  {
    slug: 'loans', category: 'loans', shop: 'Pamodzi Micro-Finance',
    products: [
      { name: 'Salary-Backed Personal Loan — up to K50,000', price: 500, stock: 100, cat: 'Loans', img: [SPECIALTY, 'loans', 'loan-salary.webp'] },
      { name: 'Collateral Loan — Vehicle or Title Deed', price: 800, stock: 100, cat: 'Loans', img: [SPECIALTY, 'loans', 'loan-collateral.webp'] },
      { name: 'Civil Servant Loan — Government Payroll', price: 500, stock: 100, cat: 'Loans', img: [SPECIALTY, 'loans', 'loan-government.webp'] },
    ],
  },
  {
    slug: 'locksmith', category: 'locksmith-key-services', shop: 'SecureKey Locksmiths',
    products: [
      { name: 'Emergency Lockout & Key Replacement — Call-Out', price: 350, stock: 50, cat: 'Locksmith & Key Services', img: [SPECIALTY, 'locksmith-key-services', 'key-replacement.webp'] },
    ],
  },
  {
    slug: 'electronics-2', category: 'electronics', shop: 'Cairo Road Electronics',
    products: [
      { name: 'Samsung Galaxy A56 — 256GB Dual SIM', price: 7800, stock: 15, cat: 'Electronics', brand: 'Samsung', img: [SPECIALTY, 'electronics', 'mobile-phones-sell.webp'] },
      { name: 'Lenovo ThinkPad E14 — 8GB / 256GB', price: 11200, originalPrice: 12500, stock: 7, cat: 'Electronics', brand: 'Lenovo', img: [SPECIALTY, 'electronics', 'laptops-sell.webp'] },
      { name: '55" Smart TV + Soundbar Combo', price: 9600, stock: 6, cat: 'Electronics', img: [SPECIALTY, 'electronics', 'audio-video-both.webp'] },
      { name: 'Phone Screen & Battery Repair — Same Day', price: 450, stock: 40, cat: 'Electronics', img: [SPECIALTY, 'electronics', 'mobile-phones-repair.webp'] },
    ],
  },
  {
    slug: 'fashion-2', category: 'fashion', shop: 'Zed Streetwear',
    products: [
      { name: 'Limited-Run Sneakers — Unisex', price: 980, stock: 18, cat: 'Fashion', img: [SPECIALTY, 'Fashion', 'Shoes & Footwear.webp'] },
      { name: 'Watches & Accessories Capsule', price: 560, originalPrice: 690, stock: 22, cat: 'Fashion', img: [SPECIALTY, 'Fashion', 'Accessories & Jewelry.webp'] },
      { name: 'Ankara Print Summer Dress', price: 720, stock: 16, cat: 'Fashion', img: [SPECIALTY, 'Fashion', "Women's Clothing.webp"] },
    ],
  },
  {
    slug: 'groceries-2', category: 'groceries', shop: 'Chelstone Grocers',
    products: [
      { name: 'Bulk Beverages — Restaurant Resupply Crate', price: 540, stock: 30, cat: 'Groceries', img: [SPECIALTY, 'groceries', 'beverages.webp'] },
      { name: 'Office Snack Basket — Weekly', price: 260, stock: 25, cat: 'Groceries', img: [SPECIALTY, 'groceries', 'snacks-sweets.webp'] },
      { name: 'Wholesale Pantry Pack — 25kg Mealie Meal +', price: 890, originalPrice: 990, stock: 20, cat: 'Groceries', img: [SPECIALTY, 'groceries', 'pantry-staples.webp'] },
    ],
  },
  {
    slug: 'events-2', category: 'events', shop: 'Lusaka Event Masters',
    products: [
      { name: 'Full Event Planning — Concept to Day-Of', price: 15000, stock: 6, cat: 'Events', img: [SPECIALTY, 'events', 'Event Planning.webp'] },
      { name: 'Corporate Event Management — Turnkey', price: 25000, originalPrice: 28000, stock: 4, cat: 'Events', img: [SPECIALTY, 'events', 'Event Management.webp'] },
    ],
  },
  {
    slug: 'machinery-hire-2', category: 'machinery-hire', shop: 'Copperbelt Plant & Machinery',
    products: [
      { name: 'D6 Bulldozer — Daily Hire', price: 14500, stock: 2, cat: 'Heavy Machinery for Hire', img: [SPECIALTY, 'machinery-hire', 'bulldozer.webp'] },
      { name: 'Motor Grader — Daily Hire', price: 11000, stock: 2, cat: 'Heavy Machinery for Hire', img: [SPECIALTY, 'machinery-hire', 'Motor Grader.webp'] },
      { name: '10,000L Water Bowser — Daily Hire', price: 4800, stock: 4, cat: 'Heavy Machinery for Hire', img: [SPECIALTY, 'machinery-hire', 'Water Bowser.webp'] },
      { name: '100kVA Generator — Daily Hire', price: 3500, originalPrice: 4000, stock: 5, cat: 'Heavy Machinery for Hire', img: [SPECIALTY, 'machinery-hire', 'generator.webp'] },
    ],
  },
  {
    slug: 'furniture-2', category: 'furniture', shop: 'Woodcraft Living',
    products: [
      { name: 'Outdoor Patio Set — 6 Seater + Table', price: 7400, stock: 5, cat: 'Furniture', img: [SPECIALTY, 'furnture', 'outdoor-sell.webp'] },
      { name: 'Sofa Reupholstery & Repair Service', price: 2200, stock: 10, cat: 'Furniture', img: [SPECIALTY, 'furnture', 'living-room-repair.webp'] },
    ],
  },
];

// Wave-2 accounts number from 0955000131 / NRC 900031 upward: on environments
// seeded before wave 2 existed, the buyer already owns …111 (it was seq 11
// back then), and phone/nrc are unique-indexed — without the offset the first
// wave-2 registration would collide with it and 409.
const WAVE2_FIRST = SELLERS.findIndex((s) => s.slug === 'automotive');
SELLERS.forEach((s, i) => {
  if (i >= WAVE2_FIRST) s.numOffset = 20;
});

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
  // Wave 2 — targets only resolve for sellers created in the same run, so
  // re-runs can't double-buy (skipped sellers never enter productIds).
  ['automotive', 'Brake Pads', 2],
  ['beauty', 'Skincare', 3],
  ['construction', 'Cement', 2],
  ['agriculture', 'Broiler', 2],
  ['home-decor', 'Rug', 1],
  ['it-products', 'LaserJet', 2],
  ['it-services', 'Website', 1],
  ['telecommunications', 'Fibre', 3],
  ['drilling-services', 'Borehole', 1],
  ['pastry-bakery', 'Bread', 4],
  ['loans', 'Salary', 2],
  ['electronics-2', 'Galaxy', 2],
  ['fashion-2', 'Sneakers', 3],
  ['groceries-2', 'Pantry', 2],
  ['events-2', 'Planning', 1],
  ['machinery-hire-2', 'Generator', 2],
  ['furniture-2', 'Patio', 1],
];

(async () => {
  const productIds = {}; // slug → [{id, name}]

  /** Auth endpoints share a 5/min throttle — pace every auth CALL (register
   *  AND login both count), not just registrations. */
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

  /** Which call to spend first. Under the 5/min throttle the order is the
   *  whole cost: a fresh environment wants register-first (one call per new
   *  account, two if we guess wrong), an already-seeded one wants
   *  login-first. Start optimistic and FLIP on the first wrong guess —
   *  environments are seeded in bulk, so one mistake pays for itself and the
   *  rest of the run is optimal either way. Callers skip `existed` accounts,
   *  so re-runs still never duplicate products. */
  let loginFirst = false;

  async function registerOrLogin(payload) {
    const doLogin = () => authApi('/auth/login', { email: payload.email, password: PASSWORD });
    const doRegister = () => authApi('/auth/register', payload);

    if (loginFirst) {
      const token = tokenOf((await doLogin()).json);
      if (token) return { token, existed: true };
      loginFirst = false; // this environment has unseeded accounts after all
    }

    const res = await doRegister();
    const freshToken = tokenOf(res.json);
    if (freshToken) return { token: freshToken, existed: false };

    const token = tokenOf((await doLogin()).json);
    if (token) {
      loginFirst = true; // already seeded — stop paying for doomed registers
      return { token, existed: true };
    }
    console.log(`FAIL ${payload.email}: register ${res.status} ${JSON.stringify(res.json).slice(0, 140)}`);
    return { token: null, existed: false };
  }

  for (const seller of SELLERS) {
    const email = `demo.${seller.slug}@nyuwe.demo`;
    const n = nextSeq() + (seller.numOffset ?? 0);
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
  // Buys run whether the buyer is fresh or pre-existing: targets only
  // resolve for sellers created THIS run (skipped sellers never populate
  // productIds), so re-runs — and second-wave runs where the buyer already
  // exists — buy each new product exactly once and never double-buy old ones.
  if (buyer.token) {
    let bought = 0;
    for (const [slug, match, qty] of BUYS) {
      const target = (productIds[slug] || []).find((p) => p.name.includes(match));
      if (!target) continue;
      bought++;
      const res = await api('POST', `/products/${target.id}/buy`, { quantity: qty }, buyer.token);
      console.log(`${res.status === 201 || res.status === 200 ? 'ok ' : 'FAIL'} buy ${qty}× ${target.name} (${res.status})`);
    }
    if (!bought) console.log('— no newly seeded products this run, no purchases to make');
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
