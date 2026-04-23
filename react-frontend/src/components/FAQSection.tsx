
// import { useState } from "react";
// import { cn } from "@/lib/utils";
// import { ChevronDown } from "lucide-react";

// const FAQSection = () => {
//   return (
//     <section className="py-20 bg-gray-50">
//       <div className="container mx-auto px-4">
//         <div className="text-center max-w-2xl mx-auto mb-12">
//           <h2 className="text-3xl font-bold mb-4">Questions fréquentes</h2>
//           <p className="text-gray-600">
//             Vous avez des questions? Nous avons les réponses. Si vous ne trouvez pas ce que vous cherchez, contactez notre équipe de support.
//           </p>
//         </div>
        
//         <div className="max-w-3xl mx-auto">
//           {faqs.map((faq, index) => (
//             <FAQItem key={index} question={faq.question} answer={faq.answer} />
//           ))}
//         </div>
        
//         <div className="text-center mt-12">
//           <p className="text-gray-600 mb-4">
//             Vous avez encore des questions?
//           </p>
//           <a 
//             href="#" 
//             className="text-pixelrise-blue hover:underline font-medium inline-flex items-center"
//           >
//             Contactez notre support
//             <ChevronDown size={18} className="ml-1 transform rotate-270" />
//           </a>
//         </div>
//       </div>
//     </section>
//   );
// };

// interface FAQItemProps {
//   question: string;
//   answer: string;
// }

// const FAQItem = ({ question, answer }: FAQItemProps) => {
//   const [isOpen, setIsOpen] = useState(false);

//   return (
//     <div className="border-b border-gray-200">
//       <button
//         onClick={() => setIsOpen(!isOpen)}
//         className="w-full flex items-center justify-between py-5 text-left focus:outline-none"
//       >
//         <h3 className="font-medium text-lg">{question}</h3>
//         <ChevronDown
//           size={20}
//           className={cn(
//             "transition-transform duration-200",
//             isOpen ? "transform rotate-180" : ""
//           )}
//         />
//       </button>
//       <div
//         className={cn(
//           "overflow-hidden transition-all duration-300",
//           isOpen ? "max-h-96 pb-5" : "max-h-0"
//         )}
//       >
//         <p className="text-gray-600">{answer}</p>
//       </div>
//     </div>
//   );
// };

// const faqs = [
//   {
//     question: "Qu'est-ce que Pixelrise exactement?",
//     answer: "Pixelrise est une plateforme d'automatisation complète propulsée par l'IA qui permet aux entrepreneurs de créer, gérer et développer leur business en ligne. Elle automatise la création de business plans, la génération de contenu, la gestion du calendrier éditorial, la publication sur différentes plateformes et l'analyse des performances."
//   },
//   {
//     question: "Comment Pixelrise génère-t-il du contenu personnalisé?",
//     answer: "Notre technologie d'IA analyse votre secteur d'activité, votre audience cible et vos objectifs commerciaux pour créer du contenu pertinent et engageant. Le contenu est optimisé pour chaque plateforme spécifique et peut être ajusté selon vos préférences et votre ton de marque."
//   },
//   {
//     question: "Puis-je intégrer Pixelrise avec mes outils existants?",
//     answer: "Oui, Pixelrise s'intègre avec de nombreux outils populaires, notamment WordPress, Shopify, tous les réseaux sociaux majeurs, MailChimp, Google Analytics et bien d'autres. Notre équipe technique ajoute régulièrement de nouvelles intégrations."
//   },
//   {
//     question: "Ai-je besoin de connaissances techniques pour utiliser Pixelrise?",
//     answer: "Non, Pixelrise a été conçu pour être facile à utiliser, même pour les entrepreneurs sans compétences techniques. Notre interface intuitive et nos assistants d'IA vous guident à travers chaque étape du processus de configuration et d'utilisation."
//   },
//   {
//     question: "Puis-je personnaliser les stratégies suggérées par l'IA?",
//     answer: "Absolument! Bien que l'IA propose des stratégies optimisées basées sur des analyses de données, vous gardez toujours le contrôle final. Vous pouvez modifier, ajuster ou remplacer n'importe quelle suggestion à tout moment."
//   },
//   {
//     question: "Comment puis-je mesurer le retour sur investissement avec Pixelrise?",
//     answer: "Pixelrise intègre un tableau de bord analytics complet qui suit automatiquement les métriques clés comme le trafic, l'engagement, les conversions et le ROI. Vous recevez également des rapports réguliers avec des insights exploitables pour améliorer vos performances."
//   }
// ];

// export default FAQSection;








import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  ChevronDown, 
  HelpCircle, 
  MessageCircle, 
  Phone, 
  Mail, 
  Clock, 
  Shield, 
  Star,
  CheckCircle2,
  ArrowRight,
  Search,
  Sparkles,
  Users,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FAQSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["general"]);

  const filteredFaqs = searchQuery
    ? Object.entries(faqCategories).reduce((acc, [category, faqs]) => {
        const filtered = faqs.filter(faq =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        if (filtered.length > 0) acc[category] = filtered;
        return acc;
      }, {} as Record<string, typeof faqCategories.general>)
    : faqCategories;

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <section id="faq" className="py-24 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative overflow-hidden">
      {/* SEO Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": Object.values(faqCategories).flat().map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
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
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 rounded-full px-4 py-2 text-sm font-medium text-blue-700 shadow-sm mb-6">
            <HelpCircle size={16} className="text-blue-500" />
            <span>Centre d'Aide Complet</span>
            <Sparkles size={14} className="text-purple-500" />
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-slate-800 via-blue-700 to-purple-700 bg-clip-text text-transparent">
              Questions Fréquentes
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              & Réponses Expertes
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed">
            <strong className="text-slate-800">Trouvez toutes les réponses</strong> à vos questions sur 
            <em className="text-blue-600"> l'automatisation IA PixelRise</em>. Notre équipe d'experts 
            <strong className="text-green-600"> répond en moins de 2h</strong> !
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <Input
                type="text"
                placeholder="Rechercher dans les questions fréquentes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 text-lg rounded-2xl border-2 border-slate-200 focus:border-blue-500 bg-white/80 backdrop-blur-sm shadow-lg"
              />
            </div>
            {searchQuery && (
              <p className="mt-3 text-sm text-slate-600">
                {Object.values(filteredFaqs).flat().length} résultat(s) trouvé(s)
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <HelpCircle className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-800">50+</p>
              <p className="text-sm text-slate-600">Questions répondues</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-800">2h</p>
              <p className="text-sm text-slate-600">Temps de réponse</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-800">24/7</p>
              <p className="text-sm text-slate-600">Support disponible</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-800">98%</p>
              <p className="text-sm text-slate-600">Satisfaction support</p>
            </div>
          </div>
        </div>
        
        {/* Enhanced FAQ Categories */}
        <div className="max-w-5xl mx-auto mb-16">
          {Object.entries(filteredFaqs).map(([categoryKey, faqs]) => {
            const category = categoryMetadata[categoryKey];
            const isOpen = openCategories.includes(categoryKey);
            
            return (
              <div key={categoryKey} className="mb-8">
                <button
                  onClick={() => toggleCategory(categoryKey)}
                  className="w-full flex items-center justify-between p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${category.gradient}`}>
                      {category.icon}
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-slate-600 text-sm">{faqs.length} questions</p>
                    </div>
                  </div>
                  <ChevronDown
                    size={24}
                    className={cn(
                      "transition-transform duration-300 text-slate-600",
                      isOpen ? "rotate-180" : ""
                    )}
                  />
                </button>
                
                {isOpen && (
                  <div className="mt-4 space-y-3">
                    {faqs.map((faq, index) => (
                      <FAQItem 
                        key={index} 
                        question={faq.question} 
                        answer={faq.answer}
                        category={category.title}
                        tags={faq.tags}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Enhanced Support Section */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/10 relative overflow-hidden">
          
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
          </div>
          
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-medium text-white/80 shadow-sm mb-6">
              <MessageCircle size={16} className="text-blue-400" />
              <span>Support Expert 24/7</span>
            </div>
            
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Besoin d'une Aide <span className="text-blue-400">Personnalisée</span> ?
            </h3>
            
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              Notre équipe d'experts PixelRise est disponible <strong className="text-white">24/7</strong> pour vous accompagner. 
              <em className="text-blue-300">Support multicanal</em> et <strong className="text-yellow-400">réponse garantie sous 2h</strong>.
            </p>

            {/* Support Channels */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group cursor-pointer">
                <MessageCircle className="w-8 h-8 text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white mb-2">Chat en Direct</h4>
                <p className="text-white/70 text-sm">Réponse immédiate de nos experts</p>
                <p className="text-green-400 text-xs font-semibold mt-2">● En ligne maintenant</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group cursor-pointer">
                <Mail className="w-8 h-8 text-green-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white mb-2">Support Email</h4>
                <p className="text-white/70 text-sm">Réponse détaillée sous 2h</p>
                <p className="text-blue-400 text-xs font-semibold mt-2">support@pixelrise.com</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group cursor-pointer">
                <Phone className="w-8 h-8 text-purple-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-white mb-2">Support Téléphone</h4>
                <p className="text-white/70 text-sm">Assistance vocale premium</p>
                <p className="text-yellow-400 text-xs font-semibold mt-2">Plans Pro & Business</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button className="h-14 px-8 bg-white text-slate-900 hover:bg-white/90 font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 rounded-full">
                <MessageCircle size={18} className="mr-3" />
                Contacter le Support
                <ArrowRight size={18} className="ml-3" />
              </Button>
              
              <Button 
                variant="outline" 
                className="h-14 px-8 border-2 border-white/30 text-white hover:bg-white/10 transition-all duration-300 rounded-full"
              >
                <HelpCircle size={18} className="mr-3" />
                Centre d'Aide Complet
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface FAQItemProps {
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

const FAQItem = ({ question, answer, category, tags }: FAQItemProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left focus:outline-none group"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
              {category}
            </span>
            {tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <h3 className="font-semibold text-lg text-slate-800 group-hover:text-blue-700 transition-colors leading-relaxed">
            {question}
          </h3>
        </div>
        <div className="ml-4 flex-shrink-0">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
            isOpen ? "bg-blue-100 rotate-180" : "bg-slate-100 group-hover:bg-blue-50"
          )}>
            <ChevronDown
              size={18}
              className={cn(
                "transition-colors",
                isOpen ? "text-blue-600" : "text-slate-600"
              )}
            />
          </div>
        </div>
      </button>
      
      <div
        className={cn(
          "overflow-hidden transition-all duration-500 ease-in-out",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-6 pb-6">
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-start gap-3 mt-4">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle2 size={14} className="text-green-600" />
              </div>
              <p className="text-slate-700 leading-relaxed">{answer}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CategoryMetadata {
  title: string;
  icon: React.ReactNode;
  gradient: string;
}

const categoryMetadata: Record<string, CategoryMetadata> = {
  general: {
    title: "Questions Générales",
    icon: <HelpCircle className="w-6 h-6 text-white" />,
    gradient: "bg-gradient-to-r from-blue-500 to-purple-500"
  },
  pricing: {
    title: "Tarifs & Abonnements",
    icon: <Star className="w-6 h-6 text-white" />,
    gradient: "bg-gradient-to-r from-green-500 to-emerald-500"
  },
  technical: {
    title: "Questions Techniques",
    icon: <Zap className="w-6 h-6 text-white" />,
    gradient: "bg-gradient-to-r from-orange-500 to-red-500"
  },
  security: {
    title: "Sécurité & Confidentialité",
    icon: <Shield className="w-6 h-6 text-white" />,
    gradient: "bg-gradient-to-r from-purple-500 to-pink-500"
  }
};

const faqCategories = {
  general: [
    {
      question: "Qu'est-ce que PixelRise exactement et comment cela fonctionne-t-il ?",
      answer: "PixelRise est une plateforme d'automatisation marketing complète propulsée par l'IA. Elle permet aux entrepreneurs de créer, gérer et développer leur business en ligne automatiquement. L'IA analyse votre secteur, génère du contenu personnalisé, gère vos réseaux sociaux, crée des business plans détaillés et optimise vos performances en temps réel - le tout sans intervention manuelle.",
      tags: ["plateforme", "automatisation", "IA", "fonctionnement"]
    },
    {
      question: "Pour qui PixelRise est-il adapté ? Ai-je besoin d'expertise technique ?",
      answer: "PixelRise est conçu pour tous les entrepreneurs, des débutants aux experts. Aucune compétence technique n'est requise ! Notre interface intuitive et nos assistants IA vous guident à chaque étape. Que vous soyez freelance, startup ou PME, PixelRise s'adapte à votre niveau et vos besoins.",
      tags: ["débutants", "entrepreneurs", "facilité", "interface"]
    },
    {
      question: "Combien de temps faut-il pour voir les premiers résultats ?",
      answer: "La plupart de nos clients observent des résultats dès les 7 premiers jours ! L'automatisation du contenu commence immédiatement, et vous verrez une augmentation significative de votre présence en ligne dans les 2-3 premières semaines. Les résultats complets (ROI, trafic, conversions) sont généralement visibles après 30 jours.",
      tags: ["résultats", "rapidité", "ROI", "performance"]
    },
    {
      question: "PixelRise peut-il remplacer une agence marketing complète ?",
      answer: "Oui ! PixelRise automatise 95% des tâches qu'une agence marketing traditionnelle effectue : création de contenu, gestion des réseaux sociaux, SEO, analytics, stratégie... Pour une fraction du coût d'une agence (qui coûte 3000-8000€/mois), vous obtenez une solution disponible 24/7 qui ne prend jamais de vacances !",
      tags: ["agence", "remplacement", "coût", "automatisation"]
    }
  ],
  pricing: [
    {
      question: "Quels sont vos plans tarifaires et que inclut chaque forfait ?",
      answer: "Nous proposons 3 plans : Starter (39€/mois) pour débuter avec les fonctionnalités essentielles, Pro (79€/mois) notre plan le plus populaire avec toutes les fonctionnalités avancées, et Business (159€/mois) pour les entreprises avec IA personnalisée et support dédié. Tous incluent un essai gratuit de 14 jours.",
      tags: ["plans", "tarifs", "forfaits", "essai gratuit"]
    },
    {
      question: "Y a-t-il des frais cachés ou des limitations sur l'utilisation ?",
      answer: "Aucun frais caché ! Le prix affiché est le prix final. Pas de limitation sur le nombre de contenus générés, de publications ou d'analyses. Tous nos plans incluent les mises à jour, le support et l'accès à toutes les nouvelles fonctionnalités. Annulation possible à tout moment sans pénalité.",
      tags: ["transparence", "frais cachés", "limitations", "annulation"]
    },
    {
      question: "Proposez-vous une garantie satisfait ou remboursé ?",
      answer: "Absolument ! Nous offrons une garantie satisfait ou remboursé de 30 jours. Si PixelRise ne vous convient pas pour quelque raison que ce soit, nous vous remboursons intégralement sans poser de questions. C'est notre façon de vous montrer notre confiance en notre produit.",
      tags: ["garantie", "remboursement", "satisfaction", "confiance"]
    }
  ],
  technical: [
    {
      question: "Comment PixelRise s'intègre-t-il avec mes outils existants ?",
      answer: "PixelRise se connecte nativement avec plus de 50 plateformes : WordPress, Shopify, tous les réseaux sociaux majeurs, Google Analytics, MailChimp, Zapier, et bien d'autres. L'intégration se fait en quelques clics via notre interface. Notre équipe ajoute régulièrement de nouvelles intégrations selon les demandes.",
      tags: ["intégrations", "compatibilité", "connexion", "outils"]
    },
    {
      question: "L'IA peut-elle vraiment comprendre mon secteur d'activité spécifique ?",
      answer: "Oui ! Notre IA est entraînée sur des milliers de secteurs différents. Elle analyse votre niche, votre audience, vos concurrents et adapte automatiquement le contenu généré. Plus vous l'utilisez, plus elle apprend et s'améliore. Elle maîtrise aussi bien l'e-commerce que les services B2B, les professions libérales, etc.",
      tags: ["IA", "secteur", "personnalisation", "apprentissage"]
    },
    {
      question: "Que se passe-t-il si je veux modifier le contenu généré par l'IA ?",
      answer: "Vous gardez un contrôle total ! Chaque contenu peut être modifié, approuvé ou rejeté avant publication. Vous pouvez définir votre ton, vos mots-clés préférés, et même entraîner l'IA avec vos propres exemples. L'IA apprend de vos corrections pour s'améliorer continuellement.",
      tags: ["contrôle", "modification", "personnalisation", "flexibilité"]
    }
  ],
  security: [
    {
      question: "Mes données sont-elles sécurisées avec PixelRise ?",
      answer: "La sécurité est notre priorité absolue ! Nous utilisons un chiffrement AES-256, nos serveurs sont certifiés SOC2, et nous sommes 100% conformes RGPD. Vos données ne sont jamais vendues à des tiers. Nous effectuons des audits de sécurité réguliers et nos datacenters sont de niveau bancaire.",
      tags: ["sécurité", "RGPD", "chiffrement", "confidentialité"]
    },
    {
      question: "Qui a accès à mes contenus et stratégies marketing ?",
      answer: "Vous seul avez accès à vos contenus et stratégies ! Nos équipes techniques peuvent accéder aux données pour le support uniquement avec votre autorisation explicite. L'IA traite vos données localement et de manière anonymisée. Aucun contenu n'est partagé entre utilisateurs.",
      tags: ["accès", "confidentialité", "propriété", "données"]
    },
    {
      question: "Puis-je exporter mes données si je souhaite changer de solution ?",
      answer: "Bien sûr ! Vous pouvez exporter toutes vos données à tout moment en un clic : contenus générés, analytics, stratégies, contacts, etc. Nous proposons plusieurs formats (CSV, JSON, PDF) et notre équipe peut vous aider dans la migration. Vos données vous appartiennent à 100%.",
      tags: ["export", "migration", "propriété", "portabilité"]
    }
  ]
};

export default FAQSection;