import { Button } from "@/components/ui/button";
import { 
  Check, 
  Zap, 
  ArrowRight, 
  Clock, 
  TrendingUp, 
  Shield, 
  Users, 
  Sparkles,
  Award,
  Target,
  BarChart3,
  Brain
} from "lucide-react";

const AboutSection = () => {
  return (
    <section id="about" className="py-24 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 relative overflow-hidden">
      {/* SEO Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "PixelRise",
          "description": "Plateforme d'automatisation marketing IA pour entrepreneurs - Créez, gérez et développez automatiquement votre business en ligne",
          "url": "https://pixelrise.com",
          "sameAs": ["https://twitter.com/pixelrise", "https://linkedin.com/company/pixelrise"],
          "foundingDate": "2024",
          "employees": "10-50",
          "industry": "Marketing Technology",
          "productOrService": {
            "@type": "SoftwareApplication",
            "name": "PixelRise Platform",
            "applicationCategory": "BusinessApplication"
          }
        })}
      </script>

      {/* Background Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full filter blur-2xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 rounded-full filter blur-2xl"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col xl:flex-row items-center gap-20">
          
          {/* Enhanced Image Side */}
          <div className="xl:w-1/2 relative animate-fade-in">
            <div className="relative z-20">
              {/* Main Dashboard Image */}
              <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/50">
                <img 
                  src="https://images.unsplash.com/photo-1551650975-87deedd944c3?w=700&h=500&fit=crop&crop=center&auto=format&q=80" 
                  alt="Interface PixelRise - Dashboard d'automatisation marketing IA pour entrepreneurs" 
                  className="rounded-xl w-full h-auto shadow-lg"
                  loading="lazy"
                />
                
                {/* Premium Badge */}
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
                  ✨ IA ACTIVE
                </div>
              </div>

              {/* Floating Stats Cards */}
              <div className="absolute -top-8 -left-8 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 border border-white/50 animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Croissance</p>
                    <p className="text-lg font-bold text-green-600">+347%</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-8 -right-8 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 border border-white/50 animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Temps économisé</p>
                    <p className="text-lg font-bold text-blue-600">25h/sem</p>
                  </div>
                </div>
              </div>

              <div className="absolute top-1/2 -left-12 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 border border-white/50 animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Clients satisfaits</p>
                    <p className="text-lg font-bold text-purple-600">98.7%</p>
                  </div>
                </div>
              </div>
              
              {/* Decorative Elements Enhanced */}
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl opacity-20 animate-pulse-slow"></div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full opacity-20 animate-pulse-slow"></div>
            </div>
          </div>
          
          {/* Enhanced Content Side */}
          <div className="xl:w-1/2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 rounded-full px-4 py-2 text-sm font-medium text-blue-700 shadow-sm mb-6">
              <Brain size={16} className="text-blue-500" />
              <span>Solution Révolutionnaire</span>
              <Sparkles size={14} className="text-purple-500" />
            </div>

            {/* Enhanced Headline */}
            <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-slate-800 via-blue-700 to-purple-700 bg-clip-text text-transparent">
                L'Automatisation IA
              </span>
              <br />
              <span className="text-slate-800">qui Révolutionne</span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                votre Business
              </span>
            </h2>
            
            {/* Enhanced Description */}
            <div className="space-y-6 mb-10">
              <p className="text-xl text-slate-600 leading-relaxed">
                <strong className="text-slate-800">PixelRise transforme</strong> la façon dont les entrepreneurs 
                développent leur business en ligne. Notre <em className="text-blue-600">intelligence artificielle avancée</em> 
                automatise <strong className="text-slate-800">100% de votre marketing digital</strong>.
              </p>
              
              <p className="text-lg text-slate-600 leading-relaxed">
                Fini les nuits blanches à créer du contenu, gérer vos réseaux sociaux ou analyser vos performances. 
                <strong className="text-green-600"> En quelques clics</strong>, déployez une stratégie marketing 
                complète qui <em className="text-purple-600">fonctionne pendant que vous dormez</em>.
              </p>
            </div>

            {/* Enhanced Benefits Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-10">
              {enhancedBenefits.map((benefit, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 group"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Check size={16} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">{benefit.title}</h4>
                    <p className="text-sm text-slate-600">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-6 mb-10">
              <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-blue-600">250k+</p>
                <p className="text-xs text-slate-600 font-medium">Entrepreneurs</p>
              </div>
              
              <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-green-600">10M+</p>
                <p className="text-xs text-slate-600 font-medium">Contenus générés</p>
              </div>
              
              <div className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-orange-600">98.7%</p>
                <p className="text-xs text-slate-600 font-medium">Satisfaction</p>
              </div>
            </div>

            {/* Enhanced CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="h-14 px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group rounded-full">
                <Zap size={20} className="mr-3 group-hover:rotate-12 transition-transform" />
                Démarrer GRATUITEMENT
                <ArrowRight size={18} className="ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                variant="outline" 
                className="h-14 px-8 border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 rounded-full bg-white/80 backdrop-blur-sm"
                onClick={() => {
                  const element = document.querySelector('#how-it-works');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                <span className="font-medium">Voir comment ça marche</span>
              </Button>
            </div>

            {/* Trust Footer */}
            <div className="mt-8 flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-green-500" />
                <span>✓ Aucune carte de crédit</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                <span>✓ Setup en 60 secondes</span>
              </div>
              <div className="flex items-center gap-2">
                <Award size={16} className="text-purple-500" />
                <span>✓ Garantie 30 jours</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.4; }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
          }
          
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `
      }} />
    </section>
  );
};

const enhancedBenefits = [
  {
    title: "Automatisation Complète",
    description: "Création, publication et analyse automatiques 24/7"
  },
  {
    title: "Multi-Plateformes",
    description: "Gérez tous vos réseaux depuis une interface unique"
  },
  {
    title: "Analytics Avancés",
    description: "Insights détaillés et recommandations IA en temps réel"
  },
  {
    title: "ROI Maximisé",
    description: "Économisez 25+ heures/semaine, boostez vos revenus"
  },
  {
    title: "Zero Expertise Requise",
    description: "Interface intuitive, IA fait tout le travail complexe"
  },
  {
    title: "Évolutivité Infinie",
    description: "Grandit avec votre business, s'adapte automatiquement"
  }
];

export default AboutSection;