
// import { Button } from "@/components/ui/button";
// import { ArrowRight } from "lucide-react";

// const CTASection = () => {
//   return (
//     <section id="cta" className="py-16 relative overflow-hidden">
//       {/* Background decorations */}
//       <div className="absolute top-0 left-0 w-72 h-72 bg-pixelrise-blue rounded-full filter blur-3xl opacity-10"></div>
//       <div className="absolute bottom-0 right-0 w-96 h-96 bg-pixelrise-yellow rounded-full filter blur-3xl opacity-10"></div>
      
//       <div className="relative container mx-auto px-4">
//         <div className="bg-gradient-to-r from-pixelrise-blue to-blue-700 rounded-3xl py-12 md:py-16 px-6 md:px-12 shadow-xl">
//           <div className="max-w-4xl mx-auto text-center">
//             <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
//               Prêt à automatiser votre business en ligne?
//             </h2>
//             <p className="text-blue-100 text-lg mb-8">
//               Rejoignez des milliers d'entrepreneurs qui font confiance à Pixelrise pour développer leur présence en ligne sans effort.
//             </p>
            
//             <div className="flex flex-col sm:flex-row justify-center gap-4">
//               <Button className="bg-white text-pixelrise-blue hover:bg-blue-50 font-medium text-lg px-8 py-6 rounded-full flex items-center">
//                 <span>Commencer gratuitement</span>
//                 <ArrowRight size={18} className="ml-2" />
//               </Button>
//               <Button variant="outline" className="border-white text-white hover:bg-white/10 font-medium text-lg px-8 py-6 rounded-full">
//                 Voir la démonstration
//               </Button>
//             </div>
            
//             <p className="mt-6 text-blue-100 text-sm">
//               Aucune carte de crédit requise · Installation en quelques minutes · Annulez à tout moment
//             </p>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default CTASection;









