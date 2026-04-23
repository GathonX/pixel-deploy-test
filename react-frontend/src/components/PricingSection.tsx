
// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Check } from "lucide-react";
// import { cn } from "@/lib/utils";

// const PricingSection = () => {
//   const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("monthly");

//   return (
//     <section id="pricing" className="py-20 bg-gray-50">
//       <div className="container mx-auto px-4">
//         {/* Section header */}
//         <div className="text-center max-w-3xl mx-auto mb-12">
//           <span className="text-sm font-medium text-pixelrise-blue uppercase tracking-wider">Tarification</span>
//           <h2 className="text-3xl font-bold mt-2 mb-4">Des offres adaptées à vos besoins</h2>
//           <p className="text-gray-600 mb-8">
//             Choisissez le forfait qui convient à votre activité, pas de frais cachés.
//           </p>
          
//           {/* Toggle */}
//           <div className="flex items-center justify-center mb-8">
//             <span className={cn("mr-3 text-sm", billingCycle === "monthly" ? "font-medium" : "text-gray-500")}>
//               Mensuel
//             </span>
//             <button
//               onClick={() => setBillingCycle(billingCycle === "monthly" ? "annually" : "monthly")}
//               className={cn(
//                 "relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none",
//                 billingCycle === "annually" ? "bg-pixelrise-blue" : "bg-gray-300"
//               )}
//             >
//               <span
//                 className={cn(
//                   "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
//                   billingCycle === "annually" ? "translate-x-7" : "translate-x-1"
//                 )}
//               />
//             </button>
//             <span className={cn("ml-3 text-sm", billingCycle === "annually" ? "font-medium" : "text-gray-500")}>
//               Annuel <span className="text-xs text-green-500 font-medium">-20%</span>
//             </span>
//           </div>
//         </div>
        
//         {/* Pricing cards */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
//           {pricingPlans.map((plan, index) => (
//             <div
//               key={index}
//               className={cn(
//                 "bg-white rounded-2xl shadow-lg overflow-hidden transition-transform hover:-translate-y-1 animate-fade-in",
//                 plan.popular ? "border-4 border-pixelrise-yellow relative" : "border border-gray-200",
//               )}
//               style={{ animationDelay: `${index * 0.2}s` }}
//             >
//               {plan.popular && (
//                 <div className="absolute top-0 right-0 bg-pixelrise-yellow text-black font-medium py-1 px-4 text-sm">
//                   Le plus populaire
//                 </div>
//               )}
              
//               <div className="p-6">
//                 <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
//                 <p className="text-gray-600 h-12 mb-2">{plan.description}</p>
//                 <div className="mt-6 mb-4">
//                   <span className="text-4xl font-bold">
//                     {billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}€
//                   </span>
//                   <span className="text-gray-600 ml-1">/ mois</span>
//                 </div>
                
//                 <Button 
//                   className={cn(
//                     "w-full py-6 font-medium", 
//                     plan.popular ? "bg-pixelrise-yellow text-black hover:bg-opacity-90" : ""
//                   )}
//                   variant={plan.popular ? "default" : "outline"}
//                 >
//                   {plan.buttonText}
//                 </Button>
//               </div>
              
//               <div className="border-t border-gray-100 p-6">
//                 <p className="font-medium mb-4">Ce qui est inclus:</p>
//                 <ul className="space-y-3">
//                   {plan.features.map((feature, i) => (
//                     <li key={i} className="flex items-start">
//                       <Check size={18} className="mr-2 text-green-500 flex-shrink-0 mt-0.5" />
//                       <span className="text-gray-700 text-sm">{feature}</span>
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             </div>
//           ))}
//         </div>
        
//         {/* Enterprise CTA */}
//         <div className="mt-16 text-center max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
//           <h3 className="text-2xl font-bold mb-4">Besoin d'une solution sur mesure?</h3>
//           <p className="text-gray-600 mb-6">
//             Notre offre Enterprise s'adapte parfaitement aux besoins spécifiques des grandes organisations.
//           </p>
//           <Button className="bg-black hover:bg-gray-800 text-white font-medium px-8 py-3 rounded-full">
//             Contacter l'équipe commerciale
//           </Button>
//         </div>
//       </div>
//     </section>
//   );
// };

