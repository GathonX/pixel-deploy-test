
import { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Quote, 
  Award, 
  TrendingUp, 
  Users, 
  Heart, 
  CheckCircle2,
  Sparkles,
  Play,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const goToTestimonial = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  return (
    <section id="testimonials" className="py-24 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 relative overflow-hidden">
      {/* SEO Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "PixelRise Customer Testimonials",
          "description": "Témoignages clients PixelRise - Automatisation marketing IA",
          "itemListElement": testimonials.map((testimonial, index) => ({
            "@type": "Review",
            "position": index + 1,
            "author": {
              "@type": "Person",
              "name": testimonial.name
            },
            "reviewBody": testimonial.quote,
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": 5,
              "bestRating": 5
            },
            "itemReviewed": {
              "@type": "SoftwareApplication",
              "name": "PixelRise"
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
            <Heart size={16} className="text-red-500" />
            <span>Clients Satisfaits à 98.7%</span>
            <Sparkles size={14} className="text-emerald-500" />
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            <span className="bg-gradient-to-r from-slate-800 via-blue-700 to-purple-700 bg-clip-text text-transparent">
              Ils ont Transformé
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              leur Business
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed">
            <strong className="text-slate-800">250,000+ entrepreneurs</strong> font confiance à PixelRise pour 
            <em className="text-blue-600"> automatiser leur succès</em>. Découvrez leurs 
            <strong className="text-green-600"> résultats extraordinaires</strong> !
          </p>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-800">250k+</p>
              <p className="text-sm text-slate-600">Entrepreneurs</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-800">4.9/5</p>
              <p className="text-sm text-slate-600">Note moyenne</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-800">+347%</p>
              <p className="text-sm text-slate-600">ROI moyen</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Award className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-800">98.7%</p>
              <p className="text-sm text-slate-600">Satisfaction</p>
            </div>
          </div>
        </div>

        {/* Enhanced Testimonial Slider */}
        <div className="max-w-6xl mx-auto relative">
          
          {/* Main Testimonial Display */}
          <div className="overflow-hidden rounded-3xl">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div key={index} className="w-full flex-shrink-0 px-4">
                  <TestimonialCard testimonial={testimonial} isActive={index === currentIndex} />
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Navigation */}
          <button 
            onClick={prevTestimonial} 
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full shadow-xl flex items-center justify-center text-slate-700 hover:bg-white hover:scale-110 focus:outline-none transition-all duration-300 z-20 border border-white/50"
            aria-label="Témoignage précédent"
          >
            <ChevronLeft size={24} />
          </button>
          
          <button 
            onClick={nextTestimonial} 
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full shadow-xl flex items-center justify-center text-slate-700 hover:bg-white hover:scale-110 focus:outline-none transition-all duration-300 z-20 border border-white/50"
            aria-label="Témoignage suivant"
          >
            <ChevronRight size={24} />
          </button>

          {/* Enhanced Pagination */}
          <div className="flex justify-center items-center mt-10 gap-3">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToTestimonial(index)}
                className={cn(
                  "relative transition-all duration-300",
                  index === currentIndex 
                    ? "w-12 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" 
                    : "w-3 h-3 bg-slate-300 hover:bg-slate-400 rounded-full"
                )}
                aria-label={`Aller au témoignage ${index + 1}`}
              />
            ))}
          </div>

          {/* Auto-play Control */}
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              <Play size={16} className={cn(isAutoPlaying ? "opacity-100" : "opacity-50")} />
              <span>{isAutoPlaying ? "Lecture automatique activée" : "Lecture automatique désactivée"}</span>
            </button>
          </div>
        </div>

        {/* Video Testimonials Teaser */}
        <div className="mt-20 text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/50 shadow-xl">
            <h3 className="text-2xl font-bold text-slate-800 mb-4">
              Découvrez Plus de <span className="text-blue-600">Témoignages Vidéo</span>
            </h3>
            <p className="text-slate-600 mb-6">
              Regardez nos clients raconter leur transformation business en détail
            </p>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              <Play size={18} className="mr-2" />
              Voir les Témoignages Vidéo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

interface Testimonial {
  name: string;
  title: string;
  company: string;
  location: string;
  quote: string;
  results: {
    metric: string;
    value: string;
    description: string;
  }[];
  image: string;
  verified: boolean;
  industry: string;
  timeframe: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Wyne Martin",
    title: "Fondatrice & CEO",
    company: "Digital Wave",
    location: "Paris, France",
    quote: "PixelRise a complètement révolutionné notre approche marketing. En 3 mois, nous avons automatisé 100% de notre création de contenu et multiplié notre trafic par 3. L'IA génère du contenu si naturel que nos clients pensent qu'il est écrit par notre équipe !",
    results: [
      { metric: "Trafic", value: "+230%", description: "Augmentation organique" },
      { metric: "Temps gagné", value: "25h/sem", description: "Automatisation complète" },
      { metric: "ROI", value: "+340%", description: "Retour sur investissement" }
    ],
     image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&auto=format&q=80",
    verified: true,
    industry: "Marketing Digital",
    timeframe: "Utilisateur depuis 8 mois"
  },
  {
    name: "Thomas Dubois",
    title: "CEO & Fondateur",
    company: "TechStart",
    location: "Lyon, France",
    quote: "Avant PixelRise, je passais 30h/semaine sur le marketing. Maintenant, l'IA gère tout automatiquement pendant que je me concentre sur le développement produit. Le business plan généré était si détaillé que j'ai levé 500k€ grâce à lui !",
    results: [
      { metric: "Levée de fonds", value: "500k€", description: "Grâce au business plan IA" },
      { metric: "Automatisation", value: "95%", description: "Tasks marketing automatisées" },
      { metric: "Croissance", value: "+280%", description: "Revenus mensuels" }
    ],
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face&auto=format&q=80",
    verified: true,
    industry: "SaaS Technology",
    timeframe: "Utilisateur depuis 1 an"
  },
  {
    name: "Claire Leroy",
    title: "Entrepreneur",
    company: "Green Leaf",
    location: "Bordeaux, France",
    quote: "L'interface PixelRise est d'une simplicité déconcertante. En quelques clics, j'ai configuré une stratégie marketing complète pour mon e-commerce. Les ventes ont explosé dès le premier mois ! L'IA comprend parfaitement ma niche produits bio.",
    results: [
      { metric: "Ventes", value: "+450%", description: "Premier mois d'utilisation" },
      { metric: "Conversion", value: "+67%", description: "Taux de conversion site" },
      { metric: "Engagement", value: "+320%", description: "Réseaux sociaux" }
    ],
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face&auto=format&q=80",
    verified: true,
    industry: "E-commerce Bio",
    timeframe: "Utilisateur depuis 6 mois"
  },
  {
    name: "Marc Rousseau",
    title: "Directeur Marketing",
    company: "InnovateLab",
    location: "Toulouse, France",
    quote: "Nous étions sceptiques au début, mais PixelRise a dépassé toutes nos attentes. L'IA produit du contenu de qualité professionnelle 24/7. Notre équipe peut enfin se concentrer sur la stratégie pendant que l'automatisation gère l'exécution.",
    results: [
      { metric: "Productivité", value: "+400%", description: "Équipe marketing" },
      { metric: "Qualité", value: "95%", description: "Contenu approuvé directement" },
      { metric: "Coûts", value: "-60%", description: "Réduction budget création" }
    ],
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face&auto=format&q=80",
    verified: true,
    industry: "Innovation Tech",
    timeframe: "Utilisateur depuis 10 mois"
  }
];

interface TestimonialCardProps {
  testimonial: Testimonial;
  isActive: boolean;
}

const TestimonialCard = ({ testimonial, isActive }: TestimonialCardProps) => {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 border border-white/50 transition-all duration-500 hidden">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Profile Section */}
        <div className="lg:w-1/3 text-center lg:text-left">
          <div className="relative inline-block mb-6">
            <img 
              src={testimonial.image} 
              alt={`${testimonial.name} - ${testimonial.title} chez ${testimonial.company}`}
              className="w-32 h-32 lg:w-40 lg:h-40 rounded-2xl object-cover shadow-lg mx-auto lg:mx-0"
              loading="lazy"
            />
            
            {/* Verified Badge */}
            {testimonial.verified && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle2 size={16} className="text-white" />
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h4 className="font-bold text-xl text-slate-800">{testimonial.name}</h4>
            <p className="text-slate-600 font-medium">{testimonial.title}</p>
            <p className="text-blue-600 font-semibold">{testimonial.company}</p>
            
            <div className="flex items-center justify-center lg:justify-start gap-1 text-sm text-slate-500">
              <MapPin size={14} />
              <span>{testimonial.location}</span>
            </div>
            
            <div className="text-xs text-slate-500 space-y-1">
              <p>{testimonial.industry}</p>
              <p>{testimonial.timeframe}</p>
            </div>
          </div>
        </div>
        
        {/* Content Section */}
        <div className="lg:w-2/3">
          
          {/* Stars */}
          <div className="flex justify-center lg:justify-start mb-6">
            {Array(5).fill(0).map((_, i) => (
              <Star 
                key={i} 
                size={24} 
                fill="#F59E0B" 
                stroke="#F59E0B" 
                className="mr-1"
              />
            ))}
          </div>
          
          {/* Quote */}
          <div className="relative mb-8">
            <Quote className="absolute -top-4 -left-2 w-8 h-8 text-blue-200" />
            <blockquote className="text-lg md:text-xl text-slate-700 leading-relaxed italic pl-6">
              {testimonial.quote}
            </blockquote>
          </div>
          
          {/* Results Grid */}
          <div className="grid grid-cols-3 gap-4">
            {testimonial.results.map((result, index) => (
              <div key={index} className="text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <p className="text-2xl font-bold text-blue-600 mb-1">{result.value}</p>
                <p className="text-sm font-semibold text-slate-700 mb-1">{result.metric}</p>
                <p className="text-xs text-slate-500">{result.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;