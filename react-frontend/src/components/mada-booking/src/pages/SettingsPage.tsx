import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useDevisConfig, DEFAULT_DEVIS_CONFIG, type DevisConfig } from "@/hooks/use-devis-config";
import { toast } from "sonner";
import { Save, FileText, Palette } from "lucide-react";

export default function SettingsPage() {
  const { config, isLoading, saveConfig, isSaving } = useDevisConfig();
  const [form, setForm] = useState<DevisConfig>(DEFAULT_DEVIS_CONFIG);

  useEffect(() => {
    if (!isLoading) setForm(config);
  }, [config, isLoading]);

  const update = (key: keyof DevisConfig, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    try {
      await saveConfig(form);
      toast.success("Paramètres du devis sauvegardés !");
    } catch {
      toast.error("Erreur lors de la sauvegarde.");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configurez les informations qui apparaissent sur tous les devis PDF générés.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Informations entreprise
            </CardTitle>
            <CardDescription>Ces informations apparaissent en en-tête du devis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nom de l'entreprise</Label>
                <Input id="companyName" value={form.companyName}
                  onChange={e => update("companyName", e.target.value)}
                  placeholder="MadagasBooking" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email}
                  onChange={e => update("email", e.target.value)}
                  placeholder="contact@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" value={form.phone}
                  onChange={e => update("phone", e.target.value)}
                  placeholder="+261 34 00 000 00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" value={form.address}
                  onChange={e => update("address", e.target.value)}
                  placeholder="Nosy Be, Madagascar" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Palette className="h-5 w-5 text-primary" />
              Apparence & Textes
            </CardTitle>
            <CardDescription>Personnalisez la couleur et les textes du devis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currencySymbol">Symbole de devise</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="currencySymbol"
                  value={form.currencySymbol}
                  onChange={e => update("currencySymbol", e.target.value)}
                  className="w-24 font-mono text-center text-lg"
                  placeholder="€"
                />
                <span className="text-sm text-muted-foreground">Exemples : €, $, MGA, Ar</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryColor">Couleur principale (en-tête du tableau)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="primaryColor"
                  value={form.primaryColor}
                  onChange={e => update("primaryColor", e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border border-input"
                />
                <Input
                  value={form.primaryColor}
                  onChange={e => update("primaryColor", e.target.value)}
                  className="w-32 font-mono"
                  placeholder="#008080"
                />
                <div className="h-8 flex-1 rounded" style={{ backgroundColor: form.primaryColor }} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditionsText">Texte conditions de paiement</Label>
              <Textarea id="conditionsText" value={form.conditionsText}
                onChange={e => update("conditionsText", e.target.value)}
                rows={2} placeholder="Paiement sur place à l'arrivée..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footerText">Texte pied de page</Label>
              <Textarea id="footerText" value={form.footerText}
                onChange={e => update("footerText", e.target.value)}
                rows={2} placeholder="MadagasBooking — Réservation en ligne..." />
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Aperçu en-tête du devis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-white p-6 text-sm space-y-1" style={{ fontFamily: "sans-serif" }}>
              <p className="text-xl font-bold" style={{ color: form.primaryColor }}>{form.companyName || "Nom entreprise"}</p>
              {form.address && <p className="text-gray-500">{form.address}</p>}
              <div className="flex gap-4 text-gray-500 text-xs">
                {form.phone && <span>📞 {form.phone}</span>}
                {form.email && <span>✉️ {form.email}</span>}
              </div>
              <div className="mt-3 h-1 rounded" style={{ backgroundColor: form.primaryColor }} />
              <p className="text-xs text-gray-600 mt-4">Exemple prix : <strong>150 {form.currencySymbol}</strong></p>
              <p className="text-xs text-gray-400 mt-2 italic">{form.conditionsText}</p>
              <p className="text-xs text-gray-400 italic">{form.footerText}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
