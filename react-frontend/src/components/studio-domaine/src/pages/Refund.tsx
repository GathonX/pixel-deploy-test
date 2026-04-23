// Layout géré par App.tsx via DashboardLayout
import { Shield, RefreshCcw, Clock, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Refund = () => {
  const policies = [
    {
      icon: CheckCircle,
      title: "Remboursement intégral",
      condition: "Domaine indisponible",
      description:
        "Si le domaine demandé s'avère indisponible lors de notre vérification manuelle, vous êtes remboursé intégralement.",
      eligible: true,
    },
    {
      icon: RefreshCcw,
      title: "Annulation avant activation",
      condition: "Avant déploiement",
      description:
        "Vous pouvez annuler votre demande à tout moment avant l'activation du domaine et du site web.",
      eligible: true,
    },
    {
      icon: Clock,
      title: "Délai de rétractation",
      condition: "14 jours",
      description:
        "Conformément à la loi, vous disposez d'un délai de 14 jours après activation pour exercer votre droit de rétractation.",
      eligible: true,
    },
    {
      icon: XCircle,
      title: "Non remboursable",
      condition: "Après 14 jours",
      description:
        "Les domaines enregistrés et sites déployés depuis plus de 14 jours ne sont pas éligibles au remboursement.",
      eligible: false,
    },
  ];

  const faq = [
    {
      question: "Comment demander un remboursement ?",
      answer:
        "Contactez notre équipe par email à contact@domainflow.fr en précisant votre numéro de commande et le motif de votre demande.",
    },
    {
      question: "Combien de temps pour recevoir mon remboursement ?",
      answer:
        "Les remboursements sont traités sous 5 à 10 jours ouvrés après validation de votre demande.",
    },
    {
      question: "Le domaine peut-il être transféré si je ne suis pas satisfait ?",
      answer:
        "Oui, nous pouvons transférer le domaine vers un autre registrar de votre choix, sous réserve des délais légaux (60 jours après enregistrement).",
    },
  ];

  return (
    <>
      {/* Header */}
      <section className="py-16 md:py-20 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex p-3 rounded-full bg-white/10">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-white">
              Politique de Remboursement
            </h1>
            <p className="text-white/80">
              Votre satisfaction est notre priorité
            </p>
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {policies.map((policy, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-2xl border ${
                    policy.eligible
                      ? "bg-success/5 border-success/30"
                      : "bg-muted/50 border-border"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl ${
                        policy.eligible ? "bg-success/20" : "bg-muted"
                      }`}
                    >
                      <policy.icon
                        className={`h-6 w-6 ${
                          policy.eligible
                            ? "text-success"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          policy.eligible
                            ? "bg-success/20 text-success"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {policy.condition}
                      </span>
                      <h3 className="font-display text-lg font-semibold mt-2">
                        {policy.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-2">
                        {policy.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-center mb-8">
              Processus de remboursement
            </h2>
            <div className="flex flex-col md:flex-row gap-4">
              {[
                { step: "1", text: "Contactez-nous par email" },
                { step: "2", text: "Validation de votre demande" },
                { step: "3", text: "Traitement sous 5-10 jours" },
                { step: "4", text: "Confirmation par email" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex-1 flex items-center gap-3 p-4 rounded-xl bg-card border border-border"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center text-white font-bold text-sm">
                    {item.step}
                  </div>
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-center mb-8">
              Questions fréquentes
            </h2>
            <div className="space-y-4">
              {faq.map((item, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-card border border-border"
                >
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <HelpCircle className="h-5 w-5 text-accent" />
                    {item.question}
                  </h3>
                  <p className="text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">
                Vous avez d'autres questions ?
              </p>
              <Link to="/studio-domaine/request">
                <Button variant="default">Nous contacter</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Refund;
