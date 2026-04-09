import { db } from '../db';
import { DeliveryOrder } from '../types';

export async function createDeliveryOrder(orderConfirmationId: number) {
  const oc = await db.orderConfirmations.get(orderConfirmationId);
  if (!oc) throw new Error('Order Confirmation not found');

  const createdAt = new Date().toISOString();
  const qrData = JSON.stringify({
    inquiryId: oc.inquiryId,
    purchaseOrderId: oc.poId,
    orderConfirmationId: oc.id,
    createdAt
  });

  const deliveryOrder: DeliveryOrder = {
    inquiryId: oc.inquiryId,
    quotationId: oc.quoteId,
    purchaseOrderId: oc.poId,
    orderConfirmationId: oc.id!,
    buyerId: oc.buyerId,
    sellerId: oc.providerId,
    qrCode: qrData,
    status: 'pending_pickup',
    createdAt,
    updatedAt: createdAt
  };

  const id = await db.deliveryOrders.add(deliveryOrder);
  
  // Update inquiry stage
  await db.inquiries.update(oc.inquiryId, { currentStage: 'delivery_order' });
  
  console.log('Notifying buyer: Your order is ready for pickup');
  
  return id;
}

export async function startCollection(deliveryOrderId: number) {
  const doOrder = await db.deliveryOrders.get(deliveryOrderId);
  if (!doOrder) throw new Error('Delivery Order not found');

  await db.deliveryOrders.update(deliveryOrderId, { 
    status: 'collection_started',
    updatedAt: new Date().toISOString()
  });

  await db.auditLogs.add({
    providerId: doOrder.sellerId,
    staffId: 0,
    staffName: 'System',
    actionType: 'COLLECTION_STARTED',
    targetId: doOrder.inquiryId,
    targetTitle: 'Collection Started',
    buyerName: 'Buyer',
    timestamp: Date.now()
  });
}

export async function confirmCollection(deliveryOrderId: number, buyerId: number) {
  const doOrder = await db.deliveryOrders.get(deliveryOrderId);
  if (!doOrder) throw new Error('Delivery Order not found');
  if (doOrder.buyerId !== buyerId) throw new Error('Unauthorized');

  await db.deliveryOrders.update(deliveryOrderId, { 
    status: 'completed',
    collectionTimestamp: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  await releaseEscrow(deliveryOrderId);

  await db.auditLogs.add({
    providerId: doOrder.sellerId,
    staffId: 0,
    staffName: 'System',
    actionType: 'HANDOVER_COMPLETED',
    targetId: doOrder.inquiryId,
    targetTitle: 'Handover Completed',
    buyerName: 'Buyer',
    timestamp: Date.now()
  });

  await db.inquiries.update(doOrder.inquiryId, { currentStage: 'completed', status: 'CLOSED' });

  console.log('Notifying buyer: Collection confirmed. Your order is complete!');
  console.log('Notifying seller: The buyer has confirmed collection. Funds have been released to your virtual account');
}

async function releaseEscrow(deliveryOrderId: number) {
  const doOrder = await db.deliveryOrders.get(deliveryOrderId);
  if (!doOrder) throw new Error('Delivery Order not found');

  await db.transactions.add({
    userId: doOrder.sellerId,
    type: 'IN',
    amount: 0, // Should be total amount from PO
    description: 'Escrow release for Delivery Order ' + deliveryOrderId,
    category: 'ESCROW_RELEASE',
    createdAt: Date.now(),
    status: 'COMPLETED'
  });
}
