import { apiClient } from './api/client';
import { DeliveryOrder } from '../types';

export async function createDeliveryOrder(orderConfirmationId: number) {
  // Assuming delivery order implies order creation mapping
  const response = await apiClient.post('/orders', {
    orderConfirmationId,
    type: 'DELIVERY_ORDER'
  });
  return response.data.id;
}

export async function startCollection(deliveryOrderId: number) {
  const response = await apiClient.patch(`/orders/${deliveryOrderId}/status`, { status: 'COLLECTING' });
  return response.data;
}

export async function confirmCollection(deliveryOrderId: number, buyerId: number) {
  const response = await apiClient.patch(`/orders/${deliveryOrderId}/status`, {
    status: 'COLLECTION_CONFIRMED',
    buyerId
  });
  return response.data;
}
