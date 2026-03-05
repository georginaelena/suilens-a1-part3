import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

const API_BASE = import.meta.env.VITE_ORDER_API || 'http://localhost:4002';

interface CreateOrderPayload {
  customerName: string;
  customerEmail: string;
  lensId: string;
  branchCode: string;
  startDate: string;
  endDate: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  lensId: string;
  branchCode: string;
  lensSnapshot: {
    modelName: string;
    manufacturerName: string;
    dayPrice: string;
  };
  startDate: string;
  endDate: string;
  totalPrice: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

export function useFetchOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async (): Promise<Order[]> => {
      const response = await fetch(`${API_BASE}/api/orders`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel order');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

