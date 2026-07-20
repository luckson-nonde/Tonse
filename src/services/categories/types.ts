export interface FieldSchema {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'date' | 'datetime' | 'daterange' | 'currency' | 'image_upload' | 'toggle' | 'counter' | 'gps';
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
