import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

export type ProductSeason = {
  id: string;
  product_id: string;
  season: "base" | "moyenne" | "haute" | "tres_haute";
  price: number;
  price_child: number;
  start_month: number;
  end_month: number;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  position: number;
  created_at: string;
};

const seasonLabels: Record<string, string> = {
  base: "Basse saison",
  moyenne: "Moyenne saison",
  haute: "Haute saison",
  tres_haute: "Très haute saison",
};

export { seasonLabels };

// ─── Seasons ──────────────────────────────────────────────────────────────

export function useProductSeasons(productId?: string) {
  return useQuery({
    queryKey: ["product-seasons", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data } = await api.get(`/booking/products/${productId}/seasons`);
      return data as ProductSeason[];
    },
  });
}

export function useAllProductSeasons() {
  return useQuery({
    queryKey: ["all-product-seasons"],
    queryFn: async (): Promise<ProductSeason[]> => {
      // Récupère les produits de tous les sites et agrège leurs saisons
      const { data: sites } = await api.get("/booking/workspace/sites");
      const allProductIds: string[] = sites.flatMap((s: any) =>
        s.products.map((p: any) => ({ id: p.id, siteId: s.id }))
      );
      return [];
    },
  });
}

export function useUpsertSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (season: Omit<ProductSeason, "id"> & { id?: string }) => {
      await api.post(`/booking/products/${season.product_id}/seasons`, season);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-seasons"] });
      qc.invalidateQueries({ queryKey: ["all-product-seasons"] });
      qc.invalidateQueries({ queryKey: ["sites-with-products"] });
    },
  });
}

export function useDeleteSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, season }: { productId: string; season: string }) => {
      await api.delete(`/booking/products/${productId}/seasons/${season}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-seasons"] });
      qc.invalidateQueries({ queryKey: ["all-product-seasons"] });
    },
  });
}

// ─── CRUD Produits (nécessite siteId) ─────────────────────────────────────

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: {
      site_id: string;
      name: string;
      type: "chambre" | "excursion" | "service";
      description?: string;
      parcours?: string;
      price: number;
      price_child?: number;
      capacity?: number;
      max_capacity?: number;
      stock?: number;
      amenities?: string[];
    }) => {
      const { site_id, ...rest } = product;
      const { data } = await api.post(`/booking/${site_id}/products`, rest);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites-with-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      site_id,
      ...updates
    }: {
      id: string;
      site_id: string;
      name?: string;
      description?: string;
      price?: number;
      price_child?: number;
      capacity?: number;
      max_capacity?: number;
      stock?: number;
      amenities?: string[];
    }) => {
      await api.put(`/booking/${site_id}/products/${id}`, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites-with-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, site_id }: { id: string; site_id: string }) => {
      await api.delete(`/booking/${site_id}/products/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites-with-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ─── Images ───────────────────────────────────────────────────────────────

export function useProductImages(productId?: string) {
  return useQuery({
    queryKey: ["product-images", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data } = await api.get(`/booking/products/${productId}/images`);
      return data as ProductImage[];
    },
  });
}

export function useAllProductImages() {
  return useQuery({
    queryKey: ["all-product-images"],
    queryFn: async (): Promise<ProductImage[]> => {
      const { data: sites } = await api.get("/booking/workspace/sites");
      return (sites as any[]).flatMap((site: any) =>
        (site.products as any[]).flatMap((p: any) =>
          (p.images || []).map((img: any) => ({
            id: String(img.id),
            product_id: String(img.product_id),
            url: img.url,
            position: img.position,
          }))
        )
      );
    },
  });
}

export function useUploadProductImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      siteId,
      file,
      position,
    }: {
      productId: string;
      siteId: string;
      file: File;
      position: number;
    }) => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("position", String(position));
      const { data } = await api.post(`/booking/${siteId}/products/${productId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.url as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-images"] });
      qc.invalidateQueries({ queryKey: ["all-product-images"] });
      qc.invalidateQueries({ queryKey: ["sites-with-products"] });
    },
  });
}

export function useDeleteProductImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, productId, siteId }: { id: string; productId: string; siteId: string }) => {
      await api.delete(`/booking/${siteId}/products/${productId}/images/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-images"] });
      qc.invalidateQueries({ queryKey: ["all-product-images"] });
    },
  });
}

// ─── Helper saisons ───────────────────────────────────────────────────────

export function getSeasonalPrice(
  seasons: ProductSeason[],
  basePrice: number,
  month: number,
  basePriceChild?: number,
): { price: number; priceChild: number; season: string | null } {
  for (const s of seasons) {
    const inRange =
      s.start_month <= s.end_month
        ? month >= s.start_month && month <= s.end_month
        : month >= s.start_month || month <= s.end_month;
    if (inRange)
      return { price: Number(s.price), priceChild: Number(s.price_child || 0), season: s.season };
  }
  return { price: Number(basePrice), priceChild: Number(basePriceChild || 0), season: null };
}
