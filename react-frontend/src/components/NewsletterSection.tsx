
// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { useToast } from "@/components/ui/use-toast";

// const NewsletterSection = () => {
//   const [email, setEmail] = useState("");
//   const [loading, setLoading] = useState(false);
//   const { toast } = useToast();

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!email || !email.includes("@")) {
//       toast({
//         title: "Email invalide",
//         description: "Veuillez entrer une adresse email valide.",
//         variant: "destructive"
//       });
//       return;
//     }
    
//     setLoading(true);
    
//     // Simuler un appel API
//     setTimeout(() => {
//       toast({
//         title: "Inscription réussie!",
//         description: "Merci de vous être inscrit à notre newsletter.",
//       });
//       setEmail("");
//       setLoading(false);
//     }, 1000);
//   };

//   return (
//     <section className="py-16 bg-gradient-to-br from-pixelrise-blue to-blue-700 text-white">
//       <div className="container mx-auto px-4">
//         <div className="max-w-3xl mx-auto text-center">
//           <h2 className="text-3xl font-bold mb-4">Restez informé des dernières nouveautés</h2>
//           <p className="text-blue-100 text-lg mb-8">
//             Inscrivez-vous à notre newsletter pour recevoir des conseils d'experts, des tutoriels exclusifs et 
//             être informé des nouvelles fonctionnalités de Pixelrise.
//           </p>
          
//           <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
//             <Input
//               type="email"
//               placeholder="Votre adresse email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               className="bg-white bg-opacity-20 border-0 placeholder:text-blue-100 text-white py-6 focus-visible:ring-white"
//             />
//             <Button 
//               type="submit" 
//               disabled={loading} 
//               className="bg-white text-pixelrise-blue hover:bg-blue-50 font-medium py-6 px-8"
//             >
//               {loading ? "Inscription..." : "S'inscrire"}
//             </Button>
//           </form>
          
//           <p className="mt-4 text-sm text-blue-100">
//             Nous respectons votre vie privée. Désabonnement possible à tout moment.
//           </p>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default NewsletterSection;









import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { 
  Mail, 
  Gift, 
  Zap, 
  TrendingUp, 
  Star, 
  Users, 
  CheckCircle2, 
  Sparkles,
  Crown,
  ArrowRight,
  Shield,
  Clock
} from "lucide-react";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation email améliorée
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast({
        title: "Email invalide ❌",
        description: "Veuillez entrer une adresse email valide pour recevoir nos contenus exclusifs.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Simuler appel API (remplacez par votre endpoint réel)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "🎉 Inscription réussie !",
        description: "Bienvenue dans la communauté PixelRise ! Vérifiez votre boîte mail pour le guide gratuit.",
        duration: 5000
      });
      
      setEmail("");
    } catch (error) {
      toast({
        title: "Erreur d'inscription ❌",
        description: "Une erreur est survenue. Veuillez réessayer dans quelques instants.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="newsletter" className="py-24 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
      {/* SEO Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "NewsLetterSeason",
          "name": "PixelRise Newsletter",
          "description": "Newsletter PixelRise - Conseils automatisation marketing IA pour entrepreneurs",
          "publisher": {
            "@type": "Organization",
            "name": "PixelRise"
          }
        })}
      </script>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full filter blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 rounded-full filter blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-full filter blur-2xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          
          {/* Enhanced Header */}
          <div className="text-center mb-16">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-medium text-white/90 shadow-lg mb-6">
              <Crown size={16} className="text-yellow-400" />
              <span>Contenu VIP Exclusif</span>
              <Sparkles size={14} className="text-purple-400" />
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
              <span className="text-white">Rejoignez</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                50,000+ Entrepreneurs
              </span>
              <br />
              <span className="text-white">qui Dominent leur Marché</span>
            </h2>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed max-w-4xl mx-auto">
              Recevez chaque semaine des <strong className="text-white">stratégies exclusives d'automatisation IA</strong>, 
              des <em className="text-yellow-300">tutoriels premium</em> et soyez les premiers informés des 
              <strong className="text-purple-300"> nouvelles fonctionnalités révolutionnaires</strong> !
            </p>

            {/* Value Props Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <Gift className="w-10 h-10 text-yellow-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg mb-2 text-white">Guide Gratuit</h3>
                <p className="text-blue-100 text-sm">eBook "10 Stratégies IA pour 10x votre Business" (valeur 47€)</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <Zap className="w-10 h-10 text-purple-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg mb-2 text-white">Conseils Experts</h3>
                <p className="text-blue-100 text-sm">Stratégies exclusives partagées par nos experts en automatisation</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
                <TrendingUp className="w-10 h-10 text-green-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg mb-2 text-white">Accès Prioritaire</h3>
                <p className="text-blue-100 text-sm">Nouvelles fonctionnalités en avant-première + réductions exclusives</p>
              </div>
            </div>
          </div>

          {/* Enhanced Newsletter Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 md:p-12 border border-white/20 shadow-2xl max-w-3xl mx-auto mb-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                🎁 Recevez Votre Guide GRATUIT
              </h3>
              <p className="text-blue-100 text-lg">
                <strong className="text-white">+47€ de valeur</strong> • <em className="text-yellow-300">Téléchargement immédiat</em> • 
                <strong className="text-purple-300"> Stratégies éprouvées</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300" size={20} />
                  <Input
                    type="email"
                    placeholder="votre.email@entreprise.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 pr-4 py-4 text-lg bg-white/20 border-2 border-white/30 placeholder:text-blue-200 text-white rounded-2xl focus:border-blue-400 focus:bg-white/25 transition-all duration-300"
                    disabled={loading}
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="lg:w-auto w-full h-14 px-8 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Inscription...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Gift size={20} />
                      <span>Recevoir le Guide GRATUIT</span>
                      <ArrowRight size={18} />
                    </div>
                  )}
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-blue-200">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-green-400" />
                  <span>100% Confidentiel</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-blue-400" />
                  <span>Envoi Hebdomadaire</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-purple-400" />
                  <span>Désabonnement 1-clic</span>
                </div>
              </div>
            </form>
          </div>

          {/* Social Proof & Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="flex items-center justify-center mb-3">
                <Users className="w-8 h-8 text-blue-400 mr-2 group-hover:scale-110 transition-transform" />
                <span className="text-3xl md:text-4xl font-bold text-white">50k+</span>
              </div>
              <p className="text-blue-200 font-medium">Entrepreneurs Abonnés</p>
              <p className="text-blue-300 text-sm mt-1">+23% ce mois</p>
            </div>
            
            <div className="group">
              <div className="flex items-center justify-center mb-3">
                <Star className="w-8 h-8 text-yellow-400 mr-2 group-hover:scale-110 transition-transform" />
                <span className="text-3xl md:text-4xl font-bold text-white">4.9</span>
              </div>
              <p className="text-blue-200 font-medium">Note Moyenne</p>
              <p className="text-blue-300 text-sm mt-1">+2847 avis</p>
            </div>
            
            <div className="group">
              <div className="flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8 text-green-400 mr-2 group-hover:scale-110 transition-transform" />
                <span className="text-3xl md:text-4xl font-bold text-white">94%</span>
              </div>
              <p className="text-blue-200 font-medium">Taux d'Ouverture</p>
              <p className="text-blue-300 text-sm mt-1">Vs 22% moyenne</p>
            </div>
            
            <div className="group">
              <div className="flex items-center justify-center mb-3">
                <Zap className="w-8 h-8 text-purple-400 mr-2 group-hover:scale-110 transition-transform" />
                <span className="text-3xl md:text-4xl font-bold text-white">347%</span>
              </div>
              <p className="text-blue-200 font-medium">ROI Moyen Abonnés</p>
              <p className="text-blue-300 text-sm mt-1">Premier trimestre</p>
            </div>
          </div>

          {/* Enhanced Privacy Notice */}
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-6 py-3">
              <Shield size={16} className="text-green-400" />
              <span className="text-blue-100 text-sm">
                Nous respectons votre vie privée. Vos données ne sont jamais partagées. 
                <strong className="text-white"> Désabonnement possible à tout moment</strong> d'un simple clic.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.8; }
          }
          
          .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
          }
        `
      }} />
    </section>
  );
};

export default NewsletterSection;