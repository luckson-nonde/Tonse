import React, { useState, useEffect } from 'react';
import { DeliveryOrder, PurchaseOrder } from '../types';
import { db } from '../db';
import { confirmCollection } from '../services/deliveryService';
import Button from './Button';
import QRCode from 'react-qr-code';

interface BuyerCollectionScreenProps {
  deliveryOrderId: number;
  onComplete: () => void;
}

export default function BuyerCollectionScreen({ deliveryOrderId, onComplete }: BuyerCollectionScreenProps) {
  const [deliveryOrder, setDeliveryOrder] = useState<DeliveryOrder | null>(null);
  const [po, setPo] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    async function fetchData() {
      const doOrder = await db.deliveryOrders.get(deliveryOrderId);
      if (doOrder) {
        setDeliveryOrder(doOrder);
        const poData = await db.purchaseOrders.get(doOrder.purchaseOrderId);
        if (poData) setPo(poData);
      }
    }
    fetchData();
  }, [deliveryOrderId]);

  if (!deliveryOrder || !po) return <div>Loading...</div>;

  const handleConfirm = async () => {
    await confirmCollection(deliveryOrderId, deliveryOrder.buyerId);
    onComplete();
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-2xl font-bold mb-6">Collection Details</h2>
      
      <div className="flex justify-center mb-8">
        <QRCode value={deliveryOrder.qrCode} size={256} />
      </div>

      <div className="space-y-4 mb-8">
        <h3 className="font-semibold">Items to Collect:</h3>
        {po.lineItems.map((item) => (
          <div key={item.name} className="flex justify-between py-2 border-b">
            <span>{item.name} x {item.quantity}</span>
          </div>
        ))}
        <p className="font-bold text-lg">Total: ZMW {po.lineItems.reduce((sum, item) => sum + item.quotedPrice * item.quantity, 0)}</p>
      </div>

      <Button 
        onClick={handleConfirm}
        disabled={deliveryOrder.status !== 'collection_started'}
        className="w-full py-4 text-lg"
      >
        Confirm Collection
      </Button>
    </div>
  );
}
