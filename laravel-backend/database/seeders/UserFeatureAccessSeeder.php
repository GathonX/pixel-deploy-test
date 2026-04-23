<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Feature;
use App\Models\UserFeatureAccess;
use Illuminate\Support\Facades\Log;

class UserFeatureAccessSeeder extends Seeder
{
    /**
     * Activer automatiquement toutes les fonctionnalités pour les utilisateurs de test
     */
    public function run(): void
    {
        Log::info('🚀 [UserFeatureAccessSeeder] Début activation fonctionnalités pour utilisateurs de test');

        // Récupérer tous les utilisateurs
        $users = User::all();

        // Récupérer toutes les features
        $features = Feature::all();

        if ($users->isEmpty()) {
            Log::warning('⚠️ [UserFeatureAccessSeeder] Aucun utilisateur trouvé');
            $this->command->warn('Aucun utilisateur trouvé. Exécutez d\'abord UserSeeder.');
            return;
        }

        if ($features->isEmpty()) {
            Log::warning('⚠️ [UserFeatureAccessSeeder] Aucune fonctionnalité trouvée');
            $this->command->warn('Aucune fonctionnalité trouvée. Exécutez d\'abord FeatureSeeder.');
            return;
        }

        $this->command->info("📊 Activation des fonctionnalités pour {$users->count()} utilisateur(s)...");

        $totalActivated = 0;

        foreach ($users as $user) {
            $this->command->info("👤 Utilisateur: {$user->email}");

            foreach ($features as $feature) {
                // Vérifier si l'accès existe déjà
                $access = UserFeatureAccess::where('user_id', $user->id)
                    ->where('feature_id', $feature->id)
                    ->first();

                if ($access) {
                    // Mettre à jour l'accès existant pour l'activer
                    $access->update([
                        'admin_enabled' => true,
                        'user_activated' => true,
                        'status' => 'active',
                        'expires_at' => null, // Accès illimité pour les tests
                        'activation_date' => now(),
                    ]);

                    $this->command->info("   ✅ Fonctionnalité '{$feature->name}' mise à jour");
                } else {
                    // Créer un nouvel accès actif
                    UserFeatureAccess::create([
                        'user_id' => $user->id,
                        'feature_id' => $feature->id,
                        'admin_enabled' => true,
                        'user_activated' => true,
                        'status' => 'active',
                        'expires_at' => null, // Accès illimité pour les tests
                        'activation_date' => now(),
                    ]);

                    $this->command->info("   ✅ Fonctionnalité '{$feature->name}' activée");
                }

                $totalActivated++;
            }
        }

        Log::info("✅ [UserFeatureAccessSeeder] {$totalActivated} fonctionnalités activées pour {$users->count()} utilisateur(s)");
        $this->command->success("✅ {$totalActivated} fonctionnalités activées avec succès!");
        $this->command->info("🤖 Les tâches automatiques peuvent maintenant générer du contenu");
    }
}
