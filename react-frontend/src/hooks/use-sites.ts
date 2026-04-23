import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

// ─── Types compatibles avec mada-booking ──────────────────────────────────

export type DbSite = {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
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
  image: string | null;
  price: number;
  price_child: number | null;
  capacity: number | null;
  max_capacity: number | null;
  stock: number | null;
  amenities: string[] | null;
  created_at: string;
  updated_at: string;
};

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
  adults: number | null;
  children: number | null;
  status: "pending" | "confirmed" | "cancelled" | "maintenance" | "checked_in" | "checked_out";
  notes: string;
  price_override: number | null;
  history: any[] | null;
  linked_product_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteWithProducts = DbSite & {
  products: (DbProduct & { reservations: DbReservation[] })[];
};

// ─── useSites — tous les sites du workspace avec produits + réservations ──

export function useSites() {
  return useQuery({
    queryKey: ["sites-with-products"],
    queryFn: async (): Promise<SiteWithProducts[]> => {
      const { data } = await api.get("/booking/workspace/sites");
      return data;
    },
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
}

// ─── useProducts — tous les produits (agrégé depuis tous les sites) ───────

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data: sites } = await api.get<SiteWithProducts[]>("/booking/workspace/sites");
      return sites.flatMap(site =>
        site.products.map(p => ({
          ...p,
          sites: { name: site.name, location: site.location },
        }))
      );
    },
    staleTime: 30_000,
  });
}

// ─── Helpers purs (même logique que Supabase) ─────────────────────────────

export function getOccupancyRate(
  products: (DbProduct & { reservations: DbReservation[] })[],
  date: Date,
): number {
  const rooms = products.filter(p => p.type === "chambre");
  if (rooms.length === 0) return 0;
  const dateStr = date.toISOString().split("T")[0];
  const occupied = rooms.filter(p =>
    p.reservations.some(
      r => r.status !== "cancelled" && r.start_date <= dateStr && r.end_date > dateStr,
    ),
  ).length;
  return Math.round((occupied / rooms.length) * 100);
}

export function getRevenueEstimate(
  products: (DbProduct & { reservations: DbReservation[] })[],
): number {
  return products.reduce(
    (sum, p) =>
      sum +
      p.reservations
        .filter(r => r.status === "confirmed")
        .reduce((s, r) => {
          const days = Math.max(
            1,
            Math.ceil(
              (new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / 86400000,
            ),
          );
          const amount = r.price_override != null
            ? r.price_override
            : Number(p.price) * (r.persons || 1) * days;
          return s + amount;
        }, 0),
    0,
  );
}
