import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function CGVPublicPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const { data: setting, isLoading } = useQuery({
    queryKey: ["settings", "cgv", siteId],
    queryFn: async () => {
      let query = supabase.from("settings").select("*").eq("key", "cgv");
      if (siteId) {
        query = query.eq("site_id", siteId);
      } else {
        query = query.is("site_id", null);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold">Madagas<span className="text-primary">Booking</span></span>
          </Link>
          <Link to="/reserver">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
          </Link>
        </div>
      </header>

      <div className="container max-w-3xl py-10">
        {isLoading ? (
          <Skeleton className="h-96" />
        ) : setting?.value ? (
          <div className="rounded-xl border border-border bg-card p-8 prose max-w-none" dangerouslySetInnerHTML={{ __html: setting.value }} />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
            Aucune CGV disponible pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}
