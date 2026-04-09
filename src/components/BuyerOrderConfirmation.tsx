import React from 'react';
import { OrderConfirmation } from '../types';

interface BuyerOrderConfirmationProps {
  orderConfirmation: OrderConfirmation;
}

export default function BuyerOrderConfirmation({ orderConfirmation }: BuyerOrderConfirmationProps) {
  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-2xl font-bold mb-6">Order Confirmation #{orderConfirmation.confirmationReference}</h2>
      
      <div className="space-y-4 mb-8">
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Payment Status:</span>
          <span>{orderConfirmation.paymentStatus}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Processing Time:</span>
          <span>{orderConfirmation.processingTime || 'N/A'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Expected Delivery:</span>
          <span>{orderConfirmation.expectedDeliveryDate || 'N/A'}</span>
        </div>
        {orderConfirmation.notes && (
          <div className="border-b pb-2">
            <span className="font-semibold block mb-1">Seller Notes:</span>
            <p className="text-sm text-slate-600">{orderConfirmation.notes}</p>
          </div>
        )}
      </div>

      <h3 className="font-semibold mb-3">Items:</h3>
      {orderConfirmation.items.map((item) => (
        <div key={item.title} className="flex justify-between py-2 border-b">
          <span>{item.title} x {item.quantity}</span>
        </div>
      ))}
      
      <p className="text-sm text-slate-400 mt-6">Confirmed at: {new Date(orderConfirmation.createdAt).toLocaleString()}</p>
    </div>
  );
}
