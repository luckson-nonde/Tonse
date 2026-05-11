// TONSE — Category & Subcategory selection redesign
// Two-screen flow inside an iOS frame, with Tweaks for layout / palette / icon style.

const { useState, useEffect, useRef, useMemo } = React;

// ─── Brand tokens ────────────────────────────────────────────────────────────
const TONSE = {
  navy:    '#0E2954',
  navy2:   '#163972',
  cyan:    '#13a4ec',
  amber:   '#F0A500',
  ink:     '#0B1220',
  mute:    '#6B7280',
  line:    '#E8ECF2',
  bg:      '#F4F5F8',
  surface: '#FFFFFF',
};

// ─── Icon set (single-stroke, 24px) ──────────────────────────────────────────
const Icon = ({ name, size = 24, stroke = 'currentColor', sw = 1.6 }) => {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  const paths = {
    arrowLeft:   <><path d="M14 6l-6 6 6 6"/></>,
    bell:        <><path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16z"/><path d="M10 20a2 2 0 004 0"/></>,
    search:      <><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></>,
    chevron:     <><path d="M9 6l6 6-6 6"/></>,
    check:       <><path d="M5 12l4 4 10-10"/></>,
    grid:        <><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></>,
    lyGrid:      <><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></>,
    lyMosaic:    <><rect x="4" y="4" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></>,
    lyList:      <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    // category glyphs — distinctive per category
    wrench:      <><path d="M16.5 2a4.5 4.5 0 00-4.2 6.1L3 17.4 6.6 21l9.3-9.3A4.5 4.5 0 1019.5 5l-2.3 2.3-1.5-1.5L18 3.5A4.5 4.5 0 0016.5 2z"/><path d="M5 19l1.5 1.5"/></>,
    laptop:      <><rect x="4" y="5" width="16" height="10" rx="1.5"/><path d="M2 18l1.5-1.5h17L22 18M8 9h5M8 12h8"/></>,
    chair:       <><path d="M7 4h10v8H7z"/><path d="M5 12h14"/><path d="M8 12v8M16 12v8"/><path d="M8 17h8"/></>,
    brick:       <><path d="M3 4l9-2 9 2v6l-9 2-9-2z"/><path d="M3 4v6M21 4v6M12 2v10"/><path d="M5 14l7 2 7-2M5 18l7 2 7-2"/></>,
    cross:       <><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></>,
    leaf:        <><path d="M5 21c0-9 5-15 16-15 0 11-6 16-15 16-1 0 0-1-1-1z"/><path d="M5 21l8-8"/></>,
    shirt:       <><path d="M9 3l3 2 3-2 5 3-2.5 4-2.5-1v12H8V9L5.5 10 3 6z"/></>,
    fork:        <><path d="M6 2v9a2 2 0 002 2v9M6 2v7M9 2v7"/><path d="M16 2c-1.5 0-2.5 2-2.5 5s1 5 2.5 5v10"/><path d="M14 2v6"/></>,
    car:         <><path d="M5 11l2-5h10l2 5"/><rect x="3" y="11" width="18" height="6" rx="2"/><circle cx="8" cy="17" r="1.5" fill="currentColor"/><circle cx="16" cy="17" r="1.5" fill="currentColor"/><path d="M6 14h2M16 14h2"/></>,
    box:         <><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/><path d="M7.5 5.5l9 5"/></>,
    // subcategory accents
    spark:       <><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/></>,
    bolt:        <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></>,
    plug:        <><path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 01-12 0V7z"/><path d="M12 17v5"/></>,
    bed:         <><path d="M3 19V8M3 14h18v5"/><circle cx="8" cy="11" r="2"/></>,
    home:        <><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1v-9z"/></>,
    droplet:     <><path d="M12 3s7 7 7 12a7 7 0 01-14 0c0-5 7-12 7-12z"/></>,
    tire:        <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></>,
    cup:         <><path d="M5 8h13v6a5 5 0 01-10 0V8z"/><path d="M18 9h2a2 2 0 010 4h-2"/></>,
    syringe:     <><path d="M16 2l6 6M14 4l6 6M9 9l6 6-5 5H4v-6l5-5z"/></>,
    pill:        <><rect x="2.5" y="9" width="19" height="6" rx="3" transform="rotate(-30 12 12)"/><path d="M9.5 6.5l5 9"/></>,
    sprout:      <><path d="M12 21v-8"/><path d="M12 13c0-4 3-6 7-6-1 5-3 7-7 7z"/><path d="M12 13c0-4-3-6-7-6 1 5 3 7 7 7z"/></>,
    tractor:     <><circle cx="6" cy="17" r="3.5"/><circle cx="17" cy="18" r="2.5"/><path d="M9 17h5M9 11h7l1 5M9 11V7h5l2 4"/></>,
    hat:         <><path d="M3 16l9-12 9 12H3z"/><path d="M3 16l4 5h10l4-5"/></>,
    boot:        <><path d="M6 3h6v10l5 4v4H4v-4l2-2V3z"/></>,
    drill:       <><path d="M3 11h7v4H3z"/><path d="M10 9v8h6l5-4-5-4h-6z"/></>,
    screw:       <><path d="M9 3h6v3l-3 2-3-2V3z"/><path d="M9 8h6v12l-3 2-3-2V8z"/><path d="M9 11h6M9 14h6M9 17h6"/></>,
  };
  return <svg {...common}>{paths[name] || paths.grid}</svg>;
};

