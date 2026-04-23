<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'plan_key'                    => 'starter',
                'name'                        => 'Starter',
                'description'                 => 'Pour démarrer votre présence en ligne.',
                'is_active'                   => true,
                'is_popular'                  => false,
                'is_recommended'              => false,
                'sort_order'                  => 1,
                'price_ariary_monthly'        => 35000,
                'price_ariary_yearly'         => 350000,
                'max_published_sites'         => 1,
                'ai_enabled'                  => false,
                'included_languages_per_site' => 1,
                'extra_language_price_ariary' => 20000,
                'max_users'                   => 1,
                'extra_user_price_ariary'     => 15000,
                'features'                    => [
                    '1 site web publié',
                    'Réservations de base',
                    'Produits & catalogue',
                    'Blog manuel',
                    'Calendrier simple',
                    '1 langue incluse',
                    '1 utilisateur inclus',
                    'Support standard',
                ],
            ],
            [
                'plan_key'                    => 'pro',
                'name'                        => 'Pro',
                'description'                 => 'Pour les agences qui veulent automatiser.',
                'is_active'                   => true,
                'is_popular'                  => true,
                'is_recommended'              => true,
                'sort_order'                  => 2,
                'price_ariary_monthly'        => 120000,
                'price_ariary_yearly'         => 1200000,
                'max_published_sites'         => 1,
                'ai_enabled'                  => true,
                'included_languages_per_site' => 2,
                'extra_language_price_ariary' => 20000,
                'max_users'                   => 5,
                'extra_user_price_ariary'     => 15000,
                'features'                    => [
                    '1 site web publié',
                    'Tout Starter',
                    'IA blog + réseaux sociaux',
                    'Réservations avancées',
                    'Produits avec saisonnalité',
                    '2 langues incluses par site',
                    'Multi-utilisateurs (5 membres)',
                    'Analytics avancées',
                    'Support prioritaire',
                ],
            ],
            [
                'plan_key'                    => 'premium',
                'name'                        => 'Premium',
                'description'                 => 'Pour les agences multi-sites.',
                'is_active'                   => true,
                'is_popular'                  => false,
                'is_recommended'              => false,
                'sort_order'                  => 3,
                'price_ariary_monthly'        => 200000,
                'price_ariary_yearly'         => 2000000,
                'max_published_sites'         => 5,
                'ai_enabled'                  => true,
                'included_languages_per_site' => 3,
                'extra_language_price_ariary' => 20000,
                'max_users'                   => 0, // 0 = illimité
                'extra_user_price_ariary'     => 0,
                'features'                    => [
                    "Jusqu'à 5 sites publiés",
                    'Tout Pro',
                    'IA complète',
                    '3 langues incluses par site',
                    'Multi-utilisateurs illimités',
                    'Dashboard global multi-sites',
                    'Rôles & permissions avancés',
                    'Support prioritaire + assistance',
                ],
            ],
        ];

        foreach ($plans as $data) {
            SubscriptionPlan::updateOrCreate(
                ['plan_key' => $data['plan_key']],
                $data
            );
        }

        $this->command->info('✅ Plans PixelRise seedés : starter, pro, premium.');
    }
}
