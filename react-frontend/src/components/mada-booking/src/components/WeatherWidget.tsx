import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Cloud, Sun, CloudRain, CloudSnow, Thermometer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface WeatherWidgetProps {
  lat: number;
  lon: number;
  siteName: string;
}

const weatherIcons: Record<string, typeof Sun> = {
  Clear: Sun,
  Clouds: Cloud,
  Rain: CloudRain,
  Snow: CloudSnow,
};

export default function WeatherWidget({ lat, lon, siteName }: WeatherWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["weather", lat, lon],
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/weather?lat=${lat}&lon=${lon}`,
        { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      if (!res.ok) throw new Error("Weather API error");
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  });

  if (error) return null; // Silently fail if no API key
  if (isLoading) return <Skeleton className="h-20 rounded-xl" />;
  if (!data?.current) return null;

  const Icon = weatherIcons[data.current.weather] || Cloud;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-8 w-8 text-primary" />
        <div>
          <p className="font-heading text-2xl font-bold text-foreground">{Math.round(data.current.temp)}°C</p>
          <p className="text-xs text-muted-foreground">{data.current.description}</p>
        </div>
      </div>
      {data.forecast && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {data.forecast.slice(0, 5).map((f: any, i: number) => {
            const FIcon = weatherIcons[f.weather] || Cloud;
            return (
              <div key={i} className="flex flex-col items-center rounded-lg bg-muted p-2 text-xs min-w-[50px]">
                <span className="text-muted-foreground">{f.day}</span>
                <FIcon className="h-4 w-4 my-1 text-foreground" />
                <span className="font-medium text-foreground">{Math.round(f.temp)}°</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