// ─── Data ────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'hardware',    name: 'Hardware & Tools',     icon: 'wrench', accent: '#FF8A3D', tagline: 'Tools, fasteners, workshop',     count: 142 },
  { id: 'electronics', name: 'Electronics',          icon: 'laptop', accent: '#13a4ec', tagline: 'Phones, laptops, audio, parts',   count: 218 },
  { id: 'furniture',   name: 'Furniture',            icon: 'chair',  accent: '#8B5CF6', tagline: 'Office, home, hospitality',       count: 96  },
  { id: 'building',    name: 'Building Materials',   icon: 'brick',  accent: '#6B7280', tagline: 'Cement, steel, finishes',         count: 174 },
  { id: 'medical',     name: 'Medical & Pharmacy',   icon: 'cross',  accent: '#EF4444', tagline: 'PPE, equipment, supplies',        count: 88  },
  { id: 'agriculture', name: 'Agriculture',          icon: 'leaf',   accent: '#10B981', tagline: 'Seeds, inputs, machinery',        count: 121 },
  { id: 'clothing',    name: 'Clothing & Apparel',   icon: 'shirt',  accent: '#EC4899', tagline: 'Workwear, uniforms, footwear',    count: 73  },
  { id: 'food',        name: 'Food & Beverage',      icon: 'fork',   accent: '#F0A500', tagline: 'Staples, drinks, bakery',         count: 134 },
  { id: 'auto',        name: 'Auto Parts',           icon: 'car',    accent: '#0E2954', tagline: 'Engine, tires, accessories',      count: 109 },
  { id: 'other',       name: 'Other',                icon: 'box',    accent: '#64748B', tagline: 'Not listed? Describe it',          count: null},
];

