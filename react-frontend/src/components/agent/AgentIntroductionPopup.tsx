import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  X,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Zap,
  Clock,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AgentIntroductionPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onStartChat: () => void;
  currentPage?: string;
  userName?: string;
}

export const AgentIntroductionPopup: React.FC<AgentIntroductionPopupProps> = ({
  isVisible,
  onClose,
  onStartChat,
  currentPage = 'dashboard',
  userName = 'Utilisateur'
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Suggestions contextuelles selon la page
  const getContextualSuggestions = () => {
    const suggestions = {
      'dashboard': [
        { icon: <TrendingUp className="w-4 h-4" />, text: "Analysez vos performances", color: "bg-blue-500" },
        { icon: <Target className="w-4 h-4" />, text: "Recommandations du jour", color: "bg-green-500" },
        { icon: <Sparkles className="w-4 h-4" />, text: "Optimisations IA", color: "bg-purple-500" }
      ],
      'business-plan': [
        { icon: <TrendingUp className="w-4 h-4" />, text: "Analyse de marché", color: "bg-indigo-500" },
        { icon: <Target className="w-4 h-4" />, text: "Projections financières", color: "bg-emerald-500" },
        { icon: <Sparkles className="w-4 h-4" />, text: "Stratégies IA", color: "bg-violet-500" }
      ],
      'default': [
        { icon: <MessageSquare className="w-4 h-4" />, text: "Assistance personnalisée", color: "bg-blue-500" },
        { icon: <Zap className="w-4 h-4" />, text: "Conseils intelligents", color: "bg-orange-500" },
        { icon: <Clock className="w-4 h-4" />, text: "Optimisation temps", color: "bg-cyan-500" }
      ]
    };

    return suggestions[currentPage as keyof typeof suggestions] || suggestions.default;
  };

  const introSteps = [
    {
      title: "👋 Bonjour " + userName + " !",
      subtitle: "Découvrez votre Assistant IA Personnel",
      content: "Je suis votre agent intelligent PixelRise. Je vous aide à optimiser votre business avec des analyses avancées et des recommandations personnalisées.",
      highlight: "🧠 Intelligence Adaptive"
    },
    {
      title: "🚀 Capacités Avancées",
      subtitle: "Ce que je peux faire pour vous",
      content: "Analyse SWOT, recommandations marketing, optimisation de contenu, insights business et bien plus. Je m'adapte à vos besoins et apprends de vos préférences.",
      highlight: "⚡ Réponses Instantanées"
    },
    {
      title: "💡 Suggestions Contextuelles",
      subtitle: "Adapté à votre page actuelle",
      content: "Mes suggestions changent selon où vous êtes dans l'application. Voici ce que je peux faire sur cette page :",
      highlight: "📍 " + currentPage.replace('-', ' ').toUpperCase()
    }
  ];

  const currentStepData = introSteps[currentStep];
  const suggestions = getContextualSuggestions();

  const handleNext = () => {
    if (currentStep < introSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onStartChat();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] md:h-auto z-50"
          >
            <Card className="h-full md:h-auto overflow-hidden shadow-2xl border-2 border-blue-200">
              {/* Header avec animation */}
              <CardHeader className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse" />

                <div className="relative z-10 flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                      className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
                    >
                      <Bot className="w-6 h-6 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-xl font-bold">{currentStepData.title}</h2>
                      <p className="text-blue-100 text-sm">{currentStepData.subtitle}</p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-white hover:bg-white/20 -mt-2 -mr-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Progress bar */}
                <div className="relative mt-4">
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: `${((currentStep + 1) / introSteps.length) * 100}%` }}
                      transition={{ duration: 0.3 }}
                      className="bg-white rounded-full h-2"
                    />
                  </div>
                  <p className="text-xs text-blue-100 mt-1">
                    Étape {currentStep + 1} sur {introSteps.length}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Highlight badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-sm px-3 py-1">
                    {currentStepData.highlight}
                  </Badge>
                </motion.div>

                {/* Content */}
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  <p className="text-gray-700 leading-relaxed">
                    {currentStepData.content}
                  </p>

                  {/* Suggestions sur la dernière étape */}
                  {currentStep === 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-3"
                    >
                      <p className="text-sm font-medium text-gray-600">Exemples d'assistance :</p>
                      <div className="grid gap-2">
                        {suggestions.map((suggestion, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                            className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className={`p-2 rounded-lg text-white ${suggestion.color}`}>
                              {suggestion.icon}
                            </div>
                            <span className="text-sm text-gray-700">{suggestion.text}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Actions */}
                <div className="flex justify-between space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="flex-1"
                  >
                    {currentStep === introSteps.length - 1 ? 'Peut-être plus tard' : 'Passer'}
                  </Button>

                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    {currentStep === introSteps.length - 1 ? (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Commencer à chatter
                      </>
                    ) : (
                      'Suivant'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};