import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

export type DbReservation = {
  id: string;
  product_id: string;
  site_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_date: string;
  end_date: string;
  persons: number;
  adults: number;
  children: number;
  status: "confirmed" | "pending" | "cancelled" | "maintenance";
  notes: string;
  history: any[];
  linked_product_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DbProduct = {
  id: string;
  site_id: string;
  name: string;
  type: "chambre" | "excursion" | "service";
  description: string | null;
  parcours: string | null;
  price: number;
  price_child: number;
  capacity: number;
  max_capacity: number | null;
  stock: number | null;
  amenities: string[];
  image: string | null;
  images: { id: string; product_id: string; url: string; position: number }[];
  status?: string;
  created_at: string;
  updated_at: string;
  reservations: DbReservation[];
};

export type DbSite = {
  id: string;
  name: string;
  location: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteWithProducts = DbSite & {
  products: DbProduct[];
};

export function useSites() {
  return useQuery({
    queryKey: ["sites-with-products"],
    queryFn: async (): Promise<SiteWithProducts[]> => {
      const { data } = await api.get("/booking/workspace/sites");
      return data;
    },
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await api.get("/booking/workspace/sites");
      return (data as SiteWithProducts[]).flatMap((s: SiteWithProducts) =>
        s.products.map((p: DbProduct) => ({ ...p, sites: { name: s.name, location: s.location } }))
      );
    },
  });
}

export function getOccupancyRate(products: DbProduct[], date: Date): number {
  const rooms = products.filter(p => p.type === "chambre");
  if (rooms.length === 0) return 0;
  const dateStr = date.toISOString().split("T")[0];
  const occupied = rooms.filter(p =>
    p.reservations.some(r => r.status !== "cancelled" && r.start_date <= dateStr && r.end_date > dateStr)
  ).length;
  return Math.round((occupied / rooms.length) * 100);
}

export function getRevenueEstimate(products: DbProduct[]): number {
  return products.reduce((sum, p) =>
    sum + p.reservations
      .filter((r: DbReservation) => r.status === "confirmed")
      .reduce((s: number, r: DbReservation) => {
        const days = Math.max(1, Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / 86400000));
        return s + Number(p.price) * r.persons * days;
      }, 0), 0
  );
}
