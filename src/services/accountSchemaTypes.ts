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
  // Limit this nav item to specific BusinessType values (e.g.
  // ['REPAIR_SERVICE', 'PRODUCTS_AND_REPAIR']). When omitted, the item is
  // shown regardless of business type. Resolved via getBusinessType(user)
  // in services/categories.ts.
  businessTypes?: string[];
}

export interface MasterAccountSchema {
  schemaType: SchemaType;
  navigation: NavigationItem[];
  views: Record<string, ViewDefinition>;
}
