// src/components/payments/src/components/SubscriptionSystem.tsx
// ✅ CORRECTION : Ajout des clés React manquantes
// ✅ PRÉSERVATION : Toute la logique existante maintenue

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import PaymentManager from './PaymentManager';
import { useSubscription } from '../hooks/useSubscription';
import { useToast } from '../hooks/use-toast';
import { 
  CheckCircle, 
  CreditCard, 
  Loader2,
  Star,
  TrendingUp,
  Crown,
  Zap,
  Users,
  Shield,
  Phone,
  // eslint-disable-next-line no-shadow-restricted-names
  Infinity,
  RefreshCw
} from 'lucide-react';

// ✅ IMPORT CORRIGÉ : Depuis paymentService au lieu de types locaux
import paymentService, { 
  type FrontendSubscriptionPlan,
  type UserSubscription 
} from '../../../../services/paymentService';

interface SubscriptionSystemProps {
  currentPlan?: string;
}

const SubscriptionSystem: React.FC<SubscriptionSystemProps> = ({ currentPlan: initialPlan }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<FrontendSubscriptionPlan | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showPayment, setShowPayment] = useState(false);
  
  // ✅ ÉTATS API RÉELS : Remplacement des données statiques
  const [subscriptionPlans, setSubscriptionPlans] = useState<FrontendSubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { toast } = useToast();
  
  // ✅ PRÉSERVATION : Hook existant gardé
  const { 
    currentPlan, 
    isLoading: planLoading, 
    updateCurrentPlan, 
    refreshPlanStatus 
  } = useSubscription(initialPlan);

  // ✅ FONCTION API : Charger les plans et abonnement actuel
  const loadSubscriptionData = async () => {
    try {
      setIsLoading(true);
      
      // Charger plans et abonnement en parallèle
      const [plansData, subscriptionData] = await Promise.all([
        paymentService.getSubscriptionPlans(),
        paymentService.getCurrentSubscription()
      ]);
      
      setSubscriptionPlans(plansData);
      setCurrentSubscription(subscriptionData);
      
    } catch (error) {
      console.error('Erreur chargement données abonnement:', error);
      
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les plans. Données par défaut affichées.",
        variant: "destructive",
      });
      
      // ✅ FALLBACK : Plans par défaut si l'API échoue
      setSubscriptionPlans([
        {
          id: 'starter',
          plan_key: 'starter',
          name: 'Starter',
          description: 'Parfait pour les entrepreneurs solo',
          price: {
            monthly: 29,
            yearly: 290
          },
          limitations: {
            projects: 3,
            storage: '10 GB'
          },
          features: [
            'Générations IA illimitées',
            '3 projets simultanés',
            'Templates premium',
            'Support email prioritaire',
            'Communauté VIP',
            'Analytics de base'
          ],
          paypalPlanId: {
            monthly: 'PIXEL_STARTER_MONTHLY',
            yearly: 'PIXEL_STARTER_YEARLY'
          }
        },
        {
          id: 'pro',
          plan_key: 'pro',
          name: 'Pro',
          description: 'Pour les entrepreneurs en croissance',
          price: {
            monthly: 59,
            yearly: 590
          },
          popular: true,
          limitations: {
            projects: 10,
            storage: '100 GB'
          },
          features: [
            'Tout du plan Starter',
            '10 projets simultanés',
            'Intégrations réseaux sociaux',
            'Analytics avancés',
            'Support chat prioritaire',
            'API access basique',
            'White-label basique'
          ],
          paypalPlanId: {
            monthly: 'PIXEL_PRO_MONTHLY',
            yearly: 'PIXEL_PRO_YEARLY'
          }
        },
        {
          id: 'business',
          plan_key: 'business',
          name: 'Business',
          description: 'Solution complète pour équipes',
          price: {
            monthly: 99,
            yearly: 990
          },
          recommended: true,
          limitations: {
            storage: 'Illimité'
          },
          features: [
            'Tout du plan Pro',
            'Projets illimités',
            'White-label complet',
            'Manager compte dédié',
            'Formation équipe incluse',
            'API complète',
            'SLA garantie 99.9%',
            'Support téléphonique'
          ],
          paypalPlanId: {
            monthly: 'PIXEL_BUSINESS_MONTHLY',
            yearly: 'PIXEL_BUSINESS_YEARLY'
          }
        }
      ]);
      
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FONCTION API : Rafraîchir les données
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadSubscriptionData();
      await refreshPlanStatus();
      
      toast({
        title: "Données mises à jour",
        description: "Les informations d'abonnement ont été actualisées.",
      });
    } catch (error) {
      console.error('Erreur rafraîchissement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rafraîchir les données.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // ✅ EFFET : Charger données au montage
  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const handleSubscribe = (planId: string, cycle: 'monthly' | 'yearly') => {
    const plan = subscriptionPlans.find(p => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setSelectedCycle(cycle);
      setShowPayment(true);
    }
  };

  const handlePlanChange = (newPlan: string) => {
    console.log('Changing plan from', currentPlan, 'to', newPlan);
    updateCurrentPlan(newPlan);
    
    // Recharger les données après changement
    setTimeout(() => {
      loadSubscriptionData();
    }, 1000);
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter': return <Zap className="w-6 h-6 text-blue-500" />;
      case 'pro': return <Star className="w-6 h-6 text-purple-500" />;
      case 'business': return <Crown className="w-6 h-6 text-yellow-500" />;
      default: return <Zap className="w-6 h-6 text-gray-500" />;
    }
  };

  const getFeatureIcon = (feature: string) => {
    if (feature.includes('illimité') || feature.includes('Illimité')) {
      return <Infinity className="w-4 h-4 text-green-500" />;
    }
    if (feature.includes('Support téléphonique')) {
      return <Phone className="w-4 h-4 text-green-500" />;
    }
    if (feature.includes('SLA')) {
      return <Shield className="w-4 h-4 text-green-500" />;
    }
    if (feature.includes('équipe') || feature.includes('Manager')) {
      return <Users className="w-4 h-4 text-green-500" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const SubscriptionPlanCard: React.FC<{
    plan: FrontendSubscriptionPlan;
    billingCycle: 'monthly' | 'yearly';
    onSubscribe: (planId: string, cycle: 'monthly' | 'yearly') => void;
    currentPlan?: string;
  }> = ({ plan, billingCycle, onSubscribe, currentPlan: activePlan }) => {
    const price = plan.price[billingCycle];
    const monthlyEquivalent = billingCycle === 'yearly' ? price / 12 : price;
    const yearlyDiscount = billingCycle === 'yearly' 
      ? Math.round((1 - (price / (plan.price.monthly * 12))) * 100)
      : 0;

    // ✅ VÉRIFICATION PLAN ACTUEL : Via API et fallback
    const isCurrentPlan = currentSubscription?.plan?.plan_key === plan.plan_key || 
                         activePlan === plan.id || 
                         activePlan === plan.plan_key;

    return (
      <Card className={`relative h-full transition-all hover:scale-105 ${
        plan.popular ? 'ring-2 ring-purple-500 shadow-xl' : ''
      } ${plan.recommended ? 'ring-2 ring-yellow-500 shadow-xl' : ''} ${
        isCurrentPlan ? 'bg-blue-50 border-blue-300' : ''
      }`}>
        
        {/* Badges - Design préservé */}
        {plan.popular && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-purple-500 text-white px-4 py-1 shadow-lg">
              <Star className="w-3 h-3 mr-1" />
              Plus populaire
            </Badge>
          </div>
        )}
        
        {plan.recommended && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-yellow-500 text-white px-4 py-1 shadow-lg">
              <Crown className="w-3 h-3 mr-1" />
              Recommandé
            </Badge>
          </div>
        )}

        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center mb-3">
            {getPlanIcon(plan.id)}
          </div>
          <h3 className="text-2xl font-bold">{plan.name}</h3>
          <p className="text-gray-600">{plan.description}</p>
          
          <div className="space-y-2 mt-4">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">{price}€</span>
              <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mois' : 'an'}</span>
            </div>
            
            {billingCycle === 'yearly' && yearlyDiscount > 0 && (
              <div className="space-y-1">
                <div className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  <span className="text-sm font-medium">
                    Économisez {yearlyDiscount}%
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Soit {monthlyEquivalent.toFixed(2)}€/mois
                </p>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* ✅ CORRECTION : Ajout de la clé unique pour chaque feature */}
            {plan.features.map((feature, idx) => (
              <div key={`${plan.id}-feature-${idx}`} className="flex items-start gap-3">
                {getFeatureIcon(feature)}
                <span className="text-sm flex-1">{feature}</span>
              </div>
            ))}
          </div>

          {plan.limitations && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Limites :
              </p>
              <div className="space-y-1 ml-6">
                {plan.limitations.projects && (
                  <p key={`${plan.id}-limit-projects`} className="text-sm text-gray-600">
                    • {typeof plan.limitations.projects === 'number' ? `${plan.limitations.projects} projets max` : 'Projets illimités'}
                  </p>
                )}
                {plan.limitations.storage && (
                  <p key={`${plan.id}-limit-storage`} className="text-sm text-gray-600">
                    • {plan.limitations.storage} de stockage
                  </p>
                )}
                {plan.limitations.generations && (
                  <p key={`${plan.id}-limit-generations`} className="text-sm text-gray-600">
                    • {plan.limitations.generations} générations/mois
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-4">
          {isCurrentPlan ? (
            <div className="w-full space-y-2">
              <Button disabled className="w-full" variant="outline">
                <CheckCircle className="w-4 h-4 mr-2" />
                Plan actuel
              </Button>
              {currentSubscription && (
                <p className="text-xs text-center text-gray-500">
                  Renouvellement le {new Date(currentSubscription.next_billing_date || '').toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          ) : (
            <Button 
              onClick={() => onSubscribe(plan.id, billingCycle)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              size="lg"
              disabled={isLoading}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {currentPlan ? 'Changer de plan' : 'S\'abonner maintenant'}
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  // ✅ LOADING STATE : Pendant le chargement initial
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600">Chargement des plans d'abonnement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header avec bouton de rafraîchissement */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Plans d'Abonnement</h2>
          {(currentSubscription || currentPlan) && (
            <p className="text-gray-600">
              Plan actuel: <span className="font-medium capitalize">
                {currentSubscription?.plan?.name || currentPlan}
              </span>
              {currentSubscription?.status === 'active' && (
                <Badge className="ml-2 bg-green-100 text-green-700">Actif</Badge>
              )}
            </p>
          )}
        </div>
        
        <Button 
          onClick={handleRefresh}
          disabled={isRefreshing || planLoading}
          variant="outline" 
          size="sm"
        >
          {(isRefreshing || planLoading) ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Actualiser
        </Button>
      </div>

      {/* Toggle Mensuel/Annuel - Design préservé */}
      <div className="flex items-center justify-center space-x-4">
        <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-blue-600' : 'text-gray-500'}`}>
          Mensuel
        </span>
        <Switch
          checked={billingCycle === 'yearly'}
          onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
        />
        <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-blue-600' : 'text-gray-500'}`}>
          Annuel
        </span>
        {billingCycle === 'yearly' && (
          <Badge className="bg-green-100 text-green-700 ml-2">
            Jusqu'à 17% d'économie
          </Badge>
        )}
      </div>

      {/* Plans Grid - Design préservé avec CORRECTION des clés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {subscriptionPlans.map((plan) => (
          <SubscriptionPlanCard 
            key={`subscription-plan-${plan.id}`} // ✅ CORRECTION : Clé unique
            plan={plan}
            billingCycle={billingCycle}
            onSubscribe={handleSubscribe}
            currentPlan={currentSubscription?.plan?.plan_key || currentPlan}
          />
        ))}
      </div>

      {/* FAQ Section - Design préservé avec CORRECTION des clés */}
      <Card className="bg-gradient-to-r from-gray-50 to-blue-50">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <h3 className="text-2xl font-bold">Questions Fréquentes</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div key="faq-change-plan" className="space-y-2">
                <h4 className="font-semibold">Puis-je changer de plan ?</h4>
                <p className="text-sm text-gray-600">
                  Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. 
                  Les changements prennent effet immédiatement.
                </p>
              </div>
              
              <div key="faq-cancel" className="space-y-2">
                <h4 className="font-semibold">Que se passe-t-il si j'annule ?</h4>
                <p className="text-sm text-gray-600">
                  Vous gardez l'accès jusqu'à la fin de votre période de facturation. 
                  Aucune pénalité d'annulation.
                </p>
              </div>
              
              <div key="faq-payment" className="space-y-2">
                <h4 className="font-semibold">Moyens de paiement acceptés ?</h4>
                <p className="text-sm text-gray-600">
                  PayPal, cartes de crédit/débit via PayPal. 
                  Paiement sécurisé et chiffré.
                </p>
              </div>
              
              <div key="faq-support" className="space-y-2">
                <h4 className="font-semibold">Support technique inclus ?</h4>
                <p className="text-sm text-gray-600">
                  Support email pour tous, chat prioritaire pour Pro+, 
                  support téléphonique pour Business.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Manager - Préservé */}
      {selectedPlan && (
        <PaymentManager
          type="subscription"
          item={{
            id: selectedPlan.id,
            name: selectedPlan.name,
            price: selectedPlan.price[selectedCycle],
            billingCycle: selectedCycle,
            description: `Abonnement ${selectedPlan.name} - ${selectedPlan.description}`
          }}
          isOpen={showPayment}
          onClose={() => {
            setShowPayment(false);
            setSelectedPlan(null);
          }}
          onPlanChange={handlePlanChange}
        />
      )}
    </div>
  );
};

export default SubscriptionSystem;