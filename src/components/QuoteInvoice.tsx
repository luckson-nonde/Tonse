import React from 'react';
import { Quote, Inquiry } from '../types';
import { robustParse } from '../utils/jsonUtils';

interface QuoteInvoiceProps {
  quote: Quote;
  inquiry?: Inquiry;
  isPreview?: boolean;
}

export default function QuoteInvoice({ quote, inquiry, isPreview = false }: QuoteInvoiceProps) {
  const dynamicFields = robustParse(quote.dynamicFields) || {};
  const delivery = robustParse(quote.delivery) || {};
  const buyerContact = robustParse(quote.buyerContact) || {};
  const itemPrices = (quote.itemPrices as any[] | undefined) || [];
  const requirements = (quote.requirements as any[] | undefined) || [];

  const printStyles = `
    @media print {
      body { margin: 0; padding: 0; }
      .print-container { page-break-after: always; }
      .no-print { display: none; }
      button { display: none; }
    }
  `;

  const containerClass = isPreview
    ? 'max-w-4xl mx-auto bg-white p-8 rounded-lg border border-slate-200'
    : 'w-full';

  return (
    <>
      <style>{printStyles}</style>
      <div className={`print-container ${containerClass}`}>
        {/* Header */}
        <div className="mb-8 pb-8 border-b-2 border-slate-200">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-black text-brand-dark mb-1">QUOTATION</h1>
              <p className="text-sm text-slate-500">Quote ID: {quote.id}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
              <p className="text-sm font-bold text-brand-dark">
                {new Date(quote.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Provider Info */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                From
              </p>
              <div className="space-y-1">
                <p className="text-lg font-bold text-brand-dark">{quote.providerName}</p>
                <p className="text-sm text-slate-600">Provider ID: {quote.providerId}</p>
              </div>
            </div>
            <div>
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Inquiry Reference
              </p>
              <div className="space-y-1">
                <p className="text-lg font-bold text-brand-dark">{quote.inquiryTitle}</p>
                <p className="text-sm text-slate-600">Inquiry ID: {quote.inquiryId}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Quote Details */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-brand-dark mb-4">Quote Details</h2>

          <table className="w-full border-collapse mb-6">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-3 pr-4">
                  <p className="text-[12px] font-bold text-slate-400 uppercase">Total Price</p>
                </td>
                <td className="py-3 text-right">
                  <p className="text-2xl font-black text-brand-dark">
                    ZMW {Number(quote.price).toLocaleString()}
                  </p>
                </td>
              </tr>
              {dynamicFields.rateUnit && (
                <tr className="border-b border-slate-200">
                  <td className="py-3 pr-4">
                    <p className="text-[12px] font-bold text-slate-400 uppercase">Rate Unit</p>
                  </td>
                  <td className="py-3 text-right">
                    <p className="text-sm font-medium text-slate-700">{dynamicFields.rateUnit}</p>
                  </td>
                </tr>
              )}
              {quote.condition && quote.condition !== 'N/A' && (
                <tr className="border-b border-slate-200">
                  <td className="py-3 pr-4">
                    <p className="text-[12px] font-bold text-slate-400 uppercase">Condition</p>
                  </td>
                  <td className="py-3 text-right">
                    <p className="text-sm font-medium text-slate-700">{quote.condition}</p>
                  </td>
                </tr>
              )}
              {quote.expiryDuration && (
                <tr className="border-b border-slate-200">
                  <td className="py-3 pr-4">
                    <p className="text-[12px] font-bold text-slate-400 uppercase">Valid Until</p>
                  </td>
                  <td className="py-3 text-right">
                    <p className="text-sm font-medium text-slate-700">{quote.expiryDuration}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Message */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
            <p className="text-[12px] font-bold text-slate-400 uppercase mb-2">Provider Message</p>
            <p className="text-sm text-slate-700 italic">{quote.message}</p>
          </div>

          {/* Additional Charges */}
          {(quote.cleaningFee || quote.damageDeposit || dynamicFields.securityDeposit) && (
            <div className="mb-6">
              <p className="text-[12px] font-bold text-slate-400 uppercase mb-3">
                Additional Charges
              </p>
              <table className="w-full">
                <tbody>
                  {quote.cleaningFee && (
                    <tr className="border-b border-slate-100">
                      <td className="py-2">Cleaning Fee</td>
                      <td className="py-2 text-right font-medium">
                        ZMW {Number(quote.cleaningFee).toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {quote.damageDeposit && (
                    <tr className="border-b border-slate-100">
                      <td className="py-2">Damage Deposit</td>
                      <td className="py-2 text-right font-medium">
                        ZMW {Number(quote.damageDeposit).toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {dynamicFields.securityDeposit && (
                    <tr className="border-b border-slate-100">
                      <td className="py-2">Security Deposit</td>
                      <td className="py-2 text-right font-medium">
                        ZMW {Number(dynamicFields.securityDeposit).toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Item Prices Breakdown */}
        {itemPrices.length > 0 && (
          <div className="mb-8 page-break-avoid">
            <h2 className="text-lg font-bold text-brand-dark mb-4">Item Breakdown</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-brand-dark">
                  <th className="text-left py-3 px-2 text-[12px] font-bold uppercase text-slate-600">
                    Item
                  </th>
                  <th className="text-right py-3 px-2 text-[12px] font-bold uppercase text-slate-600">
                    Qty
                  </th>
                  <th className="text-right py-3 px-2 text-[12px] font-bold uppercase text-slate-600">
                    Unit Price
                  </th>
                  <th className="text-right py-3 px-2 text-[12px] font-bold uppercase text-slate-600">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {itemPrices.map((item: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3 px-2 text-sm">
                      {item.name || item.item || item.description || `Item ${i + 1}`}
                    </td>
                    <td className="py-3 px-2 text-right text-sm">{item.quantity || '-'}</td>
                    <td className="py-3 px-2 text-right text-sm">
                      {item.unitPrice ? `ZMW ${Number(item.unitPrice).toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-bold">
                      ZMW {Number(item.total || item.price || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* What's Included */}
        {(dynamicFields.whatIsIncluded ||
          (Array.isArray(dynamicFields.venueAmenities) &&
            dynamicFields.venueAmenities.length > 0)) && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brand-dark mb-4">What's Included</h2>
            {dynamicFields.whatIsIncluded && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {dynamicFields.whatIsIncluded}
                </p>
              </div>
            )}
            {Array.isArray(dynamicFields.venueAmenities) &&
              dynamicFields.venueAmenities.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {dynamicFields.venueAmenities.map((amenity: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded"
                    >
                      <span className="text-brand-dark font-bold">✓</span>
                      <span className="text-sm text-slate-700">{amenity}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* Requirements/Specifications */}
        {requirements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brand-dark mb-4">
              Requirements & Specifications
            </h2>
            <table className="w-full border-collapse">
              <tbody>
                {requirements.map((req: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3 px-2">
                      <p className="font-medium text-slate-700">
                        {req.name || req.title || req.requirement || `Requirement ${i + 1}`}
                      </p>
                      {req.description && (
                        <p className="text-xs text-slate-500 mt-1">{req.description}</p>
                      )}
                    </td>
                    {req.quantity && (
                      <td className="py-3 px-2 text-right text-sm text-slate-600">
                        Qty: {req.quantity}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Delivery & Pickup */}
        {(quote.pickupLocation || quote.collectionCode || Object.keys(delivery).length > 0) && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brand-dark mb-4">
              Delivery & Pickup Information
            </h2>
            <div className="space-y-2">
              {quote.pickupLocation && (
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-[12px] font-bold text-slate-400 uppercase mb-1">
                    Pickup Location
                  </p>
                  <p className="text-sm text-slate-700">{quote.pickupLocation}</p>
                </div>
              )}
              {quote.collectionCode && (
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-[12px] font-bold text-slate-400 uppercase mb-1">
                    Collection Code
                  </p>
                  <p className="text-sm font-mono font-bold text-brand-dark">
                    {quote.collectionCode}
                  </p>
                </div>
              )}
              {Object.entries(delivery).map(
                ([key, value]: [string, any]) =>
                  value && (
                    <div key={key} className="p-3 bg-slate-50 rounded border border-slate-200">
                      <p className="text-[12px] font-bold text-slate-400 uppercase mb-1">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-sm text-slate-700">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </p>
                    </div>
                  )
              )}
            </div>
          </div>
        )}

        {/* Buyer Contact Information */}
        {Object.keys(buyerContact).length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-brand-dark mb-4">Buyer Contact Information</h2>
            <div className="space-y-2">
              {Object.entries(buyerContact).map(
                ([key, value]: [string, any]) =>
                  value && (
                    <div key={key} className="p-3 bg-slate-50 rounded border border-slate-200">
                      <p className="text-[12px] font-bold text-slate-400 uppercase mb-1">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-sm text-slate-700">{String(value)}</p>
                    </div>
                  )
              )}
            </div>
          </div>
        )}

        {/* Inquiry Reference */}
        {inquiry && (
          <div className="mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h2 className="text-lg font-bold text-brand-dark mb-3">Original Inquiry</h2>
            <p className="font-bold text-slate-700 mb-2">{inquiry.title}</p>
            {inquiry.description && (
              <p className="text-sm text-slate-600 mb-3">{inquiry.description}</p>
            )}
            {inquiry.attributes && Object.keys(inquiry.attributes).length > 0 && (
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(inquiry.attributes).map(
                    ([key, value]) =>
                      !['description', 'title'].includes(key) &&
                      value && (
                        <tr key={key} className="border-b border-slate-200">
                          <td className="py-2 pr-4 font-bold text-slate-600">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </td>
                          <td className="py-2 text-slate-700">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </td>
                        </tr>
                      )
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Status & Dates */}
        <div className="border-t-2 border-slate-200 pt-8 mt-8">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-[12px] font-bold text-slate-400 uppercase mb-1">Quote Status</p>
              <p className="text-sm font-bold text-brand-dark capitalize">{quote.status}</p>
            </div>
            <div>
              <p className="text-[12px] font-bold text-slate-400 uppercase mb-1">Created</p>
              <p className="text-sm text-slate-700">
                {new Date(quote.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-slate-500 text-center">
            This quotation is valid until {quote.expiryDuration || '7 days'} from the issue date.
            {quote.processType === 'EXPRESS'
              ? ' Express process - immediate service upon payment.'
              : ' Standard process - requires purchase order.'}
          </p>
        </div>
      </div>
    </>
  );
}
