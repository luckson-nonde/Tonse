import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function LabourDashboardPlaceholder() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-brand-yellow/10 rounded-3xl flex items-center justify-center mb-6">
        <LayoutDashboard className="w-10 h-10 text-brand-yellow" />
      </div>
      <h1 className="text-3xl font-serif font-bold text-[#1a1612] mb-2">Labour Dashboard</h1>
      <p className="text-slate-500">Coming Soon</p>
    </div>
  );
}