const SUBCATEGORIES = {
  hardware: [
    { name: 'Power tools',        icon: 'drill',   eg: 'Drills, grinders, saws' },
    { name: 'Hand tools',         icon: 'wrench',  eg: 'Spanners, hammers, pliers' },
    { name: 'Fasteners & fixings',icon: 'screw',   eg: 'Bolts, nuts, screws, anchors' },
    { name: 'Plumbing supplies',  icon: 'droplet', eg: 'Pipes, valves, fittings' },
    { name: 'Electrical supplies',icon: 'bolt',    eg: 'Cables, breakers, sockets' },
    { name: 'Safety equipment',   icon: 'hat',     eg: 'Helmets, gloves, goggles' },
    { name: 'Welding gear',       icon: 'spark',   eg: 'Welders, rods, masks' },
    { name: 'Adhesives & sealants', icon: 'plug',  eg: 'Silicone, epoxy, glue' },
  ],
  electronics: [
    { name: 'Smartphones',        icon: 'laptop',  eg: 'Android, iPhone, dual-SIM' },
    { name: 'Laptops & PCs',      icon: 'laptop',  eg: 'Business, gaming, all-in-ones' },
    { name: 'TVs & displays',     icon: 'laptop',  eg: 'LED, OLED, projectors' },
    { name: 'Audio equipment',    icon: 'spark',   eg: 'Speakers, mixers, PA systems' },
    { name: 'Cameras',            icon: 'spark',   eg: 'DSLR, CCTV, action cams' },
    { name: 'Networking & WiFi',  icon: 'plug',    eg: 'Routers, switches, cabling' },
    { name: 'Cables & adapters',  icon: 'plug',    eg: 'HDMI, USB-C, power' },
    { name: 'Accessories',        icon: 'box',     eg: 'Cases, chargers, mounts' },
  ],
  furniture: [
    { name: 'Office desks & chairs', icon: 'chair', eg: 'Ergonomic, executive' },
    { name: 'Conference & boardroom',icon: 'chair', eg: 'Meeting tables, seating' },
    { name: 'Living room',           icon: 'chair', eg: 'Sofas, coffee tables, TV units' },
    { name: 'Bedroom',               icon: 'bed',   eg: 'Beds, wardrobes, dressers' },
    { name: 'Outdoor & patio',       icon: 'leaf',  eg: 'Garden sets, gazebos' },
    { name: 'Storage & shelving',    icon: 'box',   eg: 'Cabinets, lockers, racks' },
    { name: 'Lighting',              icon: 'spark', eg: 'Pendants, lamps, fixtures' },
    { name: 'Hospitality',           icon: 'cup',   eg: 'Restaurant, hotel, lounge' },
  ],
  building: [
    { name: 'Cement & concrete',  icon: 'brick',   eg: 'Portland, ready-mix, blocks' },
    { name: 'Steel & rebar',      icon: 'screw',   eg: 'Bars, sheets, sections' },
    { name: 'Roofing & sheeting', icon: 'home',    eg: 'IBR, tiles, gutters' },
    { name: 'Tiles & flooring',   icon: 'grid',    eg: 'Ceramic, vinyl, hardwood' },
    { name: 'Paint & finishes',   icon: 'droplet', eg: 'Interior, exterior, primers' },
    { name: 'Doors & windows',    icon: 'home',    eg: 'Steel, aluminium, glass' },
    { name: 'Bricks & blocks',    icon: 'brick',   eg: 'Clay, hollow, paving' },
    { name: 'Plumbing fixtures',  icon: 'droplet', eg: 'Sinks, toilets, taps' },
  ],
  medical: [
    { name: 'PPE & disposables',   icon: 'hat',     eg: 'Masks, gloves, gowns' },
    { name: 'Diagnostic equipment',icon: 'cross',   eg: 'Monitors, scanners' },
    { name: 'Hospital furniture',  icon: 'bed',     eg: 'Beds, trolleys, cabinets' },
    { name: 'Surgical instruments',icon: 'syringe', eg: 'Forceps, scalpels, kits' },
    { name: 'Pharmaceuticals',     icon: 'pill',    eg: 'Generics, OTC, prescription' },
    { name: 'Laboratory supplies', icon: 'droplet', eg: 'Reagents, glassware' },
    { name: 'First aid',           icon: 'cross',   eg: 'Kits, bandages, sanitiser' },
    { name: 'Mobility aids',       icon: 'chair',   eg: 'Wheelchairs, crutches' },
  ],
  agriculture: [
    { name: 'Seeds & seedlings',     icon: 'sprout',  eg: 'Maize, vegetables, cover crops' },
    { name: 'Fertilizer & chemicals',icon: 'droplet', eg: 'NPK, urea, herbicides' },
    { name: 'Hand tools',            icon: 'wrench',  eg: 'Hoes, shovels, pruners' },
    { name: 'Irrigation systems',    icon: 'droplet', eg: 'Drip, sprinkler, pumps' },
    { name: 'Livestock feed',        icon: 'box',     eg: 'Cattle, poultry, fish' },
    { name: 'Veterinary supplies',   icon: 'syringe', eg: 'Vaccines, dewormers' },
    { name: 'Farm machinery',        icon: 'tractor', eg: 'Tractors, ploughs, mills' },
    { name: 'Storage & silos',       icon: 'box',     eg: 'Bins, tanks, sheds' },
  ],
  clothing: [
    { name: 'Workwear',              icon: 'shirt',   eg: 'Overalls, hi-vis, aprons' },
    { name: 'School uniforms',       icon: 'shirt',   eg: 'Shirts, skirts, ties' },
    { name: 'Corporate uniforms',    icon: 'shirt',   eg: 'Branded shirts, polos' },
    { name: 'Footwear',              icon: 'boot',    eg: 'Safety boots, formal' },
    { name: "Men's apparel",         icon: 'shirt',   eg: 'Suits, casual, formal' },
    { name: "Women's apparel",       icon: 'shirt',   eg: 'Dresses, blouses' },
    { name: "Children's apparel",    icon: 'shirt',   eg: 'School, casual, sports' },
    { name: 'Tailoring services',    icon: 'screw',   eg: 'Custom, alterations' },
  ],
  food: [
    { name: 'Dry goods & staples', icon: 'box',     eg: 'Mealie meal, rice, beans' },
    { name: 'Cooking oils',        icon: 'droplet', eg: 'Sunflower, palm, vegetable' },
    { name: 'Beverages',           icon: 'cup',     eg: 'Soft drinks, juice, water' },
    { name: 'Snacks & confectionery',icon: 'box',   eg: 'Biscuits, chocolate, chips' },
    { name: 'Fresh produce',       icon: 'sprout',  eg: 'Fruit, vegetables' },
    { name: 'Frozen foods',        icon: 'box',     eg: 'Meat, fish, ready meals' },
    { name: 'Bakery supplies',     icon: 'fork',    eg: 'Flour, sugar, yeast' },
    { name: 'Restaurant supplies', icon: 'cup',     eg: 'Sauces, condiments, bulk' },
  ],
  auto: [
    { name: 'Engine parts',        icon: 'car',     eg: 'Filters, belts, pistons' },
    { name: 'Tires & wheels',      icon: 'tire',    eg: 'Passenger, truck, off-road' },
    { name: 'Body & bodywork',     icon: 'car',     eg: 'Panels, mirrors, lights' },
    { name: 'Brakes & suspension', icon: 'screw',   eg: 'Pads, discs, shocks' },
    { name: 'Electrical & lighting',icon: 'bolt',   eg: 'Batteries, alternators' },
    { name: 'Fluids & lubricants', icon: 'droplet', eg: 'Oil, coolant, brake fluid' },
    { name: 'Truck & heavy-duty',  icon: 'car',     eg: 'HGV, trailer, fleet' },
    { name: 'Accessories',         icon: 'box',     eg: 'Mats, racks, audio' },
  ],
  other: [
    { name: 'Describe your item',  icon: 'box',     eg: "Tell us what you're looking for" },
  ],
};

