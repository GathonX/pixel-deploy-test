import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, Calendar, Target, TrendingUp, RefreshCw } from 'lucide-react';
import { adminBlogService, AdminWeeklyObjective } from '@/services/adminBlogService';
import { toast } from 'react-toastify';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminWeeklyObjectiveCardProps {
  onObjectiveGenerated?: (objective: AdminWeeklyObjective) => void;
  onGeneratePosts?: () => void;
}

export const AdminWeeklyObjectiveCard: React.FC<AdminWeeklyObjectiveCardProps> = ({
  onObjectiveGenerated,
  onGeneratePosts
}) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [objective, setObjective] = useState<AdminWeeklyObjective | null>(null);

  useEffect(() => {
    loadCurrentObjective();
  }, []);

  const loadCurrentObjective = async () => {
    try {
      setLoading(true);
      const obj = await adminBlogService.getCurrentWeekObjective();
      setObjective(obj);
    } catch (error: any) {
      console.error('Erreur chargement objectif:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateObjective = async () => {
    try {
      setGenerating(true);
      const newObjective = await adminBlogService.generateWeeklyObjective();
      setObjective(newObjective);
      toast.success('Objectif hebdomadaire généré avec succès !');
      onObjectiveGenerated?.(newObjective);
    } catch (error: any) {
      console.error('Erreur génération objectif:', error);
      toast.error(error.message || 'Erreur lors de la génération de l\'objectif');
    } finally {
      setGenerating(false);
    }
  };

  const getProgressPercentage = () => {
    if (!objective) return 0;
    return Math.min(100, (objective.posts_generated_count / objective.posts_target_count) * 100);
  };

  const getDayName = (index: number): string => {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    return days[index] || '';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!objective) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Objectif Hebdomadaire
          </CardTitle>
          <CardDescription>
            Générez votre objectif de contenu pour cette semaine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Aucun objectif généré pour cette semaine
            </p>
            <Button onClick={handleGenerateObjective} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Générer l'Objectif de la Semaine
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = getProgressPercentage();
  const isComplete = objective.posts_generated_count >= objective.posts_target_count;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Objectif Hebdomadaire
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" />
              {format(parseISO(objective.week_start_date), 'dd MMM', { locale: fr })} - {format(parseISO(objective.week_end_date), 'dd MMM yyyy', { locale: fr })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isComplete ? "default" : "secondary"}>
              Semaine {objective.week_identifier.split('-')[1]}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateObjective}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Objectif Principal */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Objectif Principal
          </h4>
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            {objective.objective_text}
          </p>
        </div>

        {/* Progression */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progression</span>
            <span className="text-sm text-muted-foreground">
              {objective.posts_generated_count} / {objective.posts_target_count} posts
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          {isComplete && (
            <Badge variant="default" className="mt-2">
              ✅ Objectif complété !
            </Badge>
          )}
        </div>

        {/* Mots-clés Focus */}
        {objective.keywords_focus && objective.keywords_focus.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2 text-sm">Mots-clés Focus</h4>
            <div className="flex flex-wrap gap-2">
              {objective.keywords_focus.map((keyword, index) => (
                <Badge key={index} variant="outline">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Sujets Quotidiens */}
        {objective.daily_topics && objective.daily_topics.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 text-sm">Sujets Quotidiens</h4>
            <div className="space-y-2">
              {objective.daily_topics.map((topic, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Badge variant="secondary" className="mt-0.5">
                    {getDayName(index)}
                  </Badge>
                  <span className="text-sm flex-1">{topic}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isComplete && (
          <div className="pt-4 border-t">
            <Button
              className="w-full"
              onClick={onGeneratePosts}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Générer les Posts de la Semaine
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
