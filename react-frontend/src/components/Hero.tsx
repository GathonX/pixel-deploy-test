


import { Button } from "@/components/ui/button";
import { ChevronRight, Play, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Hero = () => {
  const navigate = useNavigate();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const handleVideoPlay = () => {
    setIsVideoPlaying(true);
    // Ici vous pouvez ajouter la logique pour ouvrir une modal vidéo ou rediriger
  };

  return (
    <section id="home" className="relative min-h-screen pt-15 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* SEO Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "PixelRise",
          "description": "Plateforme d'automatisation marketing IA pour entrepreneurs - Créez, gérez et développez automatiquement votre présence en ligne",
          "operatingSystem": "Web",
          "applicationCategory": "BusinessApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "EUR"
          }
        })}
      </script>

      {/* Enhanced Background Decorations */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-amber-300 via-yellow-300 to-orange-300 rounded-full filter blur-3xl opacity-20 animate-pulse-slow"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-400 rounded-full filter blur-3xl opacity-20 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-r from-green-300 to-emerald-300 rounded-full filter blur-2xl opacity-15 animate-float"></div>

      <div className="container mx-auto px-4 py-20 flex flex-col lg:flex-row items-center relative z-10">
        
        {/* Hero Content - Enhanced */}
        <div className="flex-1 lg:pr-12 z-20">
          
          {/* Badge/Announcement */}
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 rounded-full px-4 py-2 text-sm font-medium text-blue-700 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer">
              <Sparkles size={16} className="text-blue-500" />
              <span>Nouvelle fonctionnalité IA avancée disponible</span>
              <ChevronRight size={14} className="text-blue-500" />
            </div>
          </div>

          {/* Main Headline - SEO Optimized */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                Automatisez
              </span>
              <br />
              <span className="text-slate-800">votre business en ligne</span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                avec l'IA
              </span>
            </h1>
            
            {/* Enhanced Value Proposition */}
            <p className="mt-8 text-xl md:text-2xl text-slate-600 max-w-2xl leading-relaxed font-medium">
              La première plateforme d'<strong className="text-slate-800">automatisation marketing IA</strong> qui 
              crée, gère et développe votre présence en ligne <em className="text-blue-600">automatiquement</em>.
              <span className="block mt-2 text-lg text-slate-500">
                ⚡ Économisez 25+ heures/semaine • 🚀 +300% de croissance • 💰 ROI garanti
              </span>
            </p>
          </div>

          {/* Enhanced CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 mt-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button 
              className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-600 hover:via-yellow-600 hover:to-orange-600 text-black font-bold py-4 px-8 rounded-full text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group" 
              onClick={() => navigate('/register')}
            >
              <Zap size={20} className="mr-2 group-hover:rotate-12 transition-transform" />
              Démarrer maintenant - GRATUIT
            </Button>

            <Button 
              variant="outline" 
              className="flex items-center gap-3 py-4 px-8 rounded-full text-lg border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group bg-white/80 backdrop-blur-sm"
              onClick={handleVideoPlay}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play size={16} className="text-white ml-0.5" fill="currentColor" />
              </div>
              <span className="font-medium">Voir la démo (2 min)</span>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <p className="text-sm text-slate-500 mb-3 font-medium">✓ Aucune carte de crédit • ✓ Installation en 60 secondes • ✓ Support 24/7</p>
          </div>

          {/* Enhanced Stats Section */}
          <div className="mt-16 grid grid-cols-3 gap-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="text-center group cursor-pointer">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-6 h-6 text-blue-500 mr-2 group-hover:scale-110 transition-transform" />
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">250k+</p>
              </div>
              <p className="text-sm text-slate-600 font-medium">Entrepreneurs actifs</p>
              <p className="text-xs text-green-600 font-semibold mt-1">+23% ce mois</p>
            </div>
            
            <div className="text-center group cursor-pointer">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-6 h-6 text-green-500 mr-2 group-hover:scale-110 transition-transform" />
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">10M+</p>
              </div>
              <p className="text-sm text-slate-600 font-medium">Contenus générés</p>
              <p className="text-xs text-green-600 font-semibold mt-1">+45% ce mois</p>
            </div>
            
            <div className="text-center group cursor-pointer">
              <div className="flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6 text-yellow-500 mr-2 group-hover:scale-110 transition-transform" />
                <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">98.7%</p>
              </div>
              <p className="text-sm text-slate-600 font-medium">Satisfaction client</p>
              <p className="text-xs text-green-600 font-semibold mt-1">Score record</p>
            </div>
          </div>
        </div>

        {/* Enhanced Hero Visual Section */}
        <div className="flex-1 relative mt-16 lg:mt-0 min-h-[600px] animate-scale-in" style={{ animationDelay: '0.2s' }}>
          
          {/* Main Dashboard Image */}
          <div className="relative z-20 max-w-lg mx-auto">
            <div className="relative glass-card p-6 rounded-2xl shadow-2xl bg-white/80 backdrop-blur-sm border border-white/50">
              <img 
                src="https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&h=400&fit=crop&crop=center&auto=format&q=80" 
                alt="Dashboard PixelRise - Interface d'automatisation marketing IA" 
                className="rounded-xl shadow-lg w-full h-auto" 
                loading="eager"
              />
              
              {/* Premium Overlay Badge */}
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce">
                IA ACTIVE
              </div>
            </div>
          </div>

          {/* Enhanced Floating Notifications */}
          <div className="notification-bubble top-16 -left-8 animate-float bg-white/90 backdrop-blur-sm shadow-2xl border border-white/50" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center p-4">
              <div className="bg-gradient-to-r from-red-500 to-pink-500 p-3 rounded-xl">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-bold text-slate-800">+2,847 nouveaux leads</p>
                <p className="text-xs text-slate-500">Générés automatiquement</p>
              </div>
            </div>
          </div>

          <div className="notification-bubble right-0 top-32 animate-float bg-white/90 backdrop-blur-sm shadow-2xl border border-white/50" style={{ animationDelay: '1s' }}>
            <div className="flex items-center p-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-bold text-slate-800">ROI +347%</p>
                <p className="text-xs text-slate-500">vs mois dernier</p>
              </div>
            </div>
          </div>

          <div className="notification-bubble left-4 bottom-16 animate-float bg-white/90 backdrop-blur-sm shadow-2xl border border-white/50" style={{ animationDelay: '1.5s' }}>
            <div className="flex items-center p-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-bold text-slate-800">IA optimisée</p>
                <p className="text-xs text-slate-500">Performance +89%</p>
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-8 right-8 w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full opacity-30 animate-pulse-slow"></div>
          <div className="absolute bottom-12 left-12 w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg opacity-40 animate-spin-slow"></div>
        </div>
      </div>

     
      {/* Custom Styles - Inline CSS pour React */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.3; }
          }
          
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
          }
          
          .animate-spin-slow {
            animation: spin-slow 20s linear infinite;
          }
          
          .notification-bubble {
            position: absolute;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(12px);
            border-radius: 1rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.5);
            z-index: 15;
          }
          
          .glass-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.5);
          }
        `
      }} />
    </section>
  );
};

export default Hero;