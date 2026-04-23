import api from "@/services/api";

// ─── Création ─────────────────────────────────────────────────────────────

export async function createReservation(data: {
  product_id: string;
  site_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  start_date: string;
  end_date: string;
  persons: number;
  notes: string;
  linked_product_id?: string;
  adults?: number;
  children?: number;
}) {
  const { site_id, persons, linked_product_id, ...rest } = data;
  const payload = {
    ...rest,
    adults: data.adults ?? persons,
    children: data.children ?? 0,
    status: "pending",
  };

  const { data: result } = await api.post(`/booking/${site_id}/reservations`, payload);
  return result;
}

// ─── Mise à jour du statut ─────────────────────────────────────────────────

export async function updateReservationStatus(
  id: string,
  status: "confirmed" | "pending" | "cancelled" | "maintenance" | "checked_in" | "checked_out",
  actionLabel: string,
  siteId: string,
) {
  await api.post(`/booking/${siteId}/reservations/${id}/status`, {
    status,
    reason: actionLabel,
  });
}

// ─── Mise à jour ──────────────────────────────────────────────────────────

export async function updateReservation(
  id: string,
  updates: { start_date?: string; end_date?: string; persons?: number; notes?: string; price_override?: number | null; site_id: string },
) {
  const { site_id, ...rest } = updates;
  await api.put(`/booking/${site_id}/reservations/${id}`, rest);
}

// ─── Maintenance ──────────────────────────────────────────────────────────

export async function setMaintenance(
  productId: string,
  startDate: string,
  endDate: string,
  notes = "",
  siteId = "",
) {
  if (!siteId) return;
  await api.post(`/booking/${siteId}/reservations`, {
    product_id: productId,
    client_name: "🔧 Maintenance",
    client_email: "",
    client_phone: "",
    start_date: startDate,
    end_date: endDate,
    status: "maintenance",
    adults: 0,
    children: 0,
    notes,
  });
}

// ─── Vérification disponibilité ───────────────────────────────────────────

export async function checkAvailability(
  productId: string,
  startDate: string,
  endDate: string,
  persons: number,
  excludeResId?: string,
  siteId = "",
): Promise<{ available: boolean; message?: string; currentCount?: number; maxCount?: number }> {
  if (!siteId) return { available: true };

  const params: Record<string, string> = {
    product_id: productId,
    start_date: startDate,
    end_date: endDate,
    adults: String(persons),
    children: "0",
  };
  if (excludeResId) params.exclude_reservation_id = excludeResId;

  const { data } = await api.get(`/booking/${siteId}/availability`, { params });
  return {
    available: data.available,
    message: data.message,
    currentCount: data.current_count,
    maxCount: data.max_count,
  };
}