import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Zap, 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  Shield, 
  Star,
  TrendingUp,
  Users,
  Sparkles,
  Crown,
  Gift,
  Rocket
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  const handleStartNow = () => {
    navigate('/register');
  };

  const handleWatchDemo = () => {
    // Ici vous pouvez ajouter la logique pour ouvrir une modal vidéo ou rediriger
    console.log('Opening demo...');
  };

  return (
    <section id="cta" className="py-24 relative overflow-hidden">
      {/* SEO Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPageElement",
          "name": "PixelRise Call to Action",
          "description": "Démarrez votre automatisation marketing IA avec PixelRise - Essai gratuit sans engagement",
          "url": "https://pixelrise.com/#cta"
        })}
      </script>

      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full filter blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tr from-yellow-500/20 to-orange-500/20 rounded-full filter blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-r from-green-500/15 to-emerald-500/15 rounded-full filter blur-2xl animate-float"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-10 right-20 opacity-20">
        <div className="w-16 h-16 bg-white rounded-full animate-bounce"></div>
      </div>
      <div className="absolute bottom-20 left-10 opacity-15">
        <div className="w-12 h-12 bg-yellow-300 rounded-lg animate-pulse"></div>
      </div>
      
      <div className="relative container mx-auto px-4 z-10">
        
        {/* Main CTA Container */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl py-16 md:py-20 px-8 md:px-16 shadow-2xl border border-white/20 relative overflow-hidden">
          
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
          </div>
          
          <div className="max-w-5xl mx-auto text-center relative z-10">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full px-6 py-3 text-white font-bold shadow-lg mb-8 animate-pulse">
              <Crown size={20} />
              <span>Dernière Chance - Offre Limitée</span>
              <Sparkles size={18} />
            </div>

            {/* Main Headline */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
              <span className="block">Prêt à</span>
              <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                10x votre Business
              </span>
              <span className="block">avec l'IA ?</span>
            </h2>
            
            {/* Enhanced Description */}
            <p className="text-xl md:text-2xl text-blue-100 mb-12 leading-relaxed max-w-4xl mx-auto">
              Rejoignez <strong className="text-white">250,000+ entrepreneurs</strong> qui automatisent leur succès avec PixelRise. 
              <em className="text-yellow-300"> Résultats garantis en 30 jours</em> ou 
              <strong className="text-green-300"> remboursement intégral</strong> !
            </p>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-6 h-6 text-blue-400 mr-2" />
                  <span className="text-2xl font-bold text-white">250k+</span>
                </div>
                <p className="text-blue-200 text-sm">Entrepreneurs actifs</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-6 h-6 text-green-400 mr-2" />
                  <span className="text-2xl font-bold text-white">347%</span>
                </div>
                <p className="text-blue-200 text-sm">ROI moyen</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-center mb-2">
                  <Star className="w-6 h-6 text-yellow-400 mr-2" />
                  <span className="text-2xl font-bold text-white">4.9/5</span>
                </div>
                <p className="text-blue-200 text-sm">Satisfaction client</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-6 h-6 text-purple-400 mr-2" />
                  <span className="text-2xl font-bold text-white">60s</span>
                </div>
                <p className="text-blue-200 text-sm">Setup complet</p>
              </div>
            </div>

            {/* Enhanced CTAs */}
            <div className="flex flex-col lg:flex-row justify-center items-center gap-6 mb-12">
              <Button
                onClick={handleStartNow}
                className="h-16 px-12 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 text-white font-bold text-xl rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 group relative overflow-hidden"
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                <div className="relative flex items-center gap-3">
                  <Zap size={24} className="group-hover:rotate-12 transition-transform" />
                  <span>DÉMARRER MAINTENANT</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Button>
              
              <Button
                onClick={handleWatchDemo}
                variant="outline"
                className="h-16 px-10 border-2 border-white/50 text-white hover:bg-white/10 font-bold text-lg rounded-full transition-all duration-300 hover:scale-105 bg-white/5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center">
                    <PlayCircle size={20} className="text-white" />
                  </div>
                  <span>Voir la Démo (2 min)</span>
                </div>
              </Button>
            </div>

            {/* Enhanced Trust Indicators */}
            <div className="space-y-6">
              <div className="flex flex-wrap justify-center items-center gap-8 text-blue-100">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <CheckCircle2 size={18} className="text-green-400" />
                  <span className="font-medium">Essai Gratuit 14 Jours</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <Shield size={18} className="text-blue-400" />
                  <span className="font-medium">Aucune Carte de Crédit</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <Clock size={18} className="text-purple-400" />
                  <span className="font-medium">Setup en 60 Secondes</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <Star size={18} className="text-yellow-400" />
                  <span className="font-medium">Garantie 30 Jours</span>
                </div>
              </div>

              {/* Urgency Element */}
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Gift className="w-6 h-6 text-orange-400" />
                  <span className="text-orange-200 font-bold text-lg">BONUS EXCLUSIF</span>
                  <Gift className="w-6 h-6 text-orange-400" />
                </div>
                <p className="text-white font-semibold mb-2">
                  🎁 Inscription avant minuit : <span className="text-yellow-300">Guide "10 Stratégies IA" GRATUIT</span> (valeur 97€)
                </p>
                <p className="text-orange-200 text-sm">
                  + 3 mois de support premium offerts • + Templates exclusifs • + Formation vidéo complète
                </p>
              </div>

              {/* Final Trust Message */}
              <p className="text-blue-200 text-lg max-w-3xl mx-auto leading-relaxed">
                <strong className="text-white">Rejoignez l'élite des entrepreneurs</strong> qui dominent leur marché grâce à l'automatisation IA. 
                <em className="text-yellow-300"> Votre succès commence maintenant</em> - 
                <strong className="text-green-300"> mais l'offre se termine bientôt</strong> ⏰
              </p>
            </div>
          </div>

          {/* Decorative Corner Elements */}
          <div className="absolute top-6 right-6 w-16 h-16 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded-full animate-pulse"></div>
          <div className="absolute bottom-6 left-6 w-12 h-12 bg-gradient-to-tr from-blue-400/30 to-purple-400/30 rounded-lg animate-bounce"></div>
        </div>

        {/* Final Social Proof Strip */}
        <div className="mt-12 text-center">
          <p className="text-white/80 text-lg mb-4 font-medium">
            Ils nous font déjà confiance :
          </p>
          <div className="flex justify-center items-center gap-8 opacity-60 hover:opacity-80 transition-opacity">
            <img 
              src="https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=120&h=40&fit=crop&auto=format&q=80" 
              alt="Entreprise technologique partenaire" 
              className="h-8 object-contain filter brightness-0 invert" 
            />
            <img 
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120&h=40&fit=crop&auto=format&q=80" 
              alt="Bureau moderne entreprise" 
              className="h-8 object-contain filter brightness-0 invert" 
            />
            <img 
              src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=120&h=40&fit=crop&auto=format&q=80" 
              alt="Startup innovante" 
              className="h-8 object-contain filter brightness-0 invert" 
            />
            <img 
              src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=120&h=40&fit=crop&auto=format&q=80" 
              alt="Équipe business moderne" 
              className="h-8 object-contain filter brightness-0 invert" 
            />
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=40&fit=crop&auto=format&q=80" 
              alt="Entreprise digitale" 
              className="h-8 object-contain filter brightness-0 invert" 
            />
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.9; }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(2deg); }
          }
          
          .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
          }
          
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
        `
      }} />
    </section>
  );
};

export default CTASection;