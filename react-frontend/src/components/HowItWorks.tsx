
// import { Button } from "@/components/ui/button";

// const HowItWorks = () => {
//   return (
//     <section className="py-20 bg-gray-50">
//       <div className="container mx-auto px-4">
//         {/* Section heading */}
//         <div className="max-w-3xl mx-auto text-center mb-16">
//           <h2 className="text-3xl font-bold mb-4">
//             <span className="gradient-text">Automatisez</span> totalement votre business en ligne
//           </h2>
//           <p className="text-gray-600 text-lg">
//             Tout ce que vous pouvez faire manuellement pour votre entreprise en ligne,
//             vous pouvez le faire automatiquement avec Pixelrise
//           </p>
//         </div>
        
//         {/* Video demo section */}
//         <div className="relative max-w-4xl mx-auto mb-20 animate-scale-in">
//           <div className="bg-gray-900 aspect-video rounded-2xl overflow-hidden shadow-xl">
//             <div className="relative w-full h-full">
//               <img 
//                 src="/lovable-uploads/7ff11ce4-df2b-4d9c-9df5-239b267d4062.png" 
//                 alt="Pixelrise Demo" 
//                 className="w-full h-full object-cover opacity-60"
//               />
              
//               <div className="absolute inset-0 flex items-center justify-center">
//                 <Button className="w-20 h-20 rounded-full bg-pixelrise-yellow hover:bg-opacity-90 flex items-center justify-center">
//                   <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
//                     <polygon points="5 3 19 12 5 21 5 3"></polygon>
//                   </svg>
//                 </Button>
//               </div>
//             </div>
//           </div>
          
//           {/* Decorative elements */}
//           <div className="absolute -top-6 -left-6 w-32 h-32 bg-pixelrise-blue rounded-full opacity-20"></div>
//           <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-pixelrise-yellow rounded-full opacity-20"></div>
//         </div>
        
//         {/* Process steps */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//           {steps.map((step, index) => (
//             <div 
//               key={index} 
//               className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 animate-fade-in"
//               style={{ animationDelay: `${index * 0.2}s` }}
//             >
//               <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-pixelrise-blue font-bold text-xl mb-6">
//                 {index + 1}
//               </div>
//               <h3 className="text-xl font-bold mb-3">{step.title}</h3>
//               <p className="text-gray-600">{step.description}</p>
//             </div>
//           ))}
//         </div>
        
//         {/* CTA */}
//         <div className="mt-16 text-center">
//           <Button className="bg-pixelrise-yellow hover:bg-opacity-90 text-black font-medium px-8 py-3 rounded-full text-lg">
//             Commencer maintenant
//           </Button>
//         </div>
//       </div>
//     </section>
//   );
// };

// const steps = [
//   {
//     title: "Inscrivez-vous",
//     description: "Créez votre compte et configurez votre profil d'entreprise avec vos objectifs et préférences."
//   },
//   {
//     title: "Connectez vos plateformes",
//     description: "Intégrez vos comptes de réseaux sociaux, site web et autres canaux de marketing digital."
//   },
//   {
//     title: "L'IA prend le relais",
//     description: "Notre IA analyse votre marché, crée du contenu sur mesure et gère votre présence en ligne automatiquement."
//   }
// ];

// export default HowItWorks;






import { Button } from "@/components/ui/button";
import { 
  Play, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Link2, 
  Brain,
  Rocket,
  Target,
  TrendingUp,
  Shield,
  Award
} from "lucide-react";
import { useState } from "react";

const HowItWorks = () => {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const handleVideoPlay = () => {
    setIsVideoPlaying(true);
    // Ici vous pouvez ajouter la logique pour ouvrir une modal vidéo ou rediriger
  };

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative overflow-hidden">
      {/* SEO Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "Comment utiliser PixelRise pour automatiser votre marketing",
          "description": "Guide complet en 3 étapes pour automatiser votre business en ligne avec l'IA PixelRise",
          "step": steps.map((step, index) => ({
            "@type": "HowToStep",
            "position": index + 1,
            "name": step.title,
            "text": step.description,
            "image": step.imageUrl
          }))
        })}
      </script>

      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tr from-yellow-400/10 to-orange-400/10 rounded-full filter blur-3xl"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        
        {/* Enhanced Section Header */}
        <div className="max-w-4xl mx-auto text-center mb-20">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-full px-4 py-2 text-sm font-medium text-green-700 shadow-sm mb-6">
            <Rocket size={16} className="text-green-500" />
            <span>Processus Simplifié en 3 Étapes</span>
            <Sparkles size={14} className="text-emerald-500" />
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-slate-800 via-blue-700 to-purple-700 bg-clip-text text-transparent">
              De Zéro à Héros
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              en 60 Secondes
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed">
            <strong className="text-slate-800">Transformez votre business</strong> avec notre processus 
            d'automatisation <em className="text-blue-600">révolutionnaire</em>. 
            <strong className="text-green-600">Aucune expertise technique requise</strong> !
          </p>

          {/* Quick Benefits */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/50 shadow-sm">
              <Clock size={16} className="text-blue-500" />
              <span className="text-sm font-medium text-slate-700">Setup en 60 secondes</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/50 shadow-sm">
              <Shield size={16} className="text-green-500" />
              <span className="text-sm font-medium text-slate-700">Sécurisé & RGPD</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-white/50 shadow-sm">
              <Award size={16} className="text-purple-500" />
              <span className="text-sm font-medium text-slate-700">Garantie 30 jours</span>
            </div>
          </div>
        </div>
        
        {/* Enhanced Video Demo Section */}
        <div className="relative max-w-5xl mx-auto mb-24 animate-scale-in">
          <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            
            {/* Video Container */}
            <div className="aspect-video relative">
              <img 
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=675&fit=crop&crop=center&auto=format&q=80" 
                alt="PixelRise Demo - Automatisation marketing IA en action pour entrepreneurs" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
              
              {/* Video Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>
              
              {/* Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  onClick={handleVideoPlay}
                  className="group relative w-24 h-24 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-500 hover:via-orange-600 hover:to-red-600 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all duration-300 animate-pulse-slow"
                >
                  <Play size={32} className="text-white ml-1" fill="currentColor" />
                  
                  {/* Ripple Effect */}
                  <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-pulse"></div>
                </button>
              </div>
              
              {/* Video Stats */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-slate-800">Démo Live • 2 min</span>
                </div>
              </div>
              
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" />
                  <span className="text-sm font-medium text-slate-800">250k+ vues</span>
                </div>
              </div>
            </div>
            
            {/* Video Footer */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">Automatisation PixelRise en Action</h3>
                  <p className="text-slate-300 text-sm">Découvrez comment générer +300% de croissance</p>
                </div>
                <Button 
                  onClick={handleVideoPlay}
                  variant="outline" 
                  size="sm" 
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  <Play size={16} className="mr-2" />
                  Regarder
                </Button>
              </div>
            </div>
          </div>
          
          {/* Enhanced Decorative Elements */}
          <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-2xl opacity-60 animate-float"></div>
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-gradient-to-tr from-yellow-500/30 to-orange-500/30 rounded-full opacity-60 animate-float" style={{ animationDelay: '1s' }}></div>
          
          {/* Floating Achievement Badge */}
          <div className="absolute -top-4 right-8 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl animate-bounce">
            🏆 #1 Solution IA
          </div>
        </div>
        
        {/* Enhanced Process Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <StepCard key={index} step={step} index={index} />
          ))}
        </div>

        {/* Success Metrics */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-white/50 shadow-xl mb-16 hidden">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-slate-800 mb-4">
              Résultats <span className="text-green-600">Garantis</span>
            </h3>
            <p className="text-slate-600 text-lg">
              Rejoignez des milliers d'entrepreneurs qui ont transformé leur business
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {metrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  {metric.icon}
                </div>
                <p className="text-3xl font-bold text-slate-800 mb-2">{metric.value}</p>
                <p className="text-sm text-slate-600 font-medium">{metric.label}</p>
                <p className="text-xs text-green-600 font-semibold mt-1">{metric.growth}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Enhanced CTA Section */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-slate-800 mb-6">
            Prêt à <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Révolutionner</span> votre Business ?
          </h3>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Button className="h-14 px-8 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 text-white font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group rounded-full">
              <Zap size={20} className="mr-3 group-hover:rotate-12 transition-transform" />
              Commencer GRATUITEMENT
              <ArrowRight size={18} className="ml-3 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              variant="outline" 
              className="h-14 px-8 border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 rounded-full bg-white/80 backdrop-blur-sm"
              onClick={handleVideoPlay}
            >
              <Play size={18} className="mr-3" />
              Voir la démo complète
            </Button>
          </div>
          
          <p className="text-sm text-slate-500 mb-4">
            ✓ Aucune carte de crédit • ✓ Résultats en 24h • ✓ Support premium inclus
          </p>
        </div>
      </div>

      {/* Custom Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(1deg); }
          }
          
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
          }
          
          .animate-float {
            animation: float 4s ease-in-out infinite;
          }
          
          .animate-pulse-slow {
            animation: pulse-slow 3s ease-in-out infinite;
          }
        `
      }} />
    </section>
  );
};

interface Step {
  title: string;
  description: string;
  details: string[];
  icon: React.ReactNode;
  color: string;
  gradient: string;
  imageUrl: string;
  time: string;
}

const steps: Step[] = [
  {
    title: "Setup Instantané",
    description: "Créez votre compte et configurez votre profil d'entreprise avec vos objectifs en moins d'une minute.",
    details: [
      "Inscription en 30 secondes",
      "Configuration automatique",
      "Pas de carte de crédit"
    ],
    icon: <Rocket className="w-6 h-6 text-white" />,
    color: "from-blue-500 to-indigo-600",
    gradient: "bg-gradient-to-br from-blue-50 to-indigo-100",
    imageUrl: "https://images.unsplash.com/photo-1551650975-87deedd944c3",
    time: "30 sec"
  },
  {
    title: "Connexions Intelligentes",
    description: "Notre IA connecte automatiquement vos plateformes existantes et analyse votre écosystème digital.",
    details: [
      "Intégration automatique",
      "50+ plateformes supportées",
      "Synchronisation temps réel"
    ],
    icon: <Link2 className="w-6 h-6 text-white" />,
    color: "from-green-500 to-emerald-600",
    gradient: "bg-gradient-to-br from-green-50 to-emerald-100",
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f",
    time: "15 sec"
  },
  {
    title: "IA en Action",
    description: "L'intelligence artificielle génère, optimise et publie votre contenu automatiquement 24/7.",
    details: [
      "Contenu personnalisé 24/7",
      "Optimisation continue",
      "Performance tracking"
    ],
    icon: <Brain className="w-6 h-6 text-white" />,
    color: "from-purple-500 to-violet-600",
    gradient: "bg-gradient-to-br from-purple-50 to-violet-100",
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995",
    time: "15 sec"
  },
];

const metrics = [
  {
    icon: <TrendingUp className="w-8 h-8 text-white" />,
    value: "+347%",
    label: "Croissance moyenne",
    growth: "+23% ce mois"
  },
  {
    icon: <Clock className="w-8 h-8 text-white" />,
    value: "25h",
    label: "Économisées/semaine",
    growth: "Temps libéré"
  },
  {
    icon: <Target className="w-8 h-8 text-white" />,
    value: "98.7%",
    label: "Satisfaction client",
    growth: "Score record"
  },
  {
    icon: <Award className="w-8 h-8 text-white" />,
    value: "250k+",
    label: "Entrepreneurs actifs",
    growth: "+15% mensuel"
  }
];

interface StepCardProps {
  step: Step;
  index: number;
}

const StepCard = ({ step, index }: StepCardProps) => {
  return (
    <div 
      className="group relative animate-fade-in hover:scale-105 transition-all duration-500"
      style={{ animationDelay: `${index * 0.2}s` }}
    >
      {/* Card Container */}
      <div className="h-full bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/50 group-hover:shadow-2xl transition-all duration-500">
        
        {/* Step Number */}
        <div className="flex items-center justify-between mb-6">
          <div className={`w-14 h-14 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
            {step.icon}
          </div>
          
          <div className="text-right">
            <span className="text-2xl font-bold text-slate-300">0{index + 1}</span>
            <p className="text-xs text-green-600 font-semibold">{step.time}</p>
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
            {step.title}
          </h3>
          
          <p className="text-slate-600 leading-relaxed">
            {step.description}
          </p>
          
          {/* Details List */}
          <div className="space-y-2">
            {step.details.map((detail, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                <span className="text-sm text-slate-600">{detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Connection Line (except last card) */}
        {index < steps.length - 1 && (
          <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-slate-300 to-transparent transform -translate-y-1/2"></div>
        )}
      </div>
    </div>
  );
};

export default HowItWorks;