// const pricingPlans = [
//   {
//     name: "Starter",
//     description: "Idéal pour les entrepreneurs solo et les petites entreprises",
//     monthlyPrice: "49",
//     yearlyPrice: "39",
//     buttonText: "Démarrer gratuitement",
//     popular: false,
//     features: [
//       "Business plan automatisé",
//       "5 posts générés par semaine",
//       "2 plateformes de réseaux sociaux",
//       "Calendrier éditorial basique",
//       "Analytics essentiels",
//       "Assistance par email"
//     ]
//   },
//   {
//     name: "Pro",
//     description: "Pour les entreprises en croissance ayant besoin de plus d'automatisation",
//     monthlyPrice: "99",
//     yearlyPrice: "79",
//     buttonText: "Commencer l'essai gratuit",
//     popular: true,
//     features: [
//       "Tout ce qui est inclus dans Starter",
//       "20 posts générés par semaine",
//       "5 plateformes de réseaux sociaux",
//       "Calendrier éditorial avancé",
//       "Publication automatique",
//       "Analytics détaillés",
//       "Assistance prioritaire"
//     ]
//   },
//   {
//     name: "Business",
//     description: "Solution complète pour les entreprises établies",
//     monthlyPrice: "199",
//     yearlyPrice: "159",
//     buttonText: "Contacter les ventes",
//     popular: false,
//     features: [
//       "Tout ce qui est inclus dans Pro",
//       "Posts illimités générés",
//       "Toutes les plateformes de réseaux sociaux",
//       "Calendrier éditorial personnalisé",
//       "Marketing automatisé avancé",
//       "Analytics complets avec rapports",
//       "Gestion de budget marketing automatisée",
//       "Gestionnaire de compte dédié"
//     ]
//   }
// ];

// export default PricingSection;












import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  Zap, 
  ArrowRight, 
  Star, 
  Crown, 
  Rocket, 
  Shield, 
  Clock, 
  TrendingUp,
  Sparkles,
  Award,
  Users,
  Target,
  Phone,
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";

