import type { FieldSchema } from '../types';

/**
 * Beauty — mostly booked services, one retail sub.
 *
 * The five service subs (skincare, makeup, haircare-as-service, nails,
 * lashes & brows, pedicure) share one deliberate shape: a GUIDED PHOTO of
 * how the client looks right now, an occasion, and a description. Nothing
 * else. A provider quoting a face of makeup or a set of nails needs to see
 * the starting point far more than they need a dropdown of product SKUs —
 * and the technical detail (what gets applied, which products) belongs on
 * their quote, where it justifies the price. See
 * QUOTE_SCHEMA_BY_CATEGORY_ID in quoteSchemaGenerator.ts.
 *
 * Each guided capture is paired with an OPTIONAL inspiration slot carrying
 * `pairedWith` — a real schema field (so zod keeps it and the provider's
 * lead view shows it) that the primary renders beside itself.
 *
 * Fragrances is the exception: buying a bottle of perfume is retail, so it
 * keeps its product form and has no photo of the buyer.
 */

/** Every service sub closes with the same budget / when-do-you-need-it tail. */
const scheduleTail: FieldSchema[] = [
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false, helpText: "Optional — leave blank and providers quote their own price." },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
];

/** The optional "look you want" slot that sits beside a guided capture. */
const inspirationSlot = (pairedWith: string): FieldSchema => ({
  name: "inspirationImages",
  label: "The look you want",
  type: "guided_capture",
  required: false,
  guideKind: "inspo",
  pairedWith,
  helpText: "Screenshot, saved photo, anything.",
});

export const skincareSchema: FieldSchema[] = [
  { name: "images", label: "Your skin now", type: "guided_capture", required: true, keepInExpress: true, guideKind: "face", cameraFacing: "user", helpText: "Therapists quote on what they can see — this photo is the whole brief.", sheetLede: "Fit your face inside the outline, eyes on the dotted line.", tips: ["Bare skin — no makeup, no filter", "Face a window; avoid overhead light", "Hair off your face", "Get close enough to show the concern"] },
  inspirationSlot("images"),
  { name: "occasion", label: "What Do You Need?", type: "select", required: true, keepInExpress: true, options: ["Facial / deep cleanse", "Acne treatment", "Dark spots & pigmentation", "Anti-ageing treatment", "Brightening / glow-up", "Before an event", "Skin consultation", "Other"] },
  { name: "description", label: "Describe Your Skin & What You Want", type: "textarea", required: true, keepInExpress: true, min: 10, placeholder: "e.g. Oily skin with breakouts on my cheeks for the last 3 months. I want it calmer before my wedding in June. Sensitive to strong scrubs." },
  ...scheduleTail,
];

export const makeupCosmeticsSchema: FieldSchema[] = [
  { name: "images", label: "Your face now", type: "guided_capture", required: true, keepInExpress: true, guideKind: "face", cameraFacing: "user", helpText: "Artists quote on the gap between your bare face and the look you want.", sheetLede: "Fit your face inside the outline, eyes on the dotted line.", tips: ["Bare face — no makeup, no filter", "Face a window; avoid overhead light", "Hair off your face", "Hold the phone at eye level"] },
  inspirationSlot("images"),
  { name: "occasion", label: "What's the Occasion?", type: "select", required: true, keepInExpress: true, options: ["Wedding — bride", "Wedding — bridal party", "Kitchen party / Chilanga Mulilo", "Graduation", "Birthday / dinner", "Photoshoot", "Church or work — everyday", "Other"] },
  { name: "description", label: "Describe the Look You Want", type: "textarea", required: true, keepInExpress: true, min: 10, placeholder: "e.g. Soft bridal glam, matte finish, matching my dress colour. I have oily skin." },
  ...scheduleTail,
];

/**
 * Haircare is the one sub that serves BOTH a booking and a shop order — the
 * existing "What do you need?" split stays, and the guided photo only appears
 * for the service answers. Asking someone ordering shampoo to photograph the
 * back of their head would be nonsense.
 */
