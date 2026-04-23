<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Feature;

class FeatureSeeder extends Seeder
{
    public function run()
    {
         $features = [
            // ✅ MODULES DE L'OFFRE FINALE À 5,99€
            [
                'key' => 'blog',
                'name' => 'Blog',
                'description' => 'Gestion et génération automatique de blogs - 30 articles IA/mois + SEO + Images Pexels',
                'price' => 5.99,
                'category' => 'premium',
                'is_active' => true,
            ],
            [
                'key' => 'social_media',
                'name' => 'Réseaux Sociaux',
                'description' => 'Gestion et programmation des réseaux sociaux - 60 posts/mois + Images + Scheduling automatique',
                'price' => 5.99,
                'category' => 'premium',
                'is_active' => true,
            ],
           
            [
                'key' => 'sprint_planning',
                'name' => 'Sprint Planning',
                'description' => '4 sprints/mois + Suivi équipe + Gestion de projet agile',
                'price' => 5.99,
                'category' => 'premium',
                'is_active' => true,
            ],

            // ✅ MODULE RÉSERVATION
            [
                'key' => 'reservations',
                'name' => 'Réservation',
                'description' => 'Système de booking + Calendrier intégré + Rappels automatiques + Synchronisation',
                'price' => 5.99,
                'category' => 'premium',
                'is_active' => true,
            ],

            // ✅ MODULES COMPLÉMENTAIRES FUTURS
            [
                'key' => 'analytics',
                'name' => 'Analytics Avancés',
                'description' => 'Analyses détaillées et rapports personnalisés + Métriques temps réel',
                'price' => 5.99,
                'category' => 'enterprise',
                'is_active' => true,
            ],
        ];

        foreach ($features as $feature) {
            Feature::updateOrCreate(
                ['key' => $feature['key']],
                $feature
            );
        }

        // ✅ MESSAGE DE CONFIRMATION
        $this->command->info('🚀 Features mises à jour avec la nouvelle offre PixelRise !');
        $this->command->info('💰 Pricing uniforme : 5,99€ par module');
        $this->command->info('📊 Total modules disponibles : ' . count($features));
    }
}