const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annually">("annually");

  return (
    <section id="pricing" className="py-24 bg-gradient-to-br from-slate-50 via-white to-purple-50/30 relative overflow-hidden">
      {/* SEO Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "PixelRise Pricing Plans",
          "description": "Plans tarifaires PixelRise pour automatisation marketing IA",
          "itemListElement": pricingPlans.map((plan, index) => ({
            "@type": "Product",
            "position": index + 1,
            "name": plan.name,
            "description": plan.description,
            "offers": {
              "@type": "Offer",
              "price": plan.yearlyPrice,
              "priceCurrency": "EUR",
              "availability": "InStock"
            }
          }))
        })}
      </script>

      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tr from-yellow-400/10 to-orange-400/10 rounded-full filter blur-3xl"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        
        {/* Enhanced Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-full px-4 py-2 text-sm font-medium text-green-700 shadow-sm mb-6">
            <Award size={16} className="text-green-500" />
            <span>Plans Sans Engagement</span>
            <Sparkles size={14} className="text-emerald-500" />
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-slate-800 via-blue-700 to-purple-700 bg-clip-text text-transparent">
              Tarifs Transparents
            </span>
            <br />
            
          </h2>
          
          <p className="text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed">
            <strong className="text-slate-800">Investissez intelligemment</strong> dans votre croissance. 
            Nos plans s'adaptent à <em className="text-blue-600">votre ambition</em>, pas l'inverse.
            <strong className="text-green-600"> Garantie satisfait ou remboursé 30 jours</strong> !
          </p>

          {/* Enhanced Toggle with Benefits */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-white/50 shadow-lg">
              <div className="flex items-center">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={cn(
                    "px-6 py-3 rounded-xl font-medium transition-all duration-300",
                    billingCycle === "monthly" 
                      ? "bg-blue-600 text-white shadow-lg" 
                      : "text-slate-600 hover:text-slate-800"
                  )}
                >
                  Mensuel
                </button>
                
                <button
                  onClick={() => setBillingCycle("annually")}
                  className={cn(
                    "px-6 py-3 rounded-xl font-medium transition-all duration-300 relative",
                    billingCycle === "annually" 
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg" 
                      : "text-slate-600 hover:text-slate-800"
                  )}
                >
                  Annuel
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                    -20%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Value Propositions */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/50 shadow-sm">
              <Shield size={16} className="text-green-500" />
              <span className="text-sm font-medium text-slate-700">Essai gratuit 14 jours</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/50 shadow-sm">
              <Clock size={16} className="text-blue-500" />
              <span className="text-sm font-medium text-slate-700">Annulation à tout moment</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/50 shadow-sm">
              <TrendingUp size={16} className="text-purple-500" />
              <span className="text-sm font-medium text-slate-700">Evolutions</span>
            </div>
          </div>
        </div>
        
        {/* Enhanced Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
          {pricingPlans.map((plan, index) => (
            <PricingCard 
              key={index} 
              plan={plan} 
              index={index} 
              billingCycle={billingCycle}
            />
          ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-white/50 shadow-xl mb-16">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-slate-800 mb-4">
              Comparaison <span className="text-blue-600">Détaillée</span>
            </h3>
            <p className="text-slate-600 text-lg">
              Tous nos plans incluent notre technologie IA de pointe
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 px-4 font-semibold text-slate-800">Fonctionnalités</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-800">Starter</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-800">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-800">Business</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    <td className="py-4 px-4 font-medium text-slate-700">{feature.name}</td>
                    <td className="text-center py-4 px-4">{feature.starter}</td>
                    <td className="text-center py-4 px-4">{feature.pro}</td>
                    <td className="text-center py-4 px-4">{feature.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Enhanced Enterprise Section */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/10 relative overflow-hidden hidden">
          
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
          </div>
          
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-medium text-white/80 shadow-sm mb-6">
              <Crown size={16} className="text-yellow-400" />
              <span>Solution Enterprise</span>
            </div>
            
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Besoin d'une Solution <span className="text-yellow-400">Sur Mesure</span> ?
            </h3>
            
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              Notre offre Enterprise s'adapte parfaitement aux besoins spécifiques des grandes organisations. 
              <strong className="text-white"> API personnalisée</strong>, <em className="text-blue-300">intégrations avancées</em>, 
              et <strong className="text-yellow-400">support dédié 24/7</strong>.
            </p>

            {/* Enterprise Features */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                <h4 className="font-semibold text-white mb-2">Équipes Illimitées</h4>
                <p className="text-white/70 text-sm">Gestion centralisée de multiples équipes et projets</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <Shield className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <h4 className="font-semibold text-white mb-2">Sécurité Renforcée</h4>
                <p className="text-white/70 text-sm">SSO, audit trails, conformité RGPD/SOC2</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <Target className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <h4 className="font-semibold text-white mb-2">IA Personnalisée</h4>
                <p className="text-white/70 text-sm">Modèles IA entraînés sur vos données spécifiques</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button className="h-14 px-8 bg-white text-slate-900 hover:bg-white/90 font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-full">
                <Phone size={18} className="mr-3" />
                Parler à un Expert
                <ArrowRight size={18} className="ml-3" />
              </Button>
              
              <Button 
                variant="outline" 
                className="h-14 px-8 border-2 border-white/30 text-white hover:bg-white/10 transition-all duration-300 rounded-full"
              >
                <Mail size={18} className="mr-3" />
                Demander une Démo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface PricingPlan {
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  buttonText: string;
  popular: boolean;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  features: string[];
  highlight?: string;
}

const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    displayName: "Starter",
    description: "Parfait pour les entrepreneurs solo qui démarrent leur présence en ligne",
    monthlyPrice: "49",
    yearlyPrice: "39",
    buttonText: "Essai Gratuit 14 Jours",
    popular: false,
    icon: <Rocket className="w-6 h-6" />,
    color: "from-blue-500 to-indigo-600",
    gradient: "bg-gradient-to-br from-blue-50 to-indigo-100",
    highlight: "Idéal pour commencer",
    features: [
      "IA Business Plan automatisé",
      "5 contenus générés par semaine",
      "2 plateformes sociales connectées",
      "Calendrier éditorial intelligent",
      "Analytics essentiels & insights",
      "Support email prioritaire",
      "Templates et modèles prêts",
      "Formation vidéo incluse"
    ]
  },
  {
    name: "Pro",
    displayName: "Pro",
    description: "Solution complète pour les entreprises en croissance qui veulent automatiser massivement",
    monthlyPrice: "99",
    yearlyPrice: "79",
    buttonText: "Commencer Maintenant",
    popular: true,
    icon: <Star className="w-6 h-6" />,
    color: "from-green-500 to-emerald-600",
    gradient: "bg-gradient-to-br from-green-50 to-emerald-100",
    highlight: "Le plus populaire",
    features: [
      "Tout du plan Starter +",
      "Contenus illimités générés 24/7",
      "5 plateformes sociales + Blog",
      "Publication automatique cross-platform",
      "Analytics avancés + Rapports",
      "A/B Testing automatique",
      "Support chat prioritaire",
      "Intégrations CRM/Email marketing",
      "White-label disponible"
    ]
  },
  {
    name: "Business",
    displayName: "Business",
    description: "Puissance maximale pour les entreprises établies qui dominent leur marché",
    monthlyPrice: "199",
    yearlyPrice: "159",
    buttonText: "Débloquer la Puissance",
    popular: false,
    icon: <Crown className="w-6 h-6" />,
    color: "from-purple-500 to-violet-600",
    gradient: "bg-gradient-to-br from-purple-50 to-violet-100",
    highlight: "Performance maximale",
    features: [
      "Tout du plan Pro +",
      "IA personnalisée à votre marque",
      "Toutes plateformes + API custom",
      "Automatisation marketing avancée",
      "Prédictions IA & recommandations",
      "Gestionnaire de compte dédié",
      "Support téléphone 24/7",
      "Formation équipe personnalisée",
      "SLA 99.9% uptime garanti"
    ]
  }
];

const comparisonFeatures = [
  { name: "Contenus IA générés", starter: "5/semaine", pro: "Illimités", business: "Illimités + IA custom" },
  { name: "Plateformes connectées", starter: "2", pro: "5 + Blog", business: "Toutes + API" },
  { name: "Analytics & Rapports", starter: "Basiques", pro: "Avancés", business: "Prédictifs IA" },
  { name: "Support", starter: "Email", pro: "Chat prioritaire", business: "Téléphone 24/7" },
  { name: "Équipes utilisateurs", starter: "1", pro: "5", business: "Illimitées" },
  { name: "White-label", starter: "❌", pro: "✅", business: "✅ + Custom" },
];

interface PricingCardProps {
  plan: PricingPlan;
  index: number;
  billingCycle: "monthly" | "annually";
}

const PricingCard = ({ plan, index, billingCycle }: PricingCardProps) => {
  const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const savings = billingCycle === "annually" ? 
    Math.round((parseInt(plan.monthlyPrice) - parseInt(plan.yearlyPrice)) / parseInt(plan.monthlyPrice) * 100) : 0;

  return (
    <div
      className={cn(
        "relative group transition-all duration-500 animate-fade-in",
        plan.popular && "lg:-mt-8"
      )}
      style={{ animationDelay: `${index * 0.2}s` }}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-2 px-6 rounded-full text-sm shadow-lg animate-pulse">
            🔥 Le Plus Populaire
          </div>
        </div>
      )}

      {/* Card Container */}
      <div className={cn(
        "h-full bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border transition-all duration-500 overflow-hidden group-hover:shadow-2xl group-hover:scale-105",
        plan.popular ? "border-orange-300 ring-2 ring-orange-200" : "border-white/50"
      )}>
        
        {/* Header */}
        <div className={cn("p-8 pb-6 text-center", plan.gradient)}>
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-gradient-to-r", plan.color)}>
            <div className="text-white">{plan.icon}</div>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-800 mb-2">{plan.displayName}</h3>
          <p className="text-slate-600 text-sm mb-4">{plan.highlight}</p>
          
          {/* Price */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-bold text-slate-800">{price}€</span>
              <div className="text-left">
                <p className="text-slate-600 text-sm">/ mois</p>
                {billingCycle === "annually" && savings > 0 && (
                  <p className="text-green-600 text-xs font-semibold">Économie {savings}%</p>
                )}
              </div>
            </div>
            
            {billingCycle === "annually" && (
              <p className="text-slate-500 text-sm">
                Soit {parseInt(plan.yearlyPrice) * 12}€ facturés annuellement
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="px-8 pb-6">
          <p className="text-slate-600 text-center leading-relaxed">{plan.description}</p>
        </div>

        {/* CTA Button */}
        <div className="px-8 pb-6">
          <Button 
            className={cn(
              "w-full h-14 font-bold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300",
              plan.popular 
                ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white" 
                : `bg-gradient-to-r ${plan.color} hover:opacity-90 text-white`
            )}
          >
            <Zap size={18} className="mr-2" />
            {plan.buttonText}
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
        
        {/* Features */}
        <div className="border-t border-slate-100 p-8">
          <h4 className="font-semibold text-slate-800 mb-4 flex items-center">
            <Check size={18} className="mr-2 text-green-500" />
            Fonctionnalités incluses
          </h4>
          
          <ul className="space-y-3">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start">
                <Check size={16} className="mr-3 text-green-500 flex-shrink-0 mt-1" />
                <span className="text-slate-700 text-sm leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PricingSection;
