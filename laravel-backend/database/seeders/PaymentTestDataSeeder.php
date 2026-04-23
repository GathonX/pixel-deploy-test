<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CreditPackage;
use App\Models\SubscriptionPlan;
use App\Models\ActionEarn;

class PaymentTestDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Packages de crédits
        $packages = [
            [
                'package_key' => 'starter',
                'name' => 'Pack Débutant',
                'credits' => 100,
                'price' => 9.99,
                'original_price' => 9.99,
                'discount_percentage' => 0,
                'is_popular' => false,
                'is_best_value' => false,
                'bonus_credits' => 10,
                'bonus_type' => 'credits',
                'paypal_product_id' => 'STARTER_PACK',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'package_key' => 'pro',
                'name' => 'Pack Pro',
                'credits' => 500,
                'price' => 39.99,
                'original_price' => 49.99,
                'discount_percentage' => 20,
                'is_popular' => true,
                'is_best_value' => false,
                'bonus_credits' => 100,
                'bonus_type' => 'credits',
                'paypal_product_id' => 'PRO_PACK',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'package_key' => 'enterprise',
                'name' => 'Pack Entreprise',
                'credits' => 1000,
                'price' => 69.99,
                'original_price' => 99.99,
                'discount_percentage' => 30,
                'is_popular' => false,
                'is_best_value' => true,
                'bonus_credits' => 300,
                'bonus_type' => 'credits',
                'paypal_product_id' => 'ENTERPRISE_PACK',
                'is_active' => true,
                'sort_order' => 3,
            ],
        ];

        foreach ($packages as $package) {
            CreditPackage::updateOrCreate(
                ['package_key' => $package['package_key']],
                $package
            );
        }

        // 2. Plans d'abonnement
        $plans = [
            [
                'plan_key' => 'basic',
                'name' => 'Plan Basic',
                'description' => 'Parfait pour débuter avec PixelRise AI',
                'price_monthly' => 19.99,
                'price_yearly' => 199.99,
                'features' => [
                    '500 générations par mois',
                    '5 projets maximum',
                    'Support email',
                    'Templates de base'
                ],
                'is_popular' => false,
                'is_recommended' => false,
                'max_projects' => 5,
                'max_generations_per_month' => 500,
                'storage_gb' => 5,
                'paypal_plan_id_monthly' => 'BASIC_MONTHLY',
                'paypal_plan_id_yearly' => 'BASIC_YEARLY',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'plan_key' => 'pro',
                'name' => 'Plan Pro',
                'description' => 'Pour les professionnels actifs',
                'price_monthly' => 49.99,
                'price_yearly' => 499.99,
                'features' => [
                    '2000 générations par mois',
                    '20 projets maximum',
                    'Support prioritaire',
                    'Tous les templates',
                    'Analytics avancées'
                ],
                'is_popular' => true,
                'is_recommended' => false,
                'max_projects' => 20,
                'max_generations_per_month' => 2000,
                'storage_gb' => 50,
                'paypal_plan_id_monthly' => 'PRO_MONTHLY',
                'paypal_plan_id_yearly' => 'PRO_YEARLY',
                'is_active' => true,
                'sort_order' => 2,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(
                ['plan_key' => $plan['plan_key']],
                $plan
            );
        }

        $this->command->info('✅ Données de test Payment créées avec succès !');
    }
}