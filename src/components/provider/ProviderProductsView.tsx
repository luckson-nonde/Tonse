import React from 'react';
import ProductManagement from '../../pages/ProductManagement';

interface ProviderProductsViewProps {
  user: any;
}

export default function ProviderProductsView({ user }: ProviderProductsViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col px-0 sm:px-0">
        <h2 className="text-2xl font-serif font-bold text-slate-900">
          {user?.role === 'EVENTS' ? 'Inventory Management' : 'Product Management'}
        </h2>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">
          {user?.role === 'EVENTS' ? 'Manage your event equipment and services' : "Manage your shop's listed products"}
        </p>
      </div>
      <ProductManagement />
    </div>
  );
}
