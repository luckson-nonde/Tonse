export type SchemaType = 'BUYER' | 'PROVIDER' | 'LABOUR';

export interface DashboardAction {
  id: string;
  label: string;
  icon: string;
  type: 'navigate' | 'modal' | 'action';
  target?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: string | number;
  unit?: string | number;
  trend?: { value: number; isPositive: boolean };
  icon: string;
  permissions?: string[];
  roleFilter?: string[];
  excludeRoles?: string[];
}

export interface ViewDefinition {
  title: string | ((role: string) => string);
  subtitle: string | ((role: string) => string);
  actions?: DashboardAction[];
  metrics?: DashboardMetric[];
  showWalletCard?: boolean;
  showAnalyticsChart?: boolean;
  componentType:
    | 'dashboard_grid'
    | 'list_renderer'
    | 'details_renderer'
    | 'profile_renderer'
    | 'provider_placeholder'
    | 'provider_home'
    | 'provider_leads'
    | 'provider_quotes'
    | 'provider_orders'
    | 'provider_products'
    | 'provider_schedule'
    | 'provider_team'
    | 'provider_collection'
    | 'loan_requests'
    | 'loan_offers'
    | 'loan_home'
    | 'loan_terms'
    | 'home_renderer'
    | 'leads_renderer'
    | 'paid_orders_renderer'
    | 'quotes_renderer'
    | 'products_renderer'
    | 'schedule_renderer'
    | 'team_renderer'
    | 'collection_renderer'
    | 'audit_trail_renderer'
    | 'venue_spaces_renderer'
    | 'financial_renderer'
    | 'labour_home'
    | 'labour_jobs'
    | 'labour_quotes'
    | 'labour_schedule';
  dataKey?: string;
  permissions?: string[];
  roleFilter?: string[];
}

export interface NavigationItem {
  id: string;
  label: string | ((role: string) => string);
  icon: string;
  permissions?: string[];
  roleFilter?: string[];
  excludeRoles?: string[];
  categoryFilter?: string[] | ((role: string, categories: string[]) => boolean);
  // Limit this nav item to specific BusinessType values (e.g. ['REPAIR',
  // 'WHOLESALE']). When omitted, the item is shown regardless of
  // business type. Resolved via getBusinessTypes(user) in services/
  // categories.ts. (Phase 1.5 retired the legacy collapsed types like
  // REPAIR_SERVICE / PRODUCTS_AND_REPAIR.)
  businessTypes?: string[];
  // Which sidebar section this item lives in. Absent / 'core' = the always-on
  // top group; 'contextual' = the "Your Activity" section below, whose tabs
  // only surface once the buyer has interacted with the related category.
  group?: 'core' | 'contextual';
  // Activity-trigger key (e.g. 'loans'). When set, the item is HIDDEN unless
  // the corresponding activity signal is true (see activitySignals in
  // DashboardLayout). Lets a category tab appear only after the buyer inquires
  // in that category / receives a related offer. Future: 'events', etc.
  requiresActivity?: string;
}

export interface MasterAccountSchema {
  schemaType: SchemaType;
  navigation: NavigationItem[];
  views: Record<string, ViewDefinition>;
}
