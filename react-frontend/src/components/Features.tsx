
// import { FileText, Calendar, Users, LineChart, MessageSquare, Globe } from "lucide-react";
// import { cn } from "@/lib/utils";

// const Features = () => {
//   return (
//     <section id="features" className="py-20 bg-gray-50">
//       <div className="container mx-auto px-4">
//         {/* Section header */}
//         <div className="text-center max-w-3xl mx-auto mb-16">
//           <h2 className="text-3xl font-bold mb-4">
//             <span className="gradient-text">Tout-en-un</span> Solution IA pour votre Business
//           </h2>
//           <p className="text-gray-600 text-lg">
//             Pixelrise est une puissante plateforme d'IA qui réunit tous les outils nécessaires pour
//             développer et gérer automatiquement votre présence en ligne.
//           </p>
//         </div>
        
//         {/* Features grid */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//           {features.map((feature, index) => (
//             <FeatureCard key={index} feature={feature} index={index} />
//           ))}
//         </div>
//       </div>
//     </section>
//   );
// };

// interface Feature {
//   icon: React.ReactNode;
//   title: string;
//   description: string;
//   color: string;
// }

// const features: Feature[] = [
//   {
//     icon: <FileText size={24} />,
//     title: "Création de Business Plan",
//     description: "Générez automatiquement un business plan complet et personnalisé en fonction de votre secteur et de vos objectifs.",
//     color: "bg-blue-500",
//   },
//   {
//     icon: <MessageSquare size={24} />,
//     title: "Génération de Contenu",
//     description: "Créez automatiquement des articles de blog, publications sur les réseaux sociaux et emails marketing optimisés pour votre audience.",
//     color: "bg-orange-500",
//   },
//   {
//     icon: <Calendar size={24} />,
//     title: "Calendrier Éditorial",
//     description: "Planifiez et gérez votre calendrier de contenu avec une programmation intelligente adaptée à votre audience.",
//     color: "bg-green-500",
//   },
//   {
//     icon: <Globe size={24} />,
//     title: "Publication Automatique",
//     description: "Publiez automatiquement sur votre site web, blog et plateformes sociales à partir d'une interface centralisée.",
//     color: "bg-purple-500",
//   },
//   {
//     icon: <LineChart size={24} />,
//     title: "Analytics Avancés",
//     description: "Suivez les performances de votre contenu et obtenez des insights détaillés pour optimiser votre stratégie.",
//     color: "bg-pink-500",
//   },
//   {
//     icon: <Users size={24} />,
//     title: "Gestion Clientèle",
//     description: "Gérez vos clients, prospects et projets avec notre système intégré de CRM automatisé par l'IA.",
//     color: "bg-teal-500",
//   },
// ];

// interface FeatureCardProps {
//   feature: Feature;
//   index: number;
// }

// const FeatureCard = ({ feature, index }: FeatureCardProps) => {
//   return (
//     <div 
//       className="feature-card animate-fade-in" 
//       style={{ animationDelay: `${index * 0.1}s` }}
//     >
//       <div className={cn("feature-icon", feature.color)}>
//         {feature.icon}
//       </div>
//       <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
//       <p className="text-gray-600">{feature.description}</p>
//     </div>
//   );
// };

// export default Features;