export const haircareSchema: FieldSchema[] = [
  { name: "serviceOrProduct", label: "What do you need?", type: "select", required: true, keepInExpress: true, options: ["Hair Service", "Hair Extensions / Weave", "Wigs", "Hair Product", "Hair Tools"] },
  { name: "images", label: "Your hair now", type: "guided_capture", required: true, keepInExpress: true, guideKind: "hair", cameraFacing: "environment", helpText: "Stylists price on your actual length and condition.", sheetLede: "Ask someone to take it from behind, head inside the outline.", tips: ["Hair loose, dry and undone", "Stand against a plain wall", "Include your shoulders for length", "Mention a second angle in the notes if it helps"], dependsOn: { field: "serviceOrProduct", value: ["Hair Service", "Hair Extensions / Weave", "Wigs"] } },
  { ...inspirationSlot("images"), dependsOn: { field: "serviceOrProduct", value: ["Hair Service", "Hair Extensions / Weave", "Wigs"] } },
  { name: "occasion", label: "What's the Occasion?", type: "select", required: false, keepInExpress: true, options: ["Wedding", "Kitchen party / Chilanga Mulilo", "Graduation", "Birthday / dinner", "Photoshoot", "Everyday / maintenance", "Other"], dependsOn: { field: "serviceOrProduct", value: ["Hair Service", "Hair Extensions / Weave", "Wigs"] } },
  { name: "hairType", label: "Hair Type", type: "select", required: false, options: ["Natural / Afro", "Relaxed", "Locs / Dreadlocks", "Braided", "Wavy", "Straight", "Curly"] },
  { name: "productType", label: "Product Type", type: "select", required: false, options: ["Shampoo", "Conditioner", "Hair Oil / Serum", "Edge Control", "Hair Cream / Moisturizer", "Hair Colour / Dye", "Hair Treatment / Mask", "Relaxer", "Other"], dependsOn: { field: "serviceOrProduct", value: ["Hair Product", "Hair Tools"] } },
  { name: "brand", label: "Brand Preference", type: "text", required: false, placeholder: "e.g. ORS, Dark & Lovely, Cantu, Any", dependsOn: { field: "serviceOrProduct", value: ["Hair Product", "Hair Tools"] } },
  { name: "quantity", label: "Quantity", type: "counter", required: false, min: 1, dependsOn: { field: "serviceOrProduct", value: ["Hair Product", "Hair Tools"] } },
  { name: "description", label: "Describe What You Want", type: "textarea", required: true, keepInExpress: true, min: 10, placeholder: "e.g. Knotless box braids, waist length, medium size — my hair is natural and shoulder length." },
  ...scheduleTail,
];

export const nailsSchema: FieldSchema[] = [
  { name: "images", label: "Your nails now", type: "guided_capture", required: true, keepInExpress: true, guideKind: "hands", cameraFacing: "environment", helpText: "Techs price on your natural length and what's already on.", sheetLede: "Palm down, fingers spread to match the outline.", tips: ["Remove old polish first if you can", "Rest your hand on a plain surface", "Fill the frame with one hand", "Natural light shows the true colour"] },
  inspirationSlot("images"),
  { name: "occasion", label: "What's the Occasion?", type: "select", required: true, keepInExpress: true, options: ["Wedding — bride", "Wedding — bridal party", "Kitchen party / Chilanga Mulilo", "Graduation", "Birthday / dinner", "Photoshoot", "Everyday / maintenance", "Other"] },
  { name: "description", label: "Describe the Set You Want", type: "textarea", required: true, keepInExpress: true, min: 10, placeholder: "e.g. Medium almond acrylics, nude with gold tips, plus a refill on my toes." },
  ...scheduleTail,
];

