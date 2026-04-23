import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

export type Expense = {
  id: string;
  site_id: string;
  supplier_id: string | null;
  product_id: string | null;
  label: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_at: string;
};

export function useExpenses(siteId?: string) {
  return useQuery({
    queryKey: ["expenses", siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const { data } = await api.get(`/booking/${siteId}/expenses`);
      return data as (Expense & {
        suppliers: { name: string } | null;
        products: { name: string } | null;
      })[];
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expense: {
      site_id: string;
      supplier_id?: string;
      product_id?: string;
      label: string;
      amount: number;
      expense_date: string;
      notes?: string;
    }) => {
      const { site_id, ...rest } = expense;
      const { data } = await api.post(`/booking/${site_id}/expenses`, rest);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, site_id }: { id: string; site_id: string }) => {
      await api.delete(`/booking/${site_id}/expenses/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}