import { 
  FileText, 
  Calendar, 
  Users, 
  LineChart, 
  MessageSquare, 
  Globe,
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
  Brain,
  Rocket,
  Shield,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const Features = () => {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <section id="features" className="py-24 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 relative overflow-hidden">
      {/* SEO Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "PixelRise Features",
          "description": "Fonctionnalités d'automatisation marketing IA pour entrepreneurs",
          "itemListElement": features.map((feature, index) => ({
            "@type": "SoftwareFeature",
            "position": index + 1,
            "name": feature.title,
            "description": feature.description
          }))
        })}
      </script>

      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tr from-yellow-400/20 to-orange-400/20 rounded-full filter blur-3xl"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Enhanced Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 rounded-full px-4 py-2 text-sm font-medium text-blue-700 shadow-sm mb-6">
            <Brain size={16} className="text-blue-500" />
            <span>Technologie IA de Nouvelle Génération</span>
            <Sparkles size={14} className="text-purple-500" />
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-slate-800 via-blue-700 to-purple-700 bg-clip-text text-transparent">
              Plateforme Tout-en-un
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              d'Automatisation IA
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed">
            <strong className="text-slate-800">PixelRise révolutionne</strong> la façon dont les entrepreneurs 
            développent leur business en ligne. <em className="text-blue-600">Une seule plateforme</em> pour 
            automatiser <strong className="text-slate-800">100% de votre marketing digital</strong>.
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">25+</p>
              <p className="text-sm text-slate-600">Heures économisées/semaine</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">300%</p>
              <p className="text-sm text-slate-600">Croissance moyenne</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">50+</p>
              <p className="text-sm text-slate-600">Intégrations disponibles</p>
            </div>
          </div>

          {/* CTA Preview */}
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-4 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
            <Rocket size={20} className="mr-2" />
            Découvrir toutes les fonctionnalités
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
        
        {/* Enhanced Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <FeatureCard 
              key={index} 
              feature={feature} 
              index={index}
              isHovered={hoveredFeature === index}
              onHover={() => setHoveredFeature(index)}
              onLeave={() => setHoveredFeature(null)}
            />
          ))}
        </div>

        {/* Additional Value Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-white/50 shadow-xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-6 text-slate-800">
                Pourquoi choisir <span className="text-blue-600">PixelRise</span> ?
              </h3>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <CheckCircle2 size={16} className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-1">{benefit.title}</h4>
                      <p className="text-slate-600 text-sm">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&h=400&fit=crop&auto=format&q=80" 
                alt="Dashboard PixelRise - Interface d'automatisation marketing complète" 
                className="rounded-2xl shadow-2xl w-full h-auto"
                loading="lazy"
              />
              
              {/* Floating Stats */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">ROI</p>
                    <p className="text-lg font-bold text-green-600">+347%</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">Automatisation</p>
                    <p className="text-lg font-bold text-blue-600">98.7%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
  color: string;
  gradient: string;
  category: string;
  isPopular?: boolean;
  isNew?: boolean;
}

const features: Feature[] = [
  {
    icon: <Brain size={28} />,
    title: "IA Business Plan Generator",
    description: "Créez automatiquement un business plan professionnel et détaillé en quelques minutes avec notre IA avancée.",
    benefits: ["Plan complet en 10 minutes", "Adapté à votre secteur", "Prêt pour investisseurs"],
    color: "from-blue-500 to-indigo-600",
    gradient: "bg-gradient-to-br from-blue-50 to-indigo-100",
    category: "Stratégie",
    isPopular: true
  },
  {
    icon: <MessageSquare size={28} />,
    title: "Génération de Contenu IA",
    description: "Produisez automatiquement des articles, posts sociaux et emails optimisés pour votre audience et votre marque.",
    benefits: ["Contenu 24/7", "Optimisé SEO", "Multi-plateformes"],
    color: "from-orange-500 to-red-600",
    gradient: "bg-gradient-to-br from-orange-50 to-red-100",
    category: "Contenu"
  },
  {
    icon: <Calendar size={28} />,
    title: "Calendrier Éditorial Intelligent",
    description: "Planifiez et programmez votre contenu avec une IA qui optimise automatiquement vos horaires de publication.",
    benefits: ["Planning automatique", "Meilleurs créneaux", "Cohérence garantie"],
    color: "from-green-500 to-emerald-600",
    gradient: "bg-gradient-to-br from-green-50 to-emerald-100",
    category: "Organisation"
  },
  {
    icon: <Globe size={28} />,
    title: "Publication Multi-Plateformes",
    description: "Diffusez automatiquement votre contenu sur tous vos canaux : site web, réseaux sociaux, newsletters, etc.",
    benefits: ["Une publication = partout", "Format adapté", "Synchronisation parfaite"],
    color: "from-purple-500 to-violet-600",
    gradient: "bg-gradient-to-br from-purple-50 to-violet-100",
    category: "Distribution",
    isNew: true
  },
  {
    icon: <BarChart3 size={28} />,
    title: "Analytics & Performance IA",
    description: "Obtenez des insights automatiques sur vos performances avec des recommandations d'optimisation personnalisées.",
    benefits: ["Rapports automatiques", "Insights actionables", "ROI tracking"],
    color: "from-pink-500 to-rose-600",
    gradient: "bg-gradient-to-br from-pink-50 to-rose-100",
    category: "Analytics"
  },
  {
    icon: <Users size={28} />,
    title: "CRM Automatisé",
    description: "Gérez vos prospects et clients avec un système CRM alimenté par l'IA qui automatise le suivi et la conversion.",
    benefits: ["Lead scoring automatique", "Suivi personnalisé", "Conversion optimisée"],
    color: "from-teal-500 to-cyan-600",
    gradient: "bg-gradient-to-br from-teal-50 to-cyan-100",
    category: "CRM"
  },
];

const benefits = [
  {
    title: "Setup en 60 secondes",
    description: "Démarrez immédiatement sans configuration complexe"
  },
  {
    title: "Intégrations natives",
    description: "Connectez tous vos outils existants en un clic"
  },
  {
    title: "Support expert 24/7",
    description: "Notre équipe vous accompagne à chaque étape"
  },
  {
    title: "ROI garanti",
    description: "Remboursement intégral si pas de résultats en 30 jours"
  }
];

interface FeatureCardProps {
  feature: Feature;
  index: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

const FeatureCard = ({ feature, index, isHovered, onHover, onLeave }: FeatureCardProps) => {
  return (
    <div
      className={cn(
        "relative group cursor-pointer transition-all duration-500",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Background Card */}
      <div className={cn(
        "relative h-full p-8 rounded-2xl border transition-all duration-500",
        "bg-white/90 backdrop-blur-sm shadow-lg",
        isHovered ? [
          "transform scale-105 shadow-2xl",
          "bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30",
          "border-blue-200"
        ] : "border-white/50 hover:border-blue-200/50"
      )}>
        
        {/* Category Badge */}
        <div className="absolute top-4 right-4">
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
            {feature.category}
          </span>
          {feature.isPopular && (
            <span className="absolute -top-2 -right-2 text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-bold animate-pulse">
              HOT
            </span>
          )}
          {feature.isNew && (
            <span className="absolute -top-2 -right-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full font-bold">
              NEW
            </span>
          )}
        </div>

        {/* Icon */}
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500",
          feature.gradient,
          isHovered && "scale-110 shadow-lg"
        )}>
          <div className={cn("bg-gradient-to-r bg-clip-text text-transparent", feature.color)}>
            {feature.icon}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
            {feature.title}
          </h3>
          
          <p className="text-slate-600 leading-relaxed">
            {feature.description}
          </p>

          {/* Benefits List */}
          <div className="space-y-2">
            {feature.benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                <span className="text-sm text-slate-600">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hover Effect Border - Supprimé l'overlay blanc qui cachait le contenu */}
        <div className={cn(
          "absolute inset-0 rounded-2xl transition-all duration-500 pointer-events-none",
          "border-2 border-transparent group-hover:border-gradient-to-r",
          isHovered && "border-opacity-50"
        )}></div>

        {/* Shine Effect - Modifié pour être plus subtil */}
        <div className={cn(
          "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-all duration-1000",
          "bg-gradient-to-tr from-transparent via-white/30 to-transparent",
          "translate-x-[-100%] group-hover:translate-x-[100%]"
        )}></div>
      </div>
    </div>
  );
};

export default Features;