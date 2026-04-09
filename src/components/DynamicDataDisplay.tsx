import React from 'react';
import { FieldSchema } from '../services/categories';

interface DynamicDataDisplayProps {
  schema: FieldSchema[];
  attributes: Record<string, any>;
}

export default function DynamicDataDisplay({ schema, attributes }: DynamicDataDisplayProps) {
  // Group attributes by their schema group
  const groupedData: Record<string, { label: string; value: any; type: string }[]> = {};
  const ungroupedData: { label: string; value: any; type: string }[] = [];

  schema.forEach(field => {
    const value = attributes[field.name];
    if (value === undefined || value === null || value === '') return;

    const item = {
      label: field.label,
      value,
      type: field.type
    };

    if (field.group) {
      if (!groupedData[field.group]) {
        groupedData[field.group] = [];
      }
      groupedData[field.group].push(item);
    } else {
      ungroupedData.push(item);
    }
  });

  const renderValue = (item: { label: string; value: any; type: string }) => {
    if (item.type === 'image_upload' && Array.isArray(item.value)) {
      return (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {item.value.map((url, idx) => (
            <div key={`${url}-${idx}`} className="aspect-square rounded-lg overflow-hidden border border-slate-100 shadow-sm">
              <img src={url} alt={`${item.label} ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>
      );
    }

    if (item.type === 'toggle') {
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.value ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
          {item.value ? 'Yes' : 'No'}
        </span>
      );
    }

    if (item.type === 'currency') {
      return <span className="font-mono font-semibold text-[#C9973A]">ZMW {Number(item.value).toLocaleString()}</span>;
    }

    return <span className="text-slate-700">{String(item.value)}</span>;
  };

  return (
    <div className="space-y-6">
      {ungroupedData.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {ungroupedData.map((item, idx) => (
            <div key={`ungrouped-${item.label}-${idx}`} className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{item.label}</span>
              <div className="text-sm">{renderValue(item)}</div>
            </div>
          ))}
        </div>
      )}

      {Object.entries(groupedData).map(([groupName, items]) => (
        <div key={groupName} className="space-y-3">
          <h4 className="text-[11px] font-bold text-[#C9973A] uppercase tracking-[0.1em] border-b border-[#C9973A]/10 pb-1">
            {groupName}
          </h4>
          <div className="grid grid-cols-1 gap-4">
            {items.map((item, idx) => (
              <div key={`grouped-${groupName}-${item.label}-${idx}`} className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{item.label}</span>
                <div className="text-sm">{renderValue(item)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
