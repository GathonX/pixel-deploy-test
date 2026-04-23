import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";

export interface DevisConfig {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  primaryColor: string;
  conditionsText: string;
  footerText: string;
  currencySymbol: string;
}

export const DEFAULT_DEVIS_CONFIG: DevisConfig = {
  companyName: "Pixel Rise Booking",
  address: "",
  phone: "",
  email: "",
  primaryColor: "#008080",
  conditionsText: "Paiement sur place à l'arrivée. Ce devis ne constitue pas une facture.",
  footerText: "Pixel Rise — Réservation en ligne",
  currencySymbol: "Ar",
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export { hexToRgb };

/**
 * useDevisConfig — lit/écrit la config devis depuis les booking_settings du site.
 * Requiert un siteId passé en paramètre (récupéré depuis l'URL).
 */
export function useDevisConfig(siteId?: string) {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["devis-config", siteId],
    enabled: !!siteId,
    queryFn: async (): Promise<DevisConfig> => {
      const { data } = await api.get(`/booking/${siteId}/settings/devis_config`);
      try {
        const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        return { ...DEFAULT_DEVIS_CONFIG, ...parsed };
      } catch {
        return DEFAULT_DEVIS_CONFIG;
      }
    },
  });

  const mutation = useMutation({
    mutationFn: async (newConfig: DevisConfig) => {
      if (!siteId) return;
      await api.put(`/booking/${siteId}/settings/devis_config`, {
        value: JSON.stringify(newConfig),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devis-config", siteId] });
    },
  });

  return {
    config: config ?? DEFAULT_DEVIS_CONFIG,
    isLoading,
    saveConfig: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}

/** Retourne uniquement le symbole de devise (utilise le premier site disponible) */
export function useCurrency(siteId?: string) {
  const { config } = useDevisConfig(siteId);
  return config.currencySymbol || "Ar";
}
