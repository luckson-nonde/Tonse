import React, { useState } from 'react';
import { FieldSchema } from '../services/categories';

interface DynamicDataDisplayProps {
  schema: FieldSchema[];
  attributes: Record<string, any>;
}

export default function DynamicDataDisplay({ schema, attributes }: DynamicDataDisplayProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  // Group attributes by their schema group
  const groupedData: Record<string, { label: string; value: any; type: string }[]> = {};
  const ungroupedData: { label: string; value: any; type: string }[] = [];

  schema.forEach((field) => {
    const value = attributes[field.name];
    if (value === undefined || value === null || value === '') return;

    const item = {
      label: field.label,
      value,
      type: field.type,
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
    if (item.type === 'image_upload') {
      let imageUrls: string[] = [];

      // Handle different formats of image data
      if (Array.isArray(item.value)) {
        imageUrls = item.value.filter((url) => typeof url === 'string' && url.trim());
      } else if (typeof item.value === 'string' && item.value.trim()) {
        // If it's a concatenated string of URLs, try to split them
        // Match URLs ending with image extensions
        const urlPattern = /https?:\/\/[^\s"'`]+?\.(jpg|jpeg|png|gif|webp)/gi;
        const matches = item.value.match(urlPattern);
        if (matches) {
          imageUrls = matches;
        } else if (item.value.includes(',')) {
          imageUrls = item.value
            .split(',')
            .map((u) => u.trim())
            .filter((u) => u);
        }
      }

      if (imageUrls.length === 0) {
        return <span className="text-slate-500">No images</span>;
      }

      return (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {imageUrls.map((url, idx) => {
            const isFailedImage = failedImages.has(url);
            return !isFailedImage ? (
              <div
                key={`${url}-${idx}`}
                className="aspect-square rounded-lg overflow-hidden border border-slate-100 shadow-sm"
              >
                <img
                  src={url}
                  alt={`${item.label} ${idx}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => {
                    setFailedImages((prev) => new Set(prev).add(url));
                  }}
                />
              </div>
            ) : (
              <div
                key={`${url}-${idx}`}
                className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm flex items-center justify-center"
              >
                <span className="text-xs text-slate-400">Image unavailable</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (item.type === 'toggle') {
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.value ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}
        >
          {item.value ? 'Yes' : 'No'}
        </span>
      );
    }

    if (item.type === 'currency') {
      return (
        <span className="font-mono font-semibold text-[#C9973A]">
          ZMW {Number(item.value).toLocaleString()}
        </span>
      );
    }

    return <span className="text-slate-900">{String(item.value)}</span>;
  };

  return (
    <div className="space-y-8">
      {ungroupedData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7">
          {ungroupedData.map((item, idx) => (
            <div key={`ungrouped-${item.label}-${idx}`} className="flex flex-col gap-2">
              <span className="text-[12px] uppercase tracking-[0.2em] text-slate-600 font-black">
                {item.label}
              </span>
              <div className="text-base font-black text-slate-900 leading-tight">
                {renderValue(item)}
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.entries(groupedData).map(([groupName, items]) => (
        <div key={groupName} className="space-y-6">
          <h4 className="text-[13px] font-black text-[#d49b35] uppercase tracking-[0.25em] border-b-2 border-[#d49b35]/30 pb-3">
            {groupName}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
            {items.map((item, idx) => (
              <div
                key={`grouped-${groupName}-${item.label}-${idx}`}
                className="flex flex-col gap-2.5"
              >
                <span className="text-[12px] uppercase tracking-[0.2em] text-slate-700 font-black">
                  {item.label}
                </span>
                <div className="text-lg font-black text-slate-900 leading-tight">
                  {renderValue(item)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
