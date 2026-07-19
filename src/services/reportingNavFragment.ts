import { NavigationItem, ViewDefinition } from './accountSchemaTypes';

/**
 * The "Reporting" sidebar entry + Report Manager view, shared by every
 * transacting schema (buyer, labour, supplier, and each provider archetype).
 * One definition so the eleven schema files can't drift apart — splice
 * REPORTING_NAV_ITEM into `navigation` and REPORTING_VIEW under
 * `views.reporting`.
 *
 * DashboardLayout special-cases id 'reporting' to render this item as its
 * own "Trust & Safety" sidebar card (admin-console visual language) rather
 * than a plain NavLink.
 */
export const REPORTING_NAV_ITEM: NavigationItem = {
  id: 'reporting',
  label: 'Reporting',
  icon: 'Flag',
};

export const REPORTING_VIEW: ViewDefinition = {
  title: 'Report Manager',
  subtitle: 'Your transactions and the reports you have filed',
  componentType: 'report_manager',
};
