
import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Helmet } from "react-helmet";
import { motion } from 'framer-motion';
import {
  Bot,
  Settings,
  User,
  MessageSquare,
  Zap,
  Brain,
  Shield,
  Palette,
  Volume2,
  Bell,
  Clock,
  Target,
  Sparkles,
  Save,
  RotateCcw,
  ChevronRight,
  Star,
  TrendingUp
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface AgentSettings {
  // Personnalité
  name: string;
  communicationTone: 'formal' | 'casual' | 'professional' | 'friendly';
  avatarStyle: string;

  // Comportement
  proactiveSuggestions: boolean;
  autoLearning: boolean;
  confidenceThreshold: number;
  responseDelay: number;

  // Notifications
  notificationsEnabled: boolean;
  suggestionFrequency: 'low' | 'medium' | 'high';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };

  // Domaines d'expertise
  preferredDomains: string[];
  customInstructions: string;
}

const AssistantsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<AgentSettings>({
    name: user?.name ? `Assistant de ${user.name}` : 'Assistant IA',
    communicationTone: 'friendly',
    avatarStyle: 'professional',
    proactiveSuggestions: true,
    autoLearning: true,
    confidenceThreshold: 75,
    responseDelay: 1,
    notificationsEnabled: true,
    suggestionFrequency: 'medium',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    preferredDomains: ['business', 'analytics'],
    customInstructions: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Surveiller les changements
  useEffect(() => {
    setHasChanges(true);
  }, [settings]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation

      toast({
        title: "✅ Paramètres sauvegardés",
        description: "Votre agent intelligent a été configuré avec succès !",
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSettings({
      name: user?.name ? `Assistant de ${user.name}` : 'Assistant IA',
      communicationTone: 'friendly',
      avatarStyle: 'professional',
      proactiveSuggestions: true,
      autoLearning: true,
      confidenceThreshold: 75,
      responseDelay: 1,
      notificationsEnabled: true,
      suggestionFrequency: 'medium',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      preferredDomains: ['business', 'analytics'],
      customInstructions: ''
    });
    setHasChanges(false);
  };

  const domainOptions = [
    { id: 'business', label: 'Business & Stratégie', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-blue-500' },
    { id: 'analytics', label: 'Analytics & Data', icon: <Brain className="w-4 h-4" />, color: 'bg-purple-500' },
    { id: 'technical', label: 'Support Technique', icon: <Settings className="w-4 h-4" />, color: 'bg-green-500' },
    { id: 'marketing', label: 'Marketing Digital', icon: <Target className="w-4 h-4" />, color: 'bg-orange-500' },
    { id: 'personalization', label: 'Personnalisation', icon: <Star className="w-4 h-4" />, color: 'bg-yellow-500' },
    { id: 'support', label: 'Support Client', icon: <MessageSquare className="w-4 h-4" />, color: 'bg-red-500' }
  ];

  const communicationTones = [
    { value: 'formal', label: 'Formel', description: 'Style professionnel et respectueux' },
    { value: 'casual', label: 'Décontracté', description: 'Ton relaxé et amical' },
    { value: 'professional', label: 'Professionnel', description: 'Équilibre entre formel et accessible' },
    { value: 'friendly', label: 'Amical', description: 'Chaleureux et personnalisé' }
  ];

  return (
    <>
      <Helmet>
        <title>Paramètres Agent IA - PixelRise</title>
      </Helmet>
      <DashboardLayout>
        <div className="container max-w-6xl mx-auto py-6 px-4 md:px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Paramètres Agent IA
                  </h1>
                  <p className="text-gray-600">
                    Personnalisez votre assistant intelligent PixelRise
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasChanges}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Réinitialiser
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Zap className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Agent Actif</h3>
                      <p className="text-sm text-gray-600">
                        Votre assistant IA fonctionne parfaitement
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    ✨ Premium
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Settings Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="personality" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personality" className="flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Personnalité</span>
                </TabsTrigger>
                <TabsTrigger value="behavior" className="flex items-center space-x-2">
                  <Brain className="w-4 h-4" />
                  <span>Comportement</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center space-x-2">
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Avancé</span>
                </TabsTrigger>
              </TabsList>

              {/* Personnalité Tab */}
              <TabsContent value="personality" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nom de l'agent */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Bot className="w-5 h-5" />
                        <span>Nom de l'agent</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="agent-name">Nom personnalisé</Label>
                        <Input
                          id="agent-name"
                          value={settings.name}
                          onChange={(e) => setSettings({...settings, name: e.target.value})}
                          placeholder="Mon Assistant IA"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Ton de communication */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <MessageSquare className="w-5 h-5" />
                        <span>Ton de communication</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        {communicationTones.map((tone) => (
                          <div
                            key={tone.value}
                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                              settings.communicationTone === tone.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSettings({...settings, communicationTone: tone.value as any})}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{tone.label}</p>
                                <p className="text-sm text-gray-600">{tone.description}</p>
                              </div>
                              {settings.communicationTone === tone.value && (
                                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Domaines d'expertise */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="w-5 h-5" />
                      <span>Domaines d'expertise préférés</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {domainOptions.map((domain) => (
                        <div
                          key={domain.id}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            settings.preferredDomains.includes(domain.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            const newDomains = settings.preferredDomains.includes(domain.id)
                              ? settings.preferredDomains.filter(d => d !== domain.id)
                              : [...settings.preferredDomains, domain.id];
                            setSettings({...settings, preferredDomains: newDomains});
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 ${domain.color} rounded-lg flex items-center justify-center text-white`}>
                              {domain.icon}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{domain.label}</p>
                            </div>
                            {settings.preferredDomains.includes(domain.id) && (
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Comportement Tab */}
              <TabsContent value="behavior" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Suggestions proactives */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Sparkles className="w-5 h-5" />
                        <span>Suggestions proactives</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Activer les suggestions automatiques</Label>
                          <p className="text-sm text-gray-600">L'agent propose des actions sans être sollicité</p>
                        </div>
                        <Switch
                          checked={settings.proactiveSuggestions}
                          onCheckedChange={(checked) => setSettings({...settings, proactiveSuggestions: checked})}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Apprentissage automatique */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Brain className="w-5 h-5" />
                        <span>Apprentissage automatique</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Apprentissage continu</Label>
                          <p className="text-sm text-gray-600">L'agent s'améliore avec vos interactions</p>
                        </div>
                        <Switch
                          checked={settings.autoLearning}
                          onCheckedChange={(checked) => setSettings({...settings, autoLearning: checked})}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Seuil de confiance */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Shield className="w-5 h-5" />
                        <span>Seuil de confiance</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Niveau de confiance minimum: {settings.confidenceThreshold}%</Label>
                          <Badge variant="outline">
                            {settings.confidenceThreshold < 50 ? 'Risqué' :
                             settings.confidenceThreshold < 75 ? 'Équilibré' : 'Conservateur'}
                          </Badge>
                        </div>
                        <Slider
                          value={[settings.confidenceThreshold]}
                          onValueChange={(value) => setSettings({...settings, confidenceThreshold: value[0]})}
                          max={100}
                          min={10}
                          step={5}
                          className="w-full"
                        />
                        <p className="text-sm text-gray-600 mt-2">
                          Plus le seuil est élevé, plus l'agent sera prudent dans ses réponses
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Notifications générales */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Bell className="w-5 h-5" />
                        <span>Notifications</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Activer les notifications</Label>
                          <p className="text-sm text-gray-600">Recevoir des alertes de l'agent</p>
                        </div>
                        <Switch
                          checked={settings.notificationsEnabled}
                          onCheckedChange={(checked) => setSettings({...settings, notificationsEnabled: checked})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Fréquence des suggestions</Label>
                        <Select
                          value={settings.suggestionFrequency}
                          onValueChange={(value) => setSettings({...settings, suggestionFrequency: value as any})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Faible (1-2 par jour)</SelectItem>
                            <SelectItem value="medium">Modérée (3-5 par jour)</SelectItem>
                            <SelectItem value="high">Élevée (5+ par jour)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Heures silencieuses */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Clock className="w-5 h-5" />
                        <span>Heures silencieuses</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Mode silencieux</Label>
                          <p className="text-sm text-gray-600">Pas de notifications pendant ces heures</p>
                        </div>
                        <Switch
                          checked={settings.quietHours.enabled}
                          onCheckedChange={(checked) => setSettings({
                            ...settings,
                            quietHours: {...settings.quietHours, enabled: checked}
                          })}
                        />
                      </div>

                      {settings.quietHours.enabled && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Début</Label>
                            <Input
                              type="time"
                              value={settings.quietHours.start}
                              onChange={(e) => setSettings({
                                ...settings,
                                quietHours: {...settings.quietHours, start: e.target.value}
                              })}
                            />
                          </div>
                          <div>
                            <Label>Fin</Label>
                            <Input
                              type="time"
                              value={settings.quietHours.end}
                              onChange={(e) => setSettings({
                                ...settings,
                                quietHours: {...settings.quietHours, end: e.target.value}
                              })}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Avancé Tab */}
              <TabsContent value="advanced" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="w-5 h-5" />
                      <span>Instructions personnalisées</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Instructions spéciales pour votre agent</Label>
                      <Textarea
                        value={settings.customInstructions}
                        onChange={(e) => setSettings({...settings, customInstructions: e.target.value})}
                        placeholder="Ex: Toujours mentionner les risques potentiels, utiliser un vocabulaire simple, se concentrer sur la rentabilité..."
                        className="min-h-[120px] mt-2"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        Ces instructions guideront le comportement spécifique de votre agent
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Délai de réponse */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Délai de réponse</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Délai avant réponse: {settings.responseDelay}s</Label>
                        <Badge variant="outline">
                          {settings.responseDelay < 2 ? 'Instantané' :
                           settings.responseDelay < 5 ? 'Rapide' : 'Réfléchi'}
                        </Badge>
                      </div>
                      <Slider
                        value={[settings.responseDelay]}
                        onValueChange={(value) => setSettings({...settings, responseDelay: value[0]})}
                        max={10}
                        min={0}
                        step={0.5}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        Temps que l'agent prend pour "réfléchir" avant de répondre
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default AssistantsPage;
