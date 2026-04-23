import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  companyName: "MadagasBooking",
  address: "",
  phone: "",
  email: "",
  primaryColor: "#008080",
  conditionsText: "Paiement sur place à l'arrivée. Ce devis ne constitue pas une facture.",
  footerText: "MadagasBooking — Réservation en ligne pour Madagascar",
  currencySymbol: "€",
};

const SETTINGS_KEY = "devis_config";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export { hexToRgb };

export function useDevisConfig() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["devis-config"],
    queryFn: async (): Promise<DevisConfig> => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .is("site_id", null)
        .maybeSingle();

      if (error) throw error;
      if (!data?.value) return DEFAULT_DEVIS_CONFIG;

      try {
        const parsed = JSON.parse(data.value);
        return { ...DEFAULT_DEVIS_CONFIG, ...parsed };
      } catch {
        return DEFAULT_DEVIS_CONFIG;
      }
    },
  });

  const mutation = useMutation({
    mutationFn: async (newConfig: DevisConfig) => {
      const jsonValue = JSON.stringify(newConfig);

      // Try update first
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", SETTINGS_KEY)
        .is("site_id", null)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("settings")
          .update({ value: jsonValue })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert({ key: SETTINGS_KEY, value: jsonValue });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devis-config"] });
    },
  });

  return {
    config: config ?? DEFAULT_DEVIS_CONFIG,
    isLoading,
    saveConfig: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}

/** Lightweight hook that returns just the currency symbol */
export function useCurrency() {
  const { config } = useDevisConfig();
  return config.currencySymbol || "€";
}
