import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    queryFn: async () => {
      let q = supabase.from("expenses").select("*, suppliers(name), products(name)").order("expense_date", { ascending: false });
      if (siteId) q = q.eq("site_id", siteId);
      const { data, error } = await q;
      if (error) throw error;
      return data as (Expense & { suppliers: { name: string } | null; products: { name: string } | null })[];
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expense: { site_id: string; supplier_id?: string; product_id?: string; label: string; amount: number; expense_date: string; notes?: string }) => {
      const payload = {
        site_id: expense.site_id,
        label: expense.label,
        amount: expense.amount,
        expense_date: expense.expense_date,
        supplier_id: expense.supplier_id || null,
        product_id: expense.product_id || null,
        notes: expense.notes || "",
      };
      const { data, error } = await supabase.from("expenses").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}
