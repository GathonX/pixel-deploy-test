
// src/hooks/useAdminUserStats.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export interface AdminUserStats {
  total: number;
  active: number;
  inactive: number;
  premium: number;
}

export function useAdminUserStats() {
  return useQuery<AdminUserStats, Error>({
    queryKey: ['adminUserStats'],
    queryFn: async () => {
      const { data } = await api.get<AdminUserStats>('/admin/users/stats');
      return data;
    },
  });
}