// ─── Shared bits ─────────────────────────────────────────────────────────────
const Header = ({ onBack, title = 'New inquiry', step = 1 }) => (
  <div style={{
    padding: '58px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'white', borderBottom: `1px solid ${TONSE.line}`,
  }}>
    <button onClick={onBack} style={iconBtn}>
      <Icon name="arrowLeft" size={20} stroke={TONSE.ink}/>
    </button>
    <div style={{ textAlign: 'center', lineHeight: 1.1 }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: TONSE.navy, letterSpacing: '-0.01em' }}>
        TON<span style={{ color: TONSE.cyan }}>SE</span>
      </div>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: TONSE.mute, letterSpacing: '0.18em', marginTop: 2 }}>
        {title.toUpperCase()}
      </div>
    </div>
    <button style={{...iconBtn, position: 'relative'}}>
      <Icon name="bell" size={18} stroke={TONSE.ink}/>
      <span style={{position:'absolute', top:8, right:10, width:6, height:6, borderRadius:99, background:TONSE.amber, boxShadow:'0 0 0 2px white'}}/>
    </button>
  </div>
);

const iconBtn = {
  width: 36, height: 36, borderRadius: 12, background: '#F4F5F8',
  display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer',
};

const StepBar = ({ step = 1, total = 3 }) => (
  <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '14px 20px 0' }}>
    {Array.from({length: total}).map((_, i) => (
      <div key={i} style={{
        flex: 1, height: 4, borderRadius: 99,
        background: i < step ? TONSE.navy : i === step ? TONSE.cyan : '#E8ECF2',
      }}/>
    ))}
    <div style={{ fontSize: 11, fontWeight: 700, color: TONSE.mute, marginLeft: 6, letterSpacing: '0.04em' }}>
      {step}/{total}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// MASTER CATEGORY SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function MasterCategoryScreen({ onPick, tweaks, setTweak }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() =>
    CATEGORIES.filter(c => !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.tagline.toLowerCase().includes(query.toLowerCase()))
  , [query]);

  return (
    <div data-screen-label="01 Master category" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: TONSE.bg }}>
      <Header step={1}/>
      <StepBar step={1}/>

      {/* Compact title + search row */}
      <div style={{ padding: '14px 20px 12px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: TONSE.navy, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 10 }}>
          What are you sourcing?
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'white', border: `1.5px solid ${TONSE.line}`,
          borderRadius: 14, padding: '6px 6px 6px 14px',
        }}>
          <Icon name="search" size={16} stroke={TONSE.mute}/>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search categories…"
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13.5, color: TONSE.ink, background: 'transparent', fontFamily: 'inherit', minWidth: 0 }}
          />
          <LayoutToggle value={tweaks.layout} onChange={v => setTweak('layout', v)}/>
        </div>
      </div>

      {/* Body — switches on layout tweak */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 100px' }}>
        {tweaks.layout === 'grid' && <GridLayout items={filtered} onPick={onPick}/>}
        {tweaks.layout === 'mosaic' && <MosaicLayout items={filtered} onPick={onPick}/>}
        {tweaks.layout === 'list' && <ListLayout items={filtered} onPick={onPick}/>}
      </div>
    </div>
  );
}

