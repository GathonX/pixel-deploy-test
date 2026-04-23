import React, { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, FileText, Image, Zap, Target, Calendar, Brain } from "lucide-react";
import api from "@/services/api";

interface ProgressiveLoadingModalProps {
  isOpen: boolean;
  featureKey: "blog" | "social_media" | "sprint";
  jobId?: string | null; // 🎯 NOUVEAU : job_id pour polling
  onComplete?: (result: any) => void;
}

interface LoadingStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  estimatedDuration: number; // en secondes
  status: "pending" | "in_progress" | "completed";
}

const ProgressiveLoadingModal: React.FC<ProgressiveLoadingModalProps> = ({
  isOpen,
  featureKey,
  jobId,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTotal, setEstimatedTotal] = useState(
    featureKey === "blog" ? 35 : featureKey === "social_media" ? 26 : 25
  );
  const [currentStepLabel, setCurrentStepLabel] = useState<string | null>(null); // 🎯 NOUVEAU : label du backend

  // 🎯 ÉTAPES DE GÉNÉRATION SELON LE TYPE
  const blogSteps: LoadingStep[] = [
    {
      id: "objectives",
      label: "Génération des objectifs hebdomadaires",
      icon: Zap,
      estimatedDuration: 3,
      status: "pending",
    },
    {
      id: "content",
      label: "Création du contenu avec IA",
      icon: FileText,
      estimatedDuration: 8,
      status: "pending",
    },
    {
      id: "images",
      label: "Recherche d'images cohérentes (Pexels)",
      icon: Image,
      estimatedDuration: 22, // La partie la plus lente
      status: "pending",
    },
    {
      id: "finalization",
      label: "Finalisation et sauvegarde",
      icon: Sparkles,
      estimatedDuration: 2,
      status: "pending",
    },
  ];

  const socialSteps: LoadingStep[] = [
    {
      id: "objectives",
      label: "Génération des objectifs social media",
      icon: Zap,
      estimatedDuration: 3,
      status: "pending",
    },
    {
      id: "content",
      label: "Création du contenu adapté à la plateforme",
      icon: FileText,
      estimatedDuration: 6,
      status: "pending",
    },
    {
      id: "images",
      label: "Recherche d'images pour le post",
      icon: Image,
      estimatedDuration: 15,
      status: "pending",
    },
    {
      id: "finalization",
      label: "Programmation et sauvegarde",
      icon: Sparkles,
      estimatedDuration: 2,
      status: "pending",
    },
  ];

  const sprintSteps: LoadingStep[] = [
    {
      id: "analysis",
      label: "Analyse des données business et projets",
      icon: Brain,
      estimatedDuration: 3,
      status: "pending",
    },
    {
      id: "generation",
      label: "Génération IA des tâches hebdomadaires",
      icon: Zap,
      estimatedDuration: 12,
      status: "pending",
    },
    {
      id: "organization",
      label: "Création et organisation des tâches",
      icon: Calendar,
      estimatedDuration: 8,
      status: "pending",
    },
    {
      id: "finalization",
      label: "Finalisation du sprint",
      icon: Target,
      estimatedDuration: 2,
      status: "pending",
    },
  ];

  const steps = featureKey === "blog" ? blogSteps : featureKey === "social_media" ? socialSteps : sprintSteps;
  const [loadingSteps, setLoadingSteps] = useState(steps);

  // 🎯 NOUVEAU : POLLING TEMPS RÉEL (si jobId fourni) OU SIMULATION (sinon)
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setProgress(0);
      setElapsedTime(0);
      setCurrentStepLabel(null);
      setLoadingSteps(steps);
      return;
    }

    let pollingInterval: NodeJS.Timeout | null = null;

    // ✅ MODE 1 : POLLING TEMPS RÉEL (si jobId existe)
    if (jobId) {
      console.log("🔄 [Modal] Démarrage polling job:", jobId);

      const pollJobStatus = async () => {
        try {
          const response = await api.get(`/features/immediate-job-status?job_id=${jobId}`);
          const data = response.data;

          console.log("📊 [Modal] Statut reçu:", data);

          // Mettre à jour la progression
          setProgress(data.progress || 0);
          if (data.current_step) {
            setCurrentStepLabel(data.current_step);
          }

          // Si terminé ou échoué
          if (data.status === 'completed') {
            setProgress(100);
            if (pollingInterval) clearInterval(pollingInterval);

            setTimeout(() => {
              onComplete?.(data.result || { success: true });
            }, 500);
          } else if (data.status === 'failed') {
            if (pollingInterval) clearInterval(pollingInterval);
            onComplete?.({ success: false, error: data.result?.error });
          }

        } catch (error) {
          console.error("❌ [Modal] Erreur polling:", error);
        }
      };

      // Premier appel immédiat
      pollJobStatus();

      // Puis toutes les 2 secondes
      pollingInterval = setInterval(pollJobStatus, 2000);

    }
    // ✅ MODE 2 : SIMULATION (pour Sprint ou fallback)
    else {
      console.log("⏱️ [Modal] Mode simulation (pas de jobId)");

      let interval: NodeJS.Timeout;
      let stepStartTime = 0;

      const startNextStep = (stepIndex: number) => {
        if (stepIndex >= steps.length) {
          setProgress(100);
          setTimeout(() => {
            onComplete?.({ success: true, totalTime: elapsedTime });
          }, 500);
          return;
        }

        setLoadingSteps((prev) =>
          prev.map((step, index) => ({
            ...step,
            status:
              index === stepIndex
                ? "in_progress"
                : index < stepIndex
                ? "completed"
                : "pending",
          }))
        );

        setCurrentStep(stepIndex);
        stepStartTime = elapsedTime;

        const currentStepDuration = steps[stepIndex].estimatedDuration;

        interval = setInterval(() => {
          setElapsedTime((prev) => {
            const newTime = prev + 0.5;
            const stepElapsed = newTime - stepStartTime;

            const completedStepsTime = steps
              .slice(0, stepIndex)
              .reduce((acc, step) => acc + step.estimatedDuration, 0);

            const totalProgress =
              ((completedStepsTime + (stepElapsed / currentStepDuration) * currentStepDuration) / estimatedTotal) * 100;

            setProgress(Math.min(totalProgress, 95));

            if (stepElapsed >= currentStepDuration) {
              clearInterval(interval);
              startNextStep(stepIndex + 1);
            }

            return newTime;
          });
        }, 500);
      };

      setTimeout(() => startNextStep(0), 200);

      return () => {
        if (interval) clearInterval(interval);
      };
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [isOpen, jobId, featureKey]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-business rounded-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            {featureKey === "blog" 
              ? "✨ Génération de votre premier article"
              : featureKey === "social_media"
              ? "🚀 Génération de votre premier post"
              : "📋 Génération de votre sprint hebdomadaire"}
          </h2>
          <p className="text-slate-600 text-sm">
            {featureKey === "sprint" 
              ? "Veuillez patienter pendant que nous créons vos tâches personnalisées..."
              : "Veuillez patienter pendant que nous créons votre contenu..."}
          </p>
        </div>

        {/* Barre de progression principale */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Progression globale</span>
            <span className="font-medium text-brand-blue">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress 
            value={progress} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>Temps écoulé: {formatTime(elapsedTime)}</span>
            <span>Estimation: ~{estimatedTotal}s</span>
          </div>
        </div>

        {/* Étapes détaillées */}
        <div className="space-y-3">
          {loadingSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = step.status === "completed";
            const isPending = step.status === "pending";

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                  isActive
                    ? "bg-blue-50 border border-blue-200"
                    : isCompleted
                    ? "bg-green-50 border border-green-200"
                    : "bg-slate-50 border border-slate-200"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive
                      ? "bg-blue-500 text-white"
                      : isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-slate-300 text-slate-500"
                  }`}
                >
                  {isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      isActive
                        ? "text-blue-700"
                        : isCompleted
                        ? "text-green-700"
                        : "text-slate-600"
                    }`}
                  >
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-xs text-blue-600 mt-1">
                      {currentStepLabel || `En cours... (~${step.estimatedDuration}s)`}
                    </p>
                  )}
                </div>
                {isCompleted && (
                  <div className="text-green-500">
                    <svg
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Message d'encouragement */}
        <div className="bg-gradient-landing rounded-lg p-4 text-center">
          <p className="text-sm text-slate-600">
            {featureKey === "sprint" ? (
              currentStep === 0 ? (
                <>🧠 Analyse de vos données business et projets...</>
              ) : currentStep === 1 ? (
                <>⚡ L'IA génère 7 jours de tâches personnalisées...</>
              ) : currentStep === 2 ? (
                <>📅 Organisation des tâches par jour et priorité...</>
              ) : (
                <>✨ Finalisation de votre sprint... Presque terminé !</>
              )
            ) : currentStep < 2 ? (
              <>🧠 L'IA génère du contenu personnalisé basé sur vos projets...</>
            ) : currentStep === 2 ? (
              <>📸 Recherche d'images parfaitement adaptées à votre contenu...</>
            ) : (
              <>✨ Finalisation de votre contenu... Presque terminé !</>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {featureKey === "sprint" 
              ? "💡 Votre sprint sera adapté à vos objectifs business et votre secteur d'activité !"
              : "💡 Cette étape ne prend du temps qu'une seule fois. Les prochaines générations seront plus rapides !"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProgressiveLoadingModal;