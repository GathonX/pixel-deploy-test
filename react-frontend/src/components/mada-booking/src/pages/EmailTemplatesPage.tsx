import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Save, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSites } from "@/hooks/use-sites";
import PlanUpgradeGate from "../components/PlanUpgradeGate";
import RichTextEditor, { RichTextEditorHandle, VariableDef, toDisplay } from "../components/RichTextEditor";

const typeLabels: Record<string, string> = {
  confirmation: "Confirmation de réservation",
  reminder: "Rappel de réservation",
  review: "Demande d'avis",
};

const availableVars: VariableDef[] = [
  { key: "{{client_name}}",  label: "Nom client",          description: "Remplacé par le prénom et nom du client (ex : Jean Dupont)" },
  { key: "{{product_name}}", label: "Produit",             description: "Remplacé par le nom de la chambre ou de l'excursion réservée" },
  { key: "{{start_date}}",   label: "Date arrivée",        description: "Remplacé par la date de début de séjour (ex : 15/04/2026)" },
  { key: "{{end_date}}",     label: "Date départ",         description: "Remplacé par la date de fin de séjour (ex : 18/04/2026)" },
  { key: "{{dates}}",        label: "Date d'aujourd'hui",  description: "Remplacé par la date du jour d'envoi de l'email (ex : 26/03/2026)" },
  { key: "{{total}}",        label: "Montant total",       description: "Remplacé par le montant total calculé (prix × personnes × nuits)" },
];

export default function EmailTemplatesPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const qc = useQueryClient();
  const { data: sites } = useSites();
  const currentSite = sites?.find(s => s.id === siteId);

  const { data: templates, isLoading, isError, error } = useQuery({
    queryKey: ["email-templates", siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const { data } = await api.get(`/booking/${siteId}/email-templates`);
      return data as { type: string; subject: string; body_html: string; id?: string }[];
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ type, subject, body_html }: { type: string; subject: string; body_html: string }) => {
      await api.post(`/booking/${siteId}/email-templates`, { type, subject, body_html });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates", siteId] });
      toast.success("Template enregistré");
    },
  });

  const [editingType, setEditingType] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const editorRef = useRef<RichTextEditorHandle>(null);

  const openEdit = (t: any) => {
    setEditingType(t.type);
    setEditSubject(t.subject);
    setEditBody(t.body_html);
  };

  const insertVariable = (varKey: string) => {
    editorRef.current?.insertVariable(varKey);
  };

  const handleSave = () => {
    if (!editingType) return;
    updateTemplate.mutate({ type: editingType, subject: editSubject, body_html: editBody });
    setEditingType(null);
  };

  if (isLoading) return <DashboardLayout><Skeleton className="h-96" /></DashboardLayout>;
  if (isError && (error as any)?.response?.status === 403) return <PlanUpgradeGate error={error} />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Templates Email{currentSite ? ` — ${currentSite.name}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground">Personnalisez les emails envoyés à vos clients</p>
        </div>

        <div className="space-y-4">
          {(templates || []).map(t => {
            const isEditing = editingType === t.type;
            return (
              <div key={t.type} className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium text-foreground">{typeLabels[t.type] || t.type}</h3>
                      <p className="text-xs text-muted-foreground">Sujet : {t.subject}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setPreviewHtml(t.body_html)}>
                      <Eye className="h-3 w-3" /> Aperçu
                    </Button>
                    {!isEditing && (
                      <Button variant="outline" size="sm" onClick={() => openEdit(t)}>Modifier</Button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="space-y-4 border-t border-border pt-4">
                    <div className="space-y-2">
                      <Label>Sujet de l'email</Label>
                      <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} placeholder="Sujet..." />
                    </div>

                    <div className="space-y-2">
                      <Label>Corps de l'email</Label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-xs text-muted-foreground mr-1">Insérer :</span>
                        {availableVars.map(v => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => insertVariable(v.key)}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs font-mono hover:bg-accent transition-colors"
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                      <RichTextEditor
                        ref={editorRef}
                        value={editBody}
                        onChange={setEditBody}
                        variables={availableVars}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button size="sm" className="gap-1" onClick={handleSave}>
                        <Save className="h-3 w-3" /> Enregistrer
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setPreviewHtml(editBody)}>
                        <Eye className="h-3 w-3" /> Aperçu live
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => setEditingType(null)}>
                        <X className="h-3 w-3" /> Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {(templates || []).length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
              Aucun template email pour ce site.
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Aperçu email</DialogTitle></DialogHeader>
          <div className="rounded-lg border border-border bg-background p-6" dangerouslySetInnerHTML={{ __html: toDisplay(previewHtml || "", availableVars) }} />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
