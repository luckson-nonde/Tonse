import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { FieldSchema } from '../services/categories';
import SecureFile, { isSecureFileUrl } from './SecureFile';

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
            // Auth-gated docs (payslips, statements) need the Bearer token and
            // may be PDFs — SecureFile handles both. A plain <img> would 401.
            if (isSecureFileUrl(url)) {
              return (
                <div
                  key={`${url}-${idx}`}
                  className="aspect-square rounded-lg overflow-hidden border border-slate-100 shadow-sm"
                >
                  <SecureFile
                    url={url}
                    alt={`${item.label} ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            }
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

    // Picker values are ISO strings — show them as humans read them, not
    // raw "2026-08-02T14:00". Anything malformed falls through unformatted.
    if (item.type === 'datetime' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(item.value))) {
      const parsed = parseISO(String(item.value));
      return (
        <span className="text-slate-900 font-black">
          {format(parsed, 'EEE, d MMM yyyy')} · {format(parsed, 'HH:mm')}
        </span>
      );
    }
    if (item.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(String(item.value))) {
      return (
        <span className="text-slate-900 font-black">
          {format(parseISO(String(item.value)), 'EEE, d MMM yyyy')}
        </span>
      );
    }

    return <span className="text-slate-900 font-black">{String(item.value)}</span>;
  };

  return (
    <div className="space-y-8">
      {ungroupedData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
          {ungroupedData.map((item, idx) => (
            <div key={`ungrouped-${item.label}-${idx}`} className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">
                {item.label}
              </span>
              <div className="text-[15px] font-black text-slate-900 leading-tight">
                {renderValue(item)}
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.entries(groupedData).map(([groupName, items]) => (
        <div key={groupName} className="space-y-7 pt-4">
          {/* Group header sits in slate-700 with a thin slate rule —
              the earlier gold treatment competed with the category
              pill and the total amount for the eye. Premium uses one
              accent at a time. */}
          <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-[0.28em] flex items-center gap-3 pb-3 border-b border-slate-200">
            <span className="block w-6 h-px bg-slate-300" />
            {groupName}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
            {items.map((item, idx) => (
              <div
                key={`grouped-${groupName}-${item.label}-${idx}`}
                className="flex flex-col"
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">
                  {item.label}
                </span>
                <div className="text-[15px] font-black text-slate-900 leading-tight">
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
