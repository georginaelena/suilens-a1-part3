import { useQuery } from '@tanstack/vue-query';

const API_BASE = import.meta.env.VITE_INVENTORY_API || 'http://localhost:4004';

export interface Branch {
  code: string;
  name: string;
  address: string;
}

export interface LensStock {
  branchCode: string;
  branchName: string;
  branchAddress: string;
  totalQuantity: number;
  availableQuantity: number;
}

export function useBranches() {
  return useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/branches`);
      if (!response.ok) throw new Error('Failed to fetch branches');
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

export function useLensStock(lensId: string) {
  return useQuery<LensStock[]>({
    queryKey: ['lens-stock', lensId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/inventory/lenses/${lensId}`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch lens stock');
      }
      return response.json();
    },
    enabled: !!lensId,
    staleTime: 1000 * 20, // Cache for 20 seconds
    refetchInterval: 1000 * 3, // Auto-refetch every 3 seconds for real-time stock updates
  });
}
