import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, ExternalLink, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useSites } from "@/hooks/use-sites";
import RichTextEditor from "@/components/RichTextEditor";
import PlanUpgradeGate from "../components/PlanUpgradeGate";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CGVAdminPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const qc = useQueryClient();
  const { data: sites } = useSites();
  const currentSite = sites?.find(s => s.id === siteId);

  const { data: cgvValue, isLoading, isError, error } = useQuery({
    queryKey: ["settings", "cgv_content", siteId],
    queryFn: async () => {
      if (!siteId) return null;
      const { data } = await api.get(`/booking/${siteId}/settings/cgv_content`);
      return data.value as string | null;
    },
    enabled: !!siteId,
  });

  const [content, setContent] = useState("");

  const defaultCGV = `<h1 style="font-size:24px;color:#1a1a1a;border-bottom:2px solid #1a6b4a;padding-bottom:8px;">Conditions Générales de Vente</h1>

<h2 style="font-size:18px;color:#1a6b4a;margin-top:24px;">1. Objet et champ d'application</h2>
<p>Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des prestations de services et réservations proposées par notre établissement. Toute réservation implique l'acceptation pleine et entière des présentes CGV.</p>

<h2 style="font-size:18px;color:#1a6b4a;margin-top:24px;">2. Réservation et confirmation</h2>
<p>La réservation est considérée comme ferme et définitive après :</p>
<ul>
  <li>Réception du formulaire de réservation dûment complété</li>
  <li>Versement de l'acompte de <strong>30%</strong> du montant total</li>
  <li>Envoi de la confirmation par email</li>
</ul>
<p>Le solde est à régler au plus tard <strong>le jour de la prestation</strong>.</p>

<h2 style="font-size:18px;color:#1a6b4a;margin-top:24px;">3. Tarifs et paiement</h2>
<p>Les tarifs sont indiqués en euros (€) ou en ariary (MGA) toutes taxes comprises. Les moyens de paiement acceptés sont : espèces, virement bancaire, Mobile Money. Tout séjour commencé est dû dans son intégralité.</p>

<h2 style="font-size:18px;color:#1a6b4a;margin-top:24px;">4. Annulation et modification</h2>
<p>Toute annulation doit être notifiée par écrit (email). Les conditions suivantes s'appliquent :</p>
<ul>
  <li><strong>Plus de 15 jours avant :</strong> remboursement intégral de l'acompte</li>
  <li><strong>Entre 7 et 15 jours :</strong> 50% de l'acompte retenu</li>
  <li><strong>Moins de 7 jours :</strong> acompte non remboursable</li>
  <li><strong>Non-présentation (no-show) :</strong> totalité de la prestation due</li>
</ul>
<p>Nous nous réservons le droit d'annuler une prestation en cas de force majeure. Dans ce cas, un report ou un remboursement intégral sera proposé.</p>

<h2 style="font-size:18px;color:#1a6b4a;margin-top:24px;">5. Responsabilités</h2>
<p>Le client est responsable de ses effets personnels durant toute la durée de la prestation. Notre responsabilité ne saurait être engagée en cas de perte, vol ou détérioration d'objets personnels.</p>

<h2 style="font-size:18px;color:#1a6b4a;margin-top:24px;">6. Protection des données personnelles</h2>
<p>Les données personnelles collectées lors de la réservation sont utilisées exclusivement pour la gestion des réservations et ne sont jamais cédées à des tiers.</p>

<h2 style="font-size:18px;color:#1a6b4a;margin-top:24px;">7. Droit applicable</h2>
<p>Les présentes CGV sont régies par le droit malgache. En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute action judiciaire.</p>

<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px;" />
<p style="font-size:12px;color:#9ca3af;text-align:center;"><em>Dernière mise à jour : Mars 2026</em></p>`;

  useEffect(() => {
    if (cgvValue) {
      setContent(cgvValue);
    } else if (!isLoading) {
      setContent(defaultCGV);
    }
  }, [cgvValue, isLoading]);

  const [copiedCgv, setCopiedCgv] = useState(false);
  const cgvLink = siteId ? `${window.location.origin}/mada-booking/cgv/${siteId}` : '';

  const handleCopyCgvLink = () => {
    navigator.clipboard.writeText(cgvLink);
    setCopiedCgv(true);
    setTimeout(() => setCopiedCgv(false), 2000);
  };

  const save = useMutation({
    mutationFn: async () => {
      await api.put(`/booking/${siteId}/settings/cgv_content`, { value: content });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "cgv_content", siteId] });
      toast.success("CGV enregistrées");
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement des CGV.");
    },
  });

  if (isLoading) return <DashboardLayout><Skeleton className="h-96" /></DashboardLayout>;
  if (isError && (error as any)?.response?.status === 403) return <PlanUpgradeGate error={{ response: { status: 403, data: error } }} />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Conditions Générales de Vente{currentSite ? ` — ${currentSite.name}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">Modifiez les CGV affichées publiquement</p>
          </div>
          <Button className="gap-2" onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="h-4 w-4" /> {save.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>

        {siteId && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-blue-600" />
                Lien CGV public
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-3">
                Partagez ce lien pour permettre à vos clients de consulter vos CGV directement.
              </p>
              <div className="flex gap-2">
                <Input value={cgvLink} readOnly className="font-mono text-sm bg-white" />
                <Button variant="outline" onClick={handleCopyCgvLink} className="flex items-center gap-2 shrink-0">
                  {copiedCgv ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copiedCgv ? 'Copié !' : 'Copier'}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Ajoutez ce lien sur votre site :{' '}
                <code className="bg-slate-200 px-1 py-0.5 rounded">
                  {'<a href="' + cgvLink + '">Conditions générales de vente</a>'}
                </code>
              </p>
            </CardContent>
          </Card>
        )}

        <RichTextEditor value={content} onChange={setContent} />
      </div>
    </DashboardLayout>
  );
}
