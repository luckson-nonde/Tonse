import React, { useState } from 'react';
import { DeliveryOrder, PurchaseOrder } from '../types';
import { startCollection } from '../services/deliveryService';
import Button from './Button';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface SellerCollectionScreenProps {
  deliveryOrderId: number;
}

export default function SellerCollectionScreen({ deliveryOrderId }: SellerCollectionScreenProps) {
  const [deliveryOrder, setDeliveryOrder] = useState<DeliveryOrder | null>(null);
  const [po, setPo] = useState<PurchaseOrder | null>(null);

  const handleScan = async () => {
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 }, false);
    scanner.render(
      async (decodedText) => {
        scanner.clear();
        const data = JSON.parse(decodedText);
        // TODO: Fetch from backend API instead of IndexedDB
        // const response = await apiClient.get(`/delivery-orders/${deliveryOrderId}`);
        // if (response.data.inquiryId === data.inquiryId) {
        //   setDeliveryOrder(response.data);
        //   const poResponse = await apiClient.get(`/purchase-orders/${response.data.purchaseOrderId}`);
        //   setPo(poResponse.data);
        // }
        console.warn('SellerCollectionScreen: Backend API not fully integrated yet');
      },
      (err) => console.error(err)
    );
  };

  const handleConfirmHandover = async () => {
    if (deliveryOrderId) {
      await startCollection(deliveryOrderId);
      // TODO: Fetch updated delivery order from backend API
      console.warn('handleConfirmHandover: Backend API not fully integrated yet');
    }
  };

  if (!deliveryOrder || !po) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold mb-6">Verify Buyer Pickup</h2>
        <div id="reader" className="mb-4"></div>
        <Button onClick={handleScan} className="w-full py-4 text-lg">
          Scan QR Code
        </Button>
      </div>
    );
  }

  if (deliveryOrder.status === 'collection_started') {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 text-center">
        <h2 className="text-2xl font-bold mb-6">Waiting for Buyer</h2>
        <p>Waiting for buyer to confirm receipt...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-2xl font-bold mb-6">Verify Items</h2>

      <div className="space-y-4 mb-8">
        {po.lineItems.map((item, idx) => (
          <div key={`${item.name}-${idx}`} className="flex justify-between py-2 border-b">
            <span>
              {item.name} x {item.quantity}
            </span>
          </div>
        ))}
      </div>

      <Button onClick={handleConfirmHandover} className="w-full py-4 text-lg">
        Confirm Handover
      </Button>
    </div>
  );
}
