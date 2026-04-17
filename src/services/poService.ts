import { db } from './api/database';
import { PurchaseOrder, OrderConfirmation, Inquiry } from '../types';

export async function acceptPO(poId: number, notes?: string, processingTime?: string, expectedDeliveryDate?: string) {
  const po = await db.purchaseOrders.get(poId);
  if (!po) throw new Error('Purchase Order not found');

  // 1. Update PO status
  await db.purchaseOrders.update(poId, { status: 'accepted' });

  // 2. Update Inquiry stage
  await db.inquiries.update(po.inquiryId, { currentStage: 'order_confirmation' });

  // 3. Auto-generate Order Confirmation
  const orderConfirmation: OrderConfirmation = {
    poId: po.id!,
    inquiryId: po.inquiryId,
    quoteId: po.quotationId,
    buyerId: po.buyerId,
    providerId: po.providerId,
    items: po.lineItems.map(item => ({
      title: item.name,
      description: '',
      quantity: item.quantity,
      price: item.quotedPrice
    })),
    notes,
    processingTime,
    expectedDeliveryDate,
    paymentStatus: po.paymentMethod === 'pay_now' ? 'PAID' : 'SCHEDULED',
    confirmationReference: `OC-${Date.now()}-${po.id}`,
    createdAt: Date.now(),
  };

  await db.orderConfirmations.add(orderConfirmation);
  
  return orderConfirmation;
}

export async function rejectPO(poId: number, reason: string) {
  const po = await db.purchaseOrders.get(poId);
  if (!po) throw new Error('Purchase Order not found');

  // 1. Update PO status
  await db.purchaseOrders.update(poId, { status: 'rejected', rejectionReason: reason });

  // 2. Handle refund/cancellation logic (mocked for now)
  if (po.paymentMethod === 'pay_now') {
    // Trigger refund to buyer's virtual account
    console.log('Triggering refund for PO', poId);
  } else {
    // Cancel scheduled payment
    console.log('Cancelling scheduled payment for PO', poId);
  }
  
  // 3. Notify buyer (mocked)
  console.log('Notifying buyer of rejection for PO', poId, 'Reason:', reason);
}
