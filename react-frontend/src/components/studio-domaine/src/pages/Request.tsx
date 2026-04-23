import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Globe,
  Building2,
  User,
  Mail,
  Phone,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  Loader2,
  Lock,
  CreditCard,
  Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { createRequest, CreateRequestData } from "@/services/studioDomainService";
import { createPurchase } from "@/components/payments/src/services/purchaseService";
import { euroToAriary } from "@/utils/currency";

const Request = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const domainFromSearch = searchParams.get("domain");
  const priceFromSearch  = parseFloat(searchParams.get("price") || "0");
  const currency         = searchParams.get("currency") || "EUR";

  // Rediriger si aucun domaine n'est passé en paramètre
  useEffect(() => {
    if (!domainFromSearch) {
      toast({
        title: "Domaine requis",
        description: "Veuillez d'abord rechercher et sélectionner un domaine disponible.",
        variant: "destructive",
      });
      navigate("/studio-domaine/search");
    }
  }, [domainFromSearch, navigate, toast]);

  const [formData, setFormData] = useState({
    domain:       domainFromSearch || "",
    client_name:  user?.name  || "",
    client_email: user?.email || "",
    client_phone: user?.phone || "",
    company_name: "",
    description:  "",
  });

  // Mettre à jour les champs dès que le profil utilisateur est chargé
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        client_name:  prev.client_name  || user.name  || "",
        client_email: prev.client_email || user.email || "",
        client_phone: prev.client_phone || user.phone || "",
      }));
    }
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors]             = useState<Record<string, string[]>>({});

  if (!domainFromSearch) {
    return (
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto text-center space-y-6">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Redirection vers la recherche...</p>
          </div>
        </div>
      </section>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!formData.domain || !formData.client_name || !formData.client_email) {
      toast({
        title: "Champs requis manquants",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Étape 1 : créer la StudioRequest
      const requestData: CreateRequestData = {
        domain:       formData.domain,
        client_name:  formData.client_name,
        client_email: formData.client_email,
        client_phone: formData.client_phone  || undefined,
        company_name: formData.company_name  || undefined,
        description:  formData.description   || undefined,
      };

      const requestResponse = await createRequest(requestData);

      if (!requestResponse.success || !requestResponse.data) {
        if (requestResponse.errors) setErrors(requestResponse.errors);
        toast({
          title: "Erreur",
          description: requestResponse.error || "Une erreur est survenue.",
          variant: "destructive",
        });
        return;
      }

      const studioRequest = requestResponse.data;

      // Étape 2 : créer la commande de paiement liée
      const priceEur    = priceFromSearch > 0 ? priceFromSearch : 0;
      const priceAriary = euroToAriary(priceEur);

      const purchaseOrder = await createPurchase({
        source:          "studio-domain",
        sourceItemId:    String(studioRequest.id),
        itemName:        formData.domain,
        itemDescription: `Enregistrement du nom de domaine ${formData.domain}`,
        priceEur,
        priceAriary,
      });

      toast({
        title: "Demande créée !",
        description: "Veuillez procéder au paiement pour finaliser votre commande.",
      });

      // Étape 3 : rediriger vers la facture (en passant le téléphone pour l'autofill)
      navigate(`/purchases/invoice/${purchaseOrder.id}`, {
        state: { userPhone: formData.client_phone || undefined },
      });

    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Demande de domaine
            </h1>
            <p className="text-muted-foreground">
              Vérifiez vos informations et procédez au paiement.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">

            {/* Résumé domaine + prix */}
            <div className="mb-8 p-5 rounded-2xl bg-primary/5 border border-primary/20">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Domaine sélectionné</p>
                    <p className="font-bold text-xl">{domainFromSearch}</p>
                  </div>
                </div>
                {priceFromSearch > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-success/10">
                      <Tag className="h-5 w-5 text-success" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Prix annuel</p>
                      <p className="font-bold text-xl text-success">
                        {priceFromSearch.toFixed(2)} {currency}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Avertissement */}
            <div className="mb-8 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-foreground">Paiement manuel requis</p>
                <p className="text-muted-foreground">
                  Après validation du formulaire, vous recevrez une facture à payer
                  (Orange Money, Mvola, Airtel…). Le domaine sera activé après confirmation.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Domaine (lecture seule) */}
              <div className="space-y-4 p-6 rounded-2xl bg-card border border-border">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Globe className="h-5 w-5 text-accent" />
                  Nom de domaine sélectionné
                </h2>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={formData.domain}
                    readOnly
                    disabled
                    className="text-lg pl-10 bg-muted/50 font-semibold"
                  />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-success" />
                  Domaine sélectionné depuis la recherche
                </p>
              </div>

              {/* Coordonnées */}
              <div className="space-y-6 p-6 rounded-2xl bg-card border border-border">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-accent" />
                  Vos coordonnées
                </h2>

                {user && (
                  <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg">
                    Champs pré-remplis depuis votre profil — modifiables si nécessaire.
                  </p>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nom complet *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Jean Dupont"
                        value={formData.client_name}
                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                        className={`pl-10 ${errors.client_name ? "border-destructive" : ""}`}
                        required
                      />
                    </div>
                    {errors.client_name && (
                      <p className="text-xs text-destructive mt-1">{errors.client_name[0]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Entreprise</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Ma Société"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="jean@exemple.fr"
                        value={formData.client_email}
                        onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                        className={`pl-10 ${errors.client_email ? "border-destructive" : ""}`}
                        required
                      />
                    </div>
                    {errors.client_email && (
                      <p className="text-xs text-destructive mt-1">{errors.client_email[0]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="+261 34 12 345 67"
                        value={formData.client_phone}
                        onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Message (optionnel)</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      placeholder="Précisez vos besoins ou questions..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="pl-10 min-h-[100px]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/50 text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  <span>En soumettant ce formulaire, vous acceptez nos conditions générales.</span>
                </div>

                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Valider et voir la facture
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/studio-domaine/search")}
                >
                  Changer de domaine
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default Request;
