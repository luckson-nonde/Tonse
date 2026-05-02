import React from 'react';
import ProductManagement from '../../pages/ProductManagement';
import { getBusinessType } from '../../services/categories';

interface ProviderProductsViewProps {
  user: any;
}

export default function ProviderProductsView({ user }: ProviderProductsViewProps) {
  // Title varies by business type so a SELLER who picked Event Equipment
  // Rental sees "Inventory Management" (rental-stock framing), a repair
  // shop sees "Service Catalog", a wholesaler sees "Stock & Pricing", and
  // a generic retail seller keeps "Product Management".
  const businessType = getBusinessType(user as any);
  let title = 'Product Management';
  let subtitle = "Manage your shop's listed products";
  switch (businessType) {
    case 'EVENTS':
      title = 'Inventory Management';
      subtitle = 'Manage your event equipment and services';
      break;
    case 'REPAIR_SERVICE':
      title = 'Service Catalog';
      subtitle = 'Repair services you offer to customers';
      break;
    case 'PRO_SERVICES':
      title = 'Service Catalog';
      subtitle = 'Services you offer to clients';
      break;
    case 'WHOLESALE':
      title = 'Stock & Pricing';
      subtitle = 'Bulk inventory and tier pricing';
      break;
    case 'PRODUCTS_AND_REPAIR':
      title = 'Catalog';
      subtitle = 'Products you sell and services you repair';
      break;
    default:
      break;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col px-0 sm:px-0">
        <h2 className="text-2xl font-serif font-bold text-slate-900">{title}</h2>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">
          {subtitle}
        </p>
      </div>
      <ProductManagement />
    </div>
  );
}
