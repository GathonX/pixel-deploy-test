import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  X,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Target,
  Clock,
  Zap,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AgentProactiveToastProps {
  currentPage?: string;
  pageContext?: Record<string, any>;
  onOpenChat: () => void;
  className?: string;
}

interface ProactiveSuggestion {
  id: string;
  icon: React.ReactNode;
  title: string;
  message: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
  color: string;
  delay: number; // en secondes
}

export const AgentProactiveToast: React.FC<AgentProactiveToastProps> = ({
  currentPage = 'dashboard',
  pageContext = {},
  onOpenChat,
  className = ''
}) => {
  const [currentSuggestion, setCurrentSuggestion] = useState<ProactiveSuggestion | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  // Suggestions contextuelles avec priorités
  const getContextualSuggestions = (): ProactiveSuggestion[] => {
    const baseSuggestions = {
      'dashboard': [
        {
          id: 'dashboard-analytics',
          icon: <TrendingUp className="w-5 h-5" />,
          title: "📊 Analyse de Performance",
          message: "Voulez-vous que j'analyse vos métriques actuelles ?",
          action: "Analyser maintenant",
          priority: 'high' as const,
          color: 'from-blue-500 to-cyan-500',
          delay: 5
        },
        {
          id: 'dashboard-recommendations',
          icon: <Target className="w-5 h-5" />,
          title: "💡 Recommandations IA",
          message: "J'ai des suggestions pour optimiser votre business aujourd'hui.",
          action: "Voir les conseils",
          priority: 'medium' as const,
          color: 'from-green-500 to-emerald-500',
          delay: 15
        },
        {
          id: 'dashboard-insights',
          icon: <Sparkles className="w-5 h-5" />,
          title: "✨ Insights Personnalisés",
          message: "Découvrez des opportunités cachées dans vos données.",
          action: "Explorer",
          priority: 'medium' as const,
          color: 'from-purple-500 to-violet-500',
          delay: 25
        }
      ],
      'business-plan': [
        {
          id: 'bp-swot',
          icon: <Target className="w-5 h-5" />,
          title: "🎯 Analyse SWOT IA",
          message: "Je peux générer une analyse SWOT complète de votre business.",
          action: "Commencer l'analyse",
          priority: 'high' as const,
          color: 'from-indigo-500 to-purple-500',
          delay: 3
        },
        {
          id: 'bp-market',
          icon: <TrendingUp className="w-5 h-5" />,
          title: "📈 Étude de Marché",
          message: "Besoin d'aide pour analyser votre marché cible ?",
          action: "Analyser le marché",
          priority: 'high' as const,
          color: 'from-emerald-500 to-teal-500',
          delay: 8
        },
        {
          id: 'bp-strategy',
          icon: <Zap className="w-5 h-5" />,
          title: "⚡ Stratégie Business",
          message: "Optimisons votre stratégie avec des insights IA avancés.",
          action: "Développer la stratégie",
          priority: 'medium' as const,
          color: 'from-orange-500 to-red-500',
          delay: 18
        }
      ],
      'default': [
        {
          id: 'general-help',
          icon: <MessageSquare className="w-5 h-5" />,
          title: "🤖 Assistant IA Disponible",
          message: "Besoin d'aide ? Je suis là pour optimiser votre workflow.",
          action: "Commencer à discuter",
          priority: 'low' as const,
          color: 'from-blue-500 to-indigo-500',
          delay: 10
        },
        {
          id: 'general-optimize',
          icon: <Sparkles className="w-5 h-5" />,
          title: "💡 Optimisations Disponibles",
          message: "Je peux vous aider à améliorer vos processus business.",
          action: "Découvrir comment",
          priority: 'medium' as const,
          color: 'from-violet-500 to-purple-500',
          delay: 20
        }
      ]
    };

    return baseSuggestions[currentPage as keyof typeof baseSuggestions] || baseSuggestions.default;
  };

  const suggestions = getContextualSuggestions();

  // Logique d'affichage cyclique des suggestions
  useEffect(() => {
    if (hasBeenDismissed || suggestions.length === 0) return;

    const currentSugg = suggestions[suggestionIndex % suggestions.length];

    const timer = setTimeout(() => {
      setCurrentSuggestion(currentSugg);
      setIsVisible(true);

      // Auto-hide après 8 secondes si pas d'interaction
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        // Passer à la suggestion suivante après 30 secondes
        setTimeout(() => {
          setSuggestionIndex(prev => prev + 1);
        }, 30000);
      }, 8000);

      return () => clearTimeout(hideTimer);
    }, currentSugg.delay * 1000);

    return () => clearTimeout(timer);
  }, [suggestionIndex, hasBeenDismissed, currentPage]);

  const handleDismiss = () => {
    setIsVisible(false);
    setHasBeenDismissed(true);
    // Re-permettre les suggestions après 5 minutes
    setTimeout(() => {
      setHasBeenDismissed(false);
      setSuggestionIndex(0);
    }, 5 * 60 * 1000);
  };

  const handleAction = () => {
    setIsVisible(false);
    onOpenChat();
  };

  if (!currentSuggestion) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
          className={`fixed bottom-6 right-6 z-40 max-w-sm ${className}`}
        >
          <Card className="overflow-hidden shadow-2xl border-2 border-white/20 backdrop-blur-sm">
            {/* Header avec gradient */}
            <div className={`bg-gradient-to-r ${currentSuggestion.color} p-4 text-white relative`}>
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />

              <div className="relative flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
                  >
                    <Bot className="w-5 h-5" />
                  </motion.div>
                  <div>
                    <h3 className="font-semibold text-sm">Agent IA PixelRise</h3>
                    <Badge variant="secondary" className="bg-white/20 text-white text-xs mt-1">
                      {currentSuggestion.priority === 'high' ? '🔥 Priorité' :
                       currentSuggestion.priority === 'medium' ? '⭐ Suggéré' : '💡 Aide'}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-white hover:bg-white/20 -mt-2 -mr-2"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <CardContent className="p-4 bg-white/95 backdrop-blur-sm">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${currentSuggestion.color} text-white`}>
                    {currentSuggestion.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm mb-1">
                      {currentSuggestion.title}
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {currentSuggestion.message}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <Button
                    onClick={handleAction}
                    size="sm"
                    className={`flex-1 bg-gradient-to-r ${currentSuggestion.color} hover:opacity-90 text-white`}
                  >
                    {currentSuggestion.action}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-gray-600"
                  >
                    Plus tard
                  </Button>
                </div>
              </div>
            </CardContent>

            {/* Animated indicator */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 8, ease: "linear" }}
              className={`h-1 bg-gradient-to-r ${currentSuggestion.color}`}
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};