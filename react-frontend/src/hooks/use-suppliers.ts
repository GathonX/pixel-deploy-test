import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

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
    enabled: !!siteId,
    queryFn: async () => {
      const { data } = await api.get(`/booking/${siteId}/suppliers`);
      return data as (Supplier & { sites: { name: string } | null })[];
    },
  });
}

export function useSupplierPrices(supplierId?: string) {
  return useQuery({
    queryKey: ["supplier-prices", supplierId],
    enabled: false,
    queryFn: async (): Promise<(SupplierPrice & { products: { name: string; type: string } })[]> => [],
  });
}

export function useAllSupplierPrices() {
  return useQuery({
    queryKey: ["all-supplier-prices"],
    queryFn: async (): Promise<SupplierPrice[]> => [],
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (supplier: {
      name: string;
      contact_email?: string;
      phone?: string;
      notes?: string;
      site_id?: string;
    }) => {
      const { site_id, ...rest } = supplier;
      const { data } = await api.post(`/booking/${site_id}/suppliers`, rest);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      site_id,
      ...updates
    }: {
      id: string;
      site_id?: string;
      name?: string;
      contact_email?: string;
      phone?: string;
      notes?: string;
    }) => {
      await api.put(`/booking/${site_id}/suppliers/${id}`, updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, site_id }: { id: string; site_id: string }) => {
      await api.delete(`/booking/${site_id}/suppliers/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
  });
}

export function useUpsertSupplierPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sp: {
      id?: string;
      supplier_id: string;
      product_id: string;
      cost_price: number;
      site_id: string;
    }) => {
      await api.post(`/booking/${sp.site_id}/suppliers/${sp.supplier_id}/prices`, {
        product_id: sp.product_id,
        cost_price: sp.cost_price,
      });
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
    mutationFn: async ({
      id,
      supplier_id,
      site_id,
    }: {
      id: string;
      supplier_id: string;
      site_id: string;
    }) => {
      await api.delete(`/booking/${site_id}/suppliers/${supplier_id}/prices/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-prices"] });
      qc.invalidateQueries({ queryKey: ["all-supplier-prices"] });
    },
  });
}
