import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export function useProductSeasons(productId?: string) {
  return useQuery({
    queryKey: ["product-seasons", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_seasons")
        .select("*")
        .eq("product_id", productId!)
        .order("start_month");
      if (error) throw error;
      return data as unknown as ProductSeason[];
    },
  });
}

export function useAllProductSeasons() {
  return useQuery({
    queryKey: ["all-product-seasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_seasons")
        .select("*")
        .order("start_month");
      if (error) throw error;
      return data as unknown as ProductSeason[];
    },
  });
}

export function useUpsertSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (season: Omit<ProductSeason, "id"> & { id?: string }) => {
      if (season.id) {
        const { error } = await supabase.from("product_seasons").update({
          price: season.price,
          price_child: season.price_child,
          start_month: season.start_month,
          end_month: season.end_month,
        } as any).eq("id", season.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("product_seasons").insert({
          product_id: season.product_id,
          season: season.season,
          price: season.price,
          price_child: season.price_child,
          start_month: season.start_month,
          end_month: season.end_month,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-seasons"] });
      qc.invalidateQueries({ queryKey: ["all-product-seasons"] });
    },
  });
}

export function useDeleteSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_seasons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-seasons"] });
      qc.invalidateQueries({ queryKey: ["all-product-seasons"] });
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: {
      site_id: string;
      name: string;
      type: "chambre" | "excursion" | "service";
      description?: string;
      parcours?: string;
      image?: string;
      price: number;
      price_child?: number;
      capacity?: number;
      max_capacity?: number;
      stock?: number;
      amenities?: string[];
    }) => {
      const { amenities, ...rest } = product;
      const insertData = amenities ? { ...rest, amenities } : rest;
      const { data, error } = await supabase.from("products").insert(insertData as any).select().single();
      if (error) throw error;
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
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; parcours?: string; image?: string; price?: number; price_child?: number; capacity?: number; max_capacity?: number; stock?: number; amenities?: string[] }) => {
      const { error } = await supabase.from("products").update(updates as any).eq("id", id);
      if (error) throw error;
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites-with-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// Product Images
export function useProductImages(productId?: string) {
  return useQuery({
    queryKey: ["product-images", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId!)
        .order("position");
      if (error) throw error;
      return data as ProductImage[];
    },
  });
}

export function useAllProductImages() {
  return useQuery({
    queryKey: ["all-product-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as ProductImage[];
    },
  });
}

export function useUploadProductImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, file, position }: { productId: string; file: File; position: number }) => {
      const ext = file.name.split(".").pop();
      const path = `${productId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      const { error: insertError } = await supabase.from("product_images").insert({
        product_id: productId,
        url: publicUrl,
        position,
      } as any);
      if (insertError) throw insertError;
      return publicUrl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-images"] });
      qc.invalidateQueries({ queryKey: ["all-product-images"] });
    },
  });
}

export function useDeleteProductImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      // Extract storage path from URL
      const parts = url.split("/product-images/");
      if (parts.length > 1) {
        await supabase.storage.from("product-images").remove([parts[1]]);
      }
      const { error } = await supabase.from("product_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-images"] });
      qc.invalidateQueries({ queryKey: ["all-product-images"] });
    },
  });
}

export function getSeasonalPrice(
  seasons: ProductSeason[],
  basePrice: number,
  month: number,
  basePriceChild?: number,
): { price: number; priceChild: number; season: string | null } {
  for (const s of seasons) {
    const inRange = s.start_month <= s.end_month
      ? month >= s.start_month && month <= s.end_month
      : month >= s.start_month || month <= s.end_month;
    if (inRange) return { price: Number(s.price), priceChild: Number(s.price_child || 0), season: s.season };
  }
  return { price: Number(basePrice), priceChild: Number(basePriceChild || 0), season: null };
}
