import { apiClient } from './api/client';
import { PurchaseOrder, OrderConfirmation, Inquiry } from '../types';

export async function acceptPO(
  poId: number,
  notes?: string,
  processingTime?: string,
  expectedDeliveryDate?: string
) {
  // Map acceptance to 'ACCEPTED' status update on centralized Orders API
  const response = await apiClient.patch(`/orders/${poId}/status`, {
    status: 'ACCEPTED',
    notes,
    processingTime,
    expectedDeliveryDate
  });
  return response.data;
}

export async function rejectPO(poId: number, reason: string) {
  // Map rejection to 'REJECTED' status update
  const response = await apiClient.patch(`/orders/${poId}/status`, {
     status: 'REJECTED',
     reason
  });
  return response.data;
}

export async function getPODetails(poId: number) {
  const response = await apiClient.get(`/orders/${poId}`);
  return response.data;
}
