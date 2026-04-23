// src/components/payments/src/components/CreditPurchaseSystem.tsx
// ✅ INTÉGRATION : PaymentService API complètement intégré
// ✅ PRÉSERVATION : Design et structure existants maintenus
// ✅ CORRECTION : Import des types depuis paymentService.ts


import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PaymentManager from './PaymentManager';
import { useToast } from '../hooks/use-toast';
import { 
  Coins, 
  CreditCard, 
  CheckCircle, 
  RefreshCw,
  Info,
  Zap,
  Gift,
  Star,
  TrendingUp,
  Loader2
} from 'lucide-react';
import paymentService, { type FrontendCreditPackage } from '../../../../services/paymentService';

const CreditPurchaseSystem = () => {
  const [selectedPackage, setSelectedPackage] = useState<FrontendCreditPackage | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [creditPackages, setCreditPackages] = useState<FrontendCreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRecharge, setAutoRecharge] = useState({
    enabled: false,
    triggerThreshold: 5,
    rechargePackageId: 'power_pack',
    maxPerMonth: 100,
    lastRecharge: null as Date | null
  });
  const { toast } = useToast();

  const loadCreditPackages = async () => {
    try {
      setIsLoading(true);
      const packagesData = await paymentService.getCreditPackages();
      
      // Validation des données
      const validPackages = packagesData.filter(pkg => pkg.id && typeof pkg.id === 'string');
      if (validPackages.length === 0) {
        throw new Error('Aucun package valide renvoyé par l\'API');
      }
      
      // Vérification des ID uniques
      const uniqueIds = new Set(validPackages.map(pkg => pkg.id));
      if (uniqueIds.size !== validPackages.length) {
        console.warn('Attention : des ID de packages non uniques détectés');
        toast({
          title: "Avertissement",
          description: "Certains packages ont des ID non uniques. Utilisation des données par défaut.",
          variant: "destructive",
        });
        throw new Error('ID de packages non uniques');
      }
      
      setCreditPackages(validPackages);
    } catch (error) {
      console.error('Erreur chargement packages crédits:', error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger les packages. Données par défaut affichées.",
        variant: "destructive",
      });
      setCreditPackages([
        {
          id: 'quick_start',
          name: 'Quick Start',
          credits: 5,
          price: 4,
          originalPrice: 5,
          discount: 20,
          paypalProductId: 'PIXEL_CREDITS_5'
        },
        {
          id: 'power_pack',
          name: 'Power Pack',
          credits: 15,
          price: 10,
          originalPrice: 15,
          discount: 33,
          popular: true,
          paypalProductId: 'PIXEL_CREDITS_15'
        },
        {
          id: 'business',
          name: 'Business',
          credits: 35,
          price: 20,
          originalPrice: 35,
          discount: 43,
          paypalProductId: 'PIXEL_CREDITS_35'
        },
        {
          id: 'ultimate',
          name: 'Ultimate',
          credits: 75,
          price: 35,
          originalPrice: 75,
          discount: 53,
          bestValue: true,
          bonus: {
            type: 'credits',
            value: 10,
            description: '+10 crédits bonus'
          },
          paypalProductId: 'PIXEL_CREDITS_75'
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          credits: 150,
          price: 60,
          originalPrice: 150,
          discount: 60,
          bonus: {
            type: 'credits',
            value: 30,
            description: '+30 crédits bonus + support prioritaire'
          },
          paypalProductId: 'PIXEL_CREDITS_150'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCreditPackages();
  }, []);

  const handlePurchase = (packageId: string) => {
    const pkg = creditPackages.find(p => p.id === packageId);
    if (pkg) {
      setSelectedPackage(pkg);
      setShowPayment(true);
    }
  };

  const CreditPackageCard: React.FC<{ 
    package: FrontendCreditPackage; 
    onPurchase: (packageId: string) => void;
  }> = ({ package: pkg, onPurchase }) => {
    return (
      <Card className={`relative h-full transition-all hover:scale-105 ${
        pkg.popular ? 'ring-2 ring-blue-500 shadow-xl' : ''
      } ${pkg.bestValue ? 'ring-2 ring-green-500 shadow-xl' : ''}`}>
        {pkg.popular && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-blue-500 text-white px-3 py-1 shadow-lg">
              <Star className="w-3 h-3 mr-1" />
              Plus populaire
            </Badge>
          </div>
        )}
        {pkg.bestValue && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-green-500 text-white px-3 py-1 shadow-lg">
              <TrendingUp className="w-3 h-3 mr-1" />
              Meilleure valeur
            </Badge>
          </div>
        )}
        <CardHeader className="text-center pb-3">
          <h3 className="text-xl font-bold">{pkg.name}</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Coins className="w-6 h-6 text-yellow-500" />
              <span className="text-2xl font-bold text-yellow-600">
                {pkg.credits} crédits
              </span>
            </div>
            {pkg.bonus && (
              <div className="flex items-center justify-center gap-1">
                <Gift className="w-4 h-4 text-green-500" />
                <p className="text-sm text-green-600 font-medium">
                  {pkg.bonus.description}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold">{pkg.price}€</span>
              {pkg.discount > 0 && (
                <span className="text-lg text-gray-400 line-through">
                  {pkg.originalPrice}€
                </span>
              )}
            </div>
            {pkg.discount > 0 && (
              <div className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded-full">
                <span className="text-sm font-medium">
                  Économisez {pkg.discount}%
                </span>
              </div>
            )}
            <p className="text-sm text-gray-500">
              {(pkg.price / pkg.credits).toFixed(2)}€ par crédit
            </p>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Activation instantanée</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Valide 6 mois</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Support prioritaire</span>
            </div>
            {pkg.bonus && (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Bonus inclus</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => onPurchase(pkg.id)}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            size="lg"
            disabled={isLoading}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Acheter maintenant
          </Button>
        </CardFooter>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600">Chargement des packages de crédits...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {creditPackages.map((pkg) => (
          <CreditPackageCard 
            key={pkg.id}
            package={pkg}
            onPurchase={handlePurchase}
          />
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Recharge Automatique</h3>
              <p className="text-sm text-gray-600">
                Rechargez automatiquement vos crédits quand ils sont bas
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Activer la recharge automatique</label>
              <p className="text-xs text-gray-500 mt-1">
                Plus de rupture de crédits pendant vos projets importants
              </p>
            </div>
            <Switch 
              checked={autoRecharge.enabled}
              onCheckedChange={(checked) => 
                setAutoRecharge(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>
          {autoRecharge.enabled && (
            <div className="space-y-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  Déclencher quand crédits &lt; {autoRecharge.triggerThreshold}
                </label>
                <Slider
                  value={[autoRecharge.triggerThreshold]}
                  onValueChange={([value]) => 
                    setAutoRecharge(prev => ({ ...prev, triggerThreshold: value }))
                  }
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1 crédit</span>
                  <span>20 crédits</span>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium">Package de recharge</label>
                <Select 
                  value={autoRecharge.rechargePackageId}
                  onValueChange={(value) => 
                    setAutoRecharge(prev => ({ ...prev, rechargePackageId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {creditPackages.map(pkg => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - {pkg.credits} crédits ({pkg.price}€)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium">Limite mensuelle (€)</label>
                <Input
                  type="number"
                  value={autoRecharge.maxPerMonth}
                  onChange={(e) => 
                    setAutoRecharge(prev => ({ 
                      ...prev, 
                      maxPerMonth: parseInt(e.target.value) || 0 
                    }))
                  }
                  placeholder="100"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Maximum {autoRecharge.maxPerMonth}€ de recharge automatique par mois
                </p>
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Vous pouvez désactiver la recharge automatique à tout moment. 
                  Les recharges sont traitées via PayPal de façon sécurisée.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <Button className="w-full" variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sauvegarder les paramètres
          </Button>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-r from-green-50 to-blue-50">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              <h3 className="text-xl font-bold">Pourquoi acheter des crédits ?</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold">Générateurs IA illimités</h4>
                <p className="text-sm text-gray-600">
                  Créez autant de contenu que vous voulez
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold">Support prioritaire</h4>
                <p className="text-sm text-gray-600">
                  Assistance rapide et personnalisée
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <Gift className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold">Bonus exclusifs</h4>
                <p className="text-sm text-gray-600">
                  Templates premium et fonctionnalités avancées
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {selectedPackage && (
        <PaymentManager
          type="credit"
          item={{
            id: selectedPackage.id,
            name: selectedPackage.name,
            price: selectedPackage.price,
            credits: selectedPackage.credits,
            description: `Package de ${selectedPackage.credits} crédits pour PixelRise AI`
          }}
          isOpen={showPayment}
          onClose={() => {
            setShowPayment(false);
            setSelectedPackage(null);
          }}
        />
      )}
    </div>
  );
};

export default CreditPurchaseSystem;
