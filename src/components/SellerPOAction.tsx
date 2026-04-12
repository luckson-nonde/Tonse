import React, { useState } from 'react';
import { PurchaseOrder } from '../types';
import { acceptPO, rejectPO } from '../services/poService';
import Button from './Button';

interface SellerPOActionProps {
  po: PurchaseOrder;
  onActionComplete: () => void;
}

export default function SellerPOAction({ po, onActionComplete }: SellerPOActionProps) {
  const [notes, setNotes] = useState('');
  const [processingTime, setProcessingTime] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const handleAccept = async () => {
    await acceptPO(po.id!, notes, processingTime, expectedDeliveryDate);
    onActionComplete();
  };

  const handleReject = async () => {
    if (!rejectionReason) return;
    await rejectPO(po.id!, rejectionReason);
    onActionComplete();
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-bold mb-4">Review Purchase Order #{po.id}</h2>
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Items:</h3>
        {po.lineItems.map((item, idx) => (
          <div key={`${item.name}-${idx}`} className="flex justify-between py-2 border-b">
            <span>{item.name} x {item.quantity}</span>
          </div>
        ))}
        <p className="font-bold mt-2">Total: ZMW {po.lineItems.reduce((sum, item) => sum + item.quotedPrice * item.quantity, 0)}</p>
      </div>

      <div className="space-y-4 mb-6">
        <textarea
          placeholder="Add notes, terms, or remarks..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />
        <input
          type="text"
          placeholder="Processing time (e.g. 3-5 business days)"
          value={processingTime}
          onChange={(e) => setProcessingTime(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />
        <input
          type="date"
          value={expectedDeliveryDate}
          onChange={(e) => setExpectedDeliveryDate(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />
      </div>

      {isRejecting ? (
        <div className="space-y-4">
          <textarea
            placeholder="Reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full p-3 border rounded-lg"
          />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsRejecting(false)}>Cancel</Button>
            <Button variant="outline" onClick={handleReject}>Confirm Rejection</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button onClick={handleAccept}>Accept PO</Button>
          <Button variant="outline" onClick={() => setIsRejecting(true)}>Reject PO</Button>
        </div>
      )}
    </div>
  );
}