export const lashesBrowsSchema: FieldSchema[] = [
  { name: "images", label: "Your lashes & brows now", type: "guided_capture", required: true, keepInExpress: true, guideKind: "face", cameraFacing: "user", helpText: "Technicians quote on your natural lash and brow line.", sheetLede: "Eyes on the dotted line, looking straight at the camera.", tips: ["No mascara or brow pencil", "Eyes open, relaxed brow", "Face a window", "Get close enough to see the hairs"] },
  inspirationSlot("images"),
  { name: "occasion", label: "What's the Occasion?", type: "select", required: true, keepInExpress: true, options: ["Wedding — bride", "Wedding — bridal party", "Kitchen party / Chilanga Mulilo", "Graduation", "Birthday / dinner", "Photoshoot", "Everyday / maintenance", "Other"] },
  { name: "description", label: "Describe What You Want", type: "textarea", required: true, keepInExpress: true, min: 10, placeholder: "e.g. Hybrid lash extensions, natural look, plus brow shaping and tint. I've never had extensions before." },
  ...scheduleTail,
];

export const pedicureSchema: FieldSchema[] = [
  { name: "images", label: "Your feet now", type: "guided_capture", required: true, keepInExpress: true, guideKind: "feet", cameraFacing: "environment", helpText: "Let the tech see what they're working with before quoting.", sheetLede: "One foot inside the outline, toes at the top.", tips: ["Remove old polish first if you can", "Plain floor or towel underneath", "Good light, no shadow across the toes", "Both feet in one shot works too"] },
  inspirationSlot("images"),
  { name: "occasion", label: "What's the Occasion?", type: "select", required: true, keepInExpress: true, options: ["Wedding — bride", "Wedding — bridal party", "Kitchen party / Chilanga Mulilo", "Graduation", "Birthday / dinner", "Photoshoot", "Everyday / maintenance", "Other"] },
  { name: "description", label: "Describe What You Want", type: "textarea", required: true, keepInExpress: true, min: 10, placeholder: "e.g. Full pedicure with callus removal and red gel polish. My heels are quite cracked." },
  ...scheduleTail,
];

export const fragrancesSchema: FieldSchema[] = [
  { name: "images", label: "Reference Photos", type: "image_upload", required: false, helpText: "Upload the specific bottle or fragrance you want" },
  { name: "fragranceType", label: "Type", type: "select", required: true, options: ["Perfume / EDP", "Eau de Toilette", "Body Mist / Spray", "Cologne", "Roll-On", "Arabian / Oud", "Body Oil Fragrance", "Other"] },
  { name: "brand", label: "Brand / Name", type: "text", required: false, placeholder: "e.g. Chanel No.5, Versace Eros, Lattafa Ameer, Any" },
  { name: "scentFamily", label: "Scent Family", type: "select", required: false, options: ["Floral", "Woody / Oud", "Fresh / Citrus", "Oriental / Spicy", "Aquatic", "Gourmand / Sweet", "Musk", "No Preference"] },
  { name: "gender", label: "For Who?", type: "select", required: true, options: ["Men", "Women", "Unisex", "Not Sure"] },
  { name: "size", label: "Bottle Size", type: "select", required: false, options: ["30ml", "50ml", "75ml", "100ml", "150ml+", "Any Size"] },
  { name: "occasion", label: "Occasion", type: "select", required: false, options: ["Everyday", "Office / Work", "Evening / Night Out", "Special Event", "Gift", "Any"] },
  { name: "condition", label: "Condition", type: "select", required: true, options: ["Brand New Sealed", "Used - More than half full", "Any"] },
  { name: "quantity", label: "Quantity", type: "counter", required: true, min: 1 },
  { name: "budget_limit", label: "Budget (ZMW)", type: "currency", required: false },
  { name: "urgency", label: "Urgency", type: "select", required: true, options: ["Immediately", "On a specific date & time"] },
  { name: "preferredDateTime", label: "Preferred Day & Time", type: "datetime", required: true, keepInExpress: true, helpText: "Pick the day that suits you — add a time only if it needs to happen at a specific hour.", dependsOn: { field: "urgency", value: ["On a specific date & time"] } },
  { name: "additionalDetails", label: "Additional Details", type: "textarea", required: false, placeholder: "Any similar scents you like, gift wrapping needed, etc..." }
];
