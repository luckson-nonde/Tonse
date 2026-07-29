export interface FieldSchema {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'date' | 'datetime' | 'daterange' | 'currency' | 'image_upload' | 'guided_capture' | 'toggle' | 'counter' | 'gps';
  placeholder?: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  helpText?: string;
  group?: string;
  dependsOn?: {
    field: string;
    /** Exact match for a scalar; ANY-of match when an array (e.g. every
     *  urgency option that means "not immediate" reveals the same field). */
    value: any;
  };
  /** Force this field to stay visible in EXPRESS mode even when not required.
   *  Use for category-specific optional fields that materially shape the quote
   *  (cuisine for catering, decor style for decor, planning stage for planning).
   *  Without it the EXPRESS filter strips them and the form looks generic. */
  keepInExpress?: boolean;
  /** image_upload only: also accept application/pdf (payslips, bank
   *  statements, and other documents that arrive as either a photo or a
   *  scanned PDF depending on how the issuer provides them). */
  allowPdf?: boolean;
  /** image_upload only: per-field cap on number of files. Defaults to 5. */
  maxFiles?: number;

  /* ── guided_capture only ──────────────────────────────────────────────
   * A coached photo slot: the buyer is shown an alignment outline for the
   * body part in question, takes the photo, then sees it back BEHIND the
   * same outline to check their framing before committing. Always exactly
   * one image per slot — `maxFiles` / `allowPdf` do not apply.
   *
   * The optional "inspiration" slot beside it is its own FieldSchema entry
   * carrying `pairedWith`, NOT a nested descriptor: a key that isn't a real
   * schema member gets stripped by zod at submit and is invisible to the
   * provider's lead view (both consumers walk the schema array). */

  /** Which alignment outline to draw. */
  guideKind?: 'face' | 'hands' | 'hair' | 'feet' | 'inspo';
  /** Camera hint — `user` = front (selfie), `environment` = rear. Phones
   *  honour it; desktops ignore it and open a plain file picker. */
  cameraFacing?: 'user' | 'environment';
  /** One-line instruction under the capture sheet's title. */
  sheetLede?: string;
  /** Framing tips listed in the capture sheet. */
  tips?: string[];
  /** Marks this field as the partner slot of the named guided_capture
   *  field, which renders both. Set = never renders a row of its own. */
  pairedWith?: string;
}

export interface Category {
  id: string;
  name: string;
  baseName?: string;
  type?: 'buy' | 'repair' | 'restore';
  image?: string;
  parentId: string | null;
  formSchema?: FieldSchema[];
}
