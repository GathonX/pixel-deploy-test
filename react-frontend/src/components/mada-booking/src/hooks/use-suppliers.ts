import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Supplier = {
  id: string;
  name: string;
  contact_email: string | null;
  phone: string | null;
  notes: string | null;
  site_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SupplierPrice = {
  id: string;
  supplier_id: string;
  product_id: string;
  cost_price: number;
  updated_at: string;
};

export function useSuppliers(siteId?: string) {
  return useQuery({
    queryKey: ["suppliers", siteId],
    queryFn: async () => {
      let q = supabase.from("suppliers").select("*, sites(name)").order("name");
      if (siteId) q = q.eq("site_id", siteId);
      const { data, error } = await q;
      if (error) throw error;
      return data as (Supplier & { sites: { name: string } | null })[];
    },
  });
}

export function useSupplierPrices(supplierId?: string) {
  return useQuery({
    queryKey: ["supplier-prices", supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_prices")
        .select("*, products(name, type)")
        .eq("supplier_id", supplierId!);
      if (error) throw error;
      return data as (SupplierPrice & { products: { name: string; type: string } })[];
    },
  });
}

export function useAllSupplierPrices() {
  return useQuery({
    queryKey: ["all-supplier-prices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("supplier_prices").select("*");
      if (error) throw error;
      return data as SupplierPrice[];
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (supplier: { name: string; contact_email?: string; phone?: string; notes?: string; site_id?: string }) => {
      const { data, error } = await supabase.from("suppliers").insert(supplier).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; contact_email?: string; phone?: string; notes?: string; site_id?: string }) => {
      const { error } = await supabase.from("suppliers").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpsertSupplierPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sp: { id?: string; supplier_id: string; product_id: string; cost_price: number }) => {
      if (sp.id) {
        const { error } = await supabase.from("supplier_prices").update({ cost_price: sp.cost_price }).eq("id", sp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("supplier_prices").insert({
          supplier_id: sp.supplier_id,
          product_id: sp.product_id,
          cost_price: sp.cost_price,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-prices"] });
      qc.invalidateQueries({ queryKey: ["all-supplier-prices"] });
    },
  });
}

export function useDeleteSupplierPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_prices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-prices"] });
      qc.invalidateQueries({ queryKey: ["all-supplier-prices"] });
    },
  });
}