// — Layout switcher (segmented icon control inside search bar) ───────────────
const LayoutToggle = ({ value, onChange }) => {
  const opts = [
    { v: 'grid',   icon: 'lyGrid'   },
    { v: 'mosaic', icon: 'lyMosaic' },
    { v: 'list',   icon: 'lyList'   },
  ];
  return (
    <div style={{
      display: 'flex', gap: 2, background: '#F4F5F8', borderRadius: 9, padding: 3,
    }}>
      {opts.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
          background: value === o.v ? 'white' : 'transparent',
          boxShadow: value === o.v ? '0 1px 3px rgba(14,41,84,0.12)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: value === o.v ? TONSE.navy : TONSE.mute,
          transition: 'all .15s ease',
        }} aria-label={o.v}>
          <Icon name={o.icon} size={14} stroke="currentColor" sw={1.9}/>
        </button>
      ))}
    </div>
  );
};

// — Layout: GRID (2 columns of icon tiles) ────────────────────────────────────
const GridLayout = ({ items, onPick }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
    {items.map(c => (
      <button key={c.id} onClick={() => onPick(c)} style={{
        background: 'white', border: `1px solid ${TONSE.line}`, borderRadius: 20,
        padding: '16px 14px 14px', textAlign: 'left', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 10, minHeight: 130,
        boxShadow: '0 1px 0 rgba(14,41,84,0.02)', transition: 'transform .15s ease, box-shadow .15s ease',
      }}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={e => e.currentTarget.style.transform = ''}
      onMouseLeave={e => e.currentTarget.style.transform = ''}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: c.accent + '15', color: c.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={c.icon} size={22} stroke={c.accent} sw={1.8}/>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: TONSE.navy, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            {c.name}
          </div>
          <div style={{ fontSize: 10.5, color: TONSE.mute, marginTop: 4, fontWeight: 600, letterSpacing: '0.02em' }}>
            {c.count ? `${c.count} item types` : 'Custom'}
          </div>
        </div>
      </button>
    ))}
  </div>
);

// — Layout: MOSAIC (hero card + 2-col grid) ───────────────────────────────────
const MosaicLayout = ({ items, onPick }) => {
  if (!items.length) return null;
  const [hero, ...rest] = items;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button onClick={() => onPick(hero)} style={{
        background: TONSE.navy, color: 'white', border: 'none', borderRadius: 22,
        padding: '20px 18px', textAlign: 'left', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 10px 30px -10px rgba(14,41,84,0.4)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%', background: hero.accent + '30' }}/>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: hero.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative',
        }}>
          <Icon name={hero.icon} size={28} stroke="white" sw={1.8}/>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: hero.accent, letterSpacing: '0.2em' }}>TOP CATEGORY</div>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2, letterSpacing: '-0.01em' }}>{hero.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{hero.tagline}</div>
        </div>
      </button>
      <GridLayout items={rest} onPick={onPick}/>
    </div>
  );
};

// — Layout: LIST (rich rows) ──────────────────────────────────────────────────
const ListLayout = ({ items, onPick }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {items.map(c => (
      <button key={c.id} onClick={() => onPick(c)} style={{
        background: 'white', border: `1px solid ${TONSE.line}`, borderRadius: 16,
        padding: '14px 14px', textAlign: 'left', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: c.accent + '15', color: c.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name={c.icon} size={22} stroke={c.accent} sw={1.8}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: TONSE.navy, letterSpacing: '-0.01em' }}>{c.name}</div>
          <div style={{ fontSize: 11.5, color: TONSE.mute, marginTop: 2 }}>{c.tagline}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {c.count && <div style={{ fontSize: 11, fontWeight: 700, color: TONSE.mute, background: '#F4F5F8', padding: '4px 8px', borderRadius: 99 }}>{c.count}</div>}
          <Icon name="chevron" size={16} stroke="#C7CDD7"/>
        </div>
      </button>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// SUBCATEGORY SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function SubcategoryScreen({ category, onBack, onContinue, tweaks }) {
  const [picked, setPicked] = useState(null);
  const [query, setQuery] = useState('');
  const list = (SUBCATEGORIES[category.id] || []).filter(s =>
    !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.eg.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div data-screen-label="02 Subcategory" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: TONSE.bg }}>
      <Header step={2} onBack={onBack}/>
      <StepBar step={2}/>

      {/* Selected master category strip */}
      <div style={{ padding: '16px 20px 14px' }}>
        <div style={{
          background: 'linear-gradient(135deg, ' + TONSE.navy + ' 0%, ' + TONSE.navy2 + ' 100%)',
          color: 'white', borderRadius: 20, padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 16px 40px -16px rgba(14,41,84,0.5)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: category.accent + '30' }}/>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: category.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative',
          }}>
            <Icon name={category.icon} size={22} stroke="white" sw={1.8}/>
          </div>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: category.accent, letterSpacing: '0.18em' }}>SOURCING FROM</div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', marginTop: 1 }}>{category.name}</div>
          </div>
          <button onClick={onBack} style={{
            background: 'rgba(255,255,255,0.14)', border: 'none', color: 'white',
            fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 10, cursor: 'pointer',
            letterSpacing: '0.04em', position: 'relative',
          }}>Change</button>
        </div>

        <div style={{ fontSize: 20, fontWeight: 800, color: TONSE.navy, lineHeight: 1.15, letterSpacing: '-0.02em', marginTop: 18 }}>
          Tell us exactly what you need.
        </div>
        <div style={{ fontSize: 13, color: TONSE.mute, marginTop: 6, lineHeight: 1.45 }}>
          Pick a subcategory so vendors can quote accurately.
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 20px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'white', border: `1.5px solid ${TONSE.line}`,
          borderRadius: 14, padding: '10px 14px',
        }}>
          <Icon name="search" size={16} stroke={TONSE.mute}/>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search in ${category.name}…`}
            style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, color: TONSE.ink, background: 'transparent', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Subcategory list/grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 140px' }}>
        {tweaks.subLayout === 'list' && <SubList items={list} picked={picked} onPick={setPicked} accent={category.accent}/>}
        {tweaks.subLayout === 'chips' && <SubChips items={list} picked={picked} onPick={setPicked} accent={category.accent}/>}
        {tweaks.subLayout === 'cards' && <SubCards items={list} picked={picked} onPick={setPicked} accent={category.accent}/>}

        {/* "Don't see it?" footer */}
        <button style={{
          marginTop: 14, width: '100%', background: 'transparent',
          border: `1.5px dashed ${TONSE.line}`, color: TONSE.navy,
          borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 700,
          textAlign: 'center', cursor: 'pointer', fontFamily: 'inherit',
        }}>
          + Can't find it? Describe your own
        </button>
      </div>

      {/* Sticky CTA */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 20px 28px',
        background: 'linear-gradient(180deg, rgba(244,245,248,0) 0%, rgba(244,245,248,0.95) 30%, #F4F5F8 100%)',
      }}>
        <button
          disabled={!picked}
          onClick={() => onContinue(picked)}
          style={{
            width: '100%', padding: '16px',
            background: picked ? TONSE.navy : '#D7DBE4',
            color: picked ? 'white' : '#9BA3B0',
            border: 'none', borderRadius: 18,
            fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
            cursor: picked ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            boxShadow: picked ? '0 18px 32px -14px rgba(14,41,84,0.5)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all .2s ease',
          }}>
          {picked ? <>Continue with <span style={{ opacity: 0.7, fontWeight: 600 }}>{picked.name}</span></> : 'Pick a subcategory'}
          {picked && <Icon name="chevron" size={18} stroke="white" sw={2.2}/>}
        </button>
      </div>
    </div>
  );
}

// — Subcategory: LIST (richest, default) ──────────────────────────────────────
const SubList = ({ items, picked, onPick, accent }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {items.map(s => {
      const active = picked?.name === s.name;
      return (
        <button key={s.name} onClick={() => onPick(s)} style={{
          background: active ? accent + '0F' : 'white',
          border: `1.5px solid ${active ? accent : TONSE.line}`,
          borderRadius: 16, padding: '14px 14px',
          display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', textAlign: 'left',
          fontFamily: 'inherit', transition: 'all .15s ease',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11,
            background: active ? accent : accent + '18',
            color: active ? 'white' : accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name={s.icon} size={20} stroke={active ? 'white' : accent} sw={1.8}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TONSE.navy, letterSpacing: '-0.01em' }}>{s.name}</div>
            <div style={{ fontSize: 11.5, color: TONSE.mute, marginTop: 2 }}>{s.eg}</div>
          </div>
          {active ? (
            <div style={{
              width: 22, height: 22, borderRadius: 99, background: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="check" size={14} stroke="white" sw={2.5}/>
            </div>
          ) : (
            <div style={{ width: 22, height: 22, borderRadius: 99, border: `1.5px solid ${TONSE.line}` }}/>
          )}
        </button>
      );
    })}
  </div>
);

// — Subcategory: CHIPS (compact pills) ────────────────────────────────────────
const SubChips = ({ items, picked, onPick, accent }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {items.map(s => {
      const active = picked?.name === s.name;
      return (
        <button key={s.name} onClick={() => onPick(s)} style={{
          background: active ? accent : 'white',
          color: active ? 'white' : TONSE.navy,
          border: `1.5px solid ${active ? accent : TONSE.line}`,
          borderRadius: 99, padding: '10px 14px 10px 12px',
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
          letterSpacing: '-0.01em',
        }}>
          <Icon name={s.icon} size={16} stroke={active ? 'white' : accent} sw={2}/>
          {s.name}
        </button>
      );
    })}
  </div>
);

// — Subcategory: CARDS (visual tiles, 2 col) ──────────────────────────────────
const SubCards = ({ items, picked, onPick, accent }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
    {items.map(s => {
      const active = picked?.name === s.name;
      return (
        <button key={s.name} onClick={() => onPick(s)} style={{
          background: active ? accent : 'white',
          color: active ? 'white' : TONSE.navy,
          border: `1.5px solid ${active ? accent : TONSE.line}`,
          borderRadius: 18, padding: '16px 14px 14px',
          display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left', minHeight: 130,
          position: 'relative',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: active ? 'rgba(255,255,255,0.18)' : accent + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={s.icon} size={20} stroke={active ? 'white' : accent} sw={1.8}/>
          </div>
          <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{s.name}</div>
            <div style={{ fontSize: 10.5, color: active ? 'rgba(255,255,255,0.75)' : TONSE.mute, marginTop: 4, fontWeight: 500, lineHeight: 1.3 }}>{s.eg}</div>
          </div>
          {active && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              width: 22, height: 22, borderRadius: 99, background: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="check" size={14} stroke={accent} sw={2.5}/>
            </div>
          )}
        </button>
      );
    })}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE CONFIRMATION (the destination after subcategory pick)
// ═══════════════════════════════════════════════════════════════════════════
function InquiryDraftScreen({ category, sub, onBack }) {
  return (
    <div data-screen-label="03 Inquiry details" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: TONSE.bg }}>
      <Header step={3} onBack={onBack} title="Item details"/>
      <StepBar step={3}/>
      <div style={{ padding: '24px 20px', flex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: TONSE.navy, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
          Got it — tell vendors what you need.
        </div>

        <div style={{
          marginTop: 20, background: 'white', border: `1px solid ${TONSE.line}`, borderRadius: 18,
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, background: category.accent + '18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={sub.icon} size={20} stroke={category.accent} sw={1.8}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: TONSE.mute, letterSpacing: '0.18em' }}>{category.name.toUpperCase()}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: TONSE.navy, marginTop: 1, letterSpacing: '-0.01em' }}>{sub.name}</div>
          </div>
          <button onClick={onBack} style={{
            background: '#F4F5F8', border: 'none', color: TONSE.navy,
            fontSize: 11, fontWeight: 700, padding: '6px 10px', borderRadius: 10, cursor: 'pointer',
          }}>Edit</button>
        </div>

        <div style={{ marginTop: 22, color: TONSE.mute, fontSize: 13, lineHeight: 1.5, padding: '20px', background: 'white', border: `1px dashed ${TONSE.line}`, borderRadius: 18, textAlign: 'center' }}>
          <div style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 11, color: '#94A3B8', letterSpacing: '0.06em' }}>
            ─────── inquiry form ───────
          </div>
          <div style={{ marginTop: 10 }}>
            Title, description, quantity & deadline live here.<br/>
            <span style={{ color: TONSE.navy, fontWeight: 700 }}>(Not part of this redesign.)</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 20px 28px' }}>
        <button style={{
          width: '100%', padding: '16px',
          background: TONSE.amber, color: TONSE.navy,
          border: 'none', borderRadius: 18,
          fontSize: 15, fontWeight: 800, letterSpacing: '0.04em',
          textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 18px 32px -14px rgba(240,165,0,0.6)',
        }}>
          Send inquiry
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FLOW WRAPPER (handles navigation between the 2 redesigned screens)
// ═══════════════════════════════════════════════════════════════════════════
function CategoryFlow({ tweaks, setTweak }) {
  const [stage, setStage] = useState('master'); // 'master' | 'sub' | 'draft'
  const [category, setCategory] = useState(null);
  const [sub, setSub] = useState(null);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Slide visible={stage === 'master'} direction={stage === 'master' ? 'in' : 'left'}>
        <MasterCategoryScreen
          tweaks={tweaks}
          setTweak={setTweak}
          onPick={c => { setCategory(c); setStage('sub'); }}
        />
      </Slide>
      <Slide visible={stage === 'sub'} direction={stage === 'sub' ? 'in' : stage === 'master' ? 'right' : 'left'}>
        {category && <SubcategoryScreen
          tweaks={tweaks}
          category={category}
          onBack={() => setStage('master')}
          onContinue={s => { setSub(s); setStage('draft'); }}
        />}
      </Slide>
      <Slide visible={stage === 'draft'} direction={stage === 'draft' ? 'in' : 'right'}>
        {category && sub && <InquiryDraftScreen category={category} sub={sub} onBack={() => setStage('sub')}/>}
      </Slide>
    </div>
  );
}

const Slide = ({ visible, direction, children }) => (
  <div style={{
    position: 'absolute', inset: 0,
    transform: visible ? 'translateX(0)' : direction === 'left' ? 'translateX(-100%)' : 'translateX(100%)',
    opacity: visible ? 1 : 0,
    transition: 'transform .35s cubic-bezier(.4,0,.2,1), opacity .25s ease',
    pointerEvents: visible ? 'auto' : 'none',
  }}>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout":    "grid",
  "subLayout": "list",
  "deviceDark": false
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  return (
    <div style={{
      minHeight: '100dvh', background: '#E9EBF0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
    }}>
      <IOSDevice width={390} height={844} dark={false}>
        <CategoryFlow tweaks={tweaks} setTweak={setTweak}/>
      </IOSDevice>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Master category layout" subtitle="How the 10 top-level categories are presented">
          <TweakRadio value={tweaks.layout} onChange={v => setTweak('layout', v)}
            options={[
              { value: 'grid',   label: 'Grid' },
              { value: 'mosaic', label: 'Mosaic' },
              { value: 'list',   label: 'List' },
            ]}/>
        </TweakSection>
        <TweakSection title="Subcategory layout" subtitle="How items inside a category are listed">
          <TweakRadio value={tweaks.subLayout} onChange={v => setTweak('subLayout', v)}
            options={[
              { value: 'list',  label: 'Detail list' },
              { value: 'cards', label: 'Tile cards' },
              { value: 'chips', label: 'Pill chips' },
            ]}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
