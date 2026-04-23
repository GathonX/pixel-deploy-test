<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class EmergencyWeeklyGenerationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = [30, 120, 300]; // 30s, 2min, 5min

    /**
     * ✅ JOB DE FALLBACK D'URGENCE POUR GÉNÉRATION HEBDOMADAIRE
     */
    public function __construct()
    {
        $this->onQueue('posts'); // Queue prioritaire
    }

    /**
     * ✅ EXÉCUTER LA GÉNÉRATION D'URGENCE
     */
    public function handle(): void
    {
        Log::info("🆘 [EMERGENCY] Démarrage génération hebdomadaire de fallback", [
            'attempt' => $this->attempts(),
            'max_tries' => $this->tries,
            'week' => now()->format('Y-W')
        ]);

        try {
            // Forcer la génération hebdomadaire
            $exitCode = Artisan::call('posts:generate-weekly', [
                '--force' => true
            ]);

            $output = Artisan::output();

            if ($exitCode === 0) {
                Log::info("✅ [EMERGENCY] Génération d'urgence réussie", [
                    'output' => $output,
                    'week' => now()->format('Y-W')
                ]);

                // Envoyer notification de succès
                $this->sendSuccessNotification($output);

            } else {
                throw new \Exception("Artisan command failed with exit code: {$exitCode}");
            }

        } catch (\Exception $e) {
            Log::error("❌ [EMERGENCY] Échec génération de fallback", [
                'error' => $e->getMessage(),
                'attempt' => $this->attempts(),
                'week' => now()->format('Y-W')
            ]);

            // Si c'est la dernière tentative, envoyer alerte critique
            if ($this->attempts() >= $this->tries) {
                $this->sendCriticalAlert($e->getMessage());
            }

            throw $e; // Relancer pour déclencher retry
        }
    }

    /**
     * ✅ ÉCHEC DÉFINITIF DU JOB
     */
    public function failed(\Throwable $exception): void
    {
        Log::critical("💀 [EMERGENCY] Échec définitif du fallback hebdomadaire", [
            'error' => $exception->getMessage(),
            'attempts' => $this->tries,
            'week' => now()->format('Y-W')
        ]);

        // Programmer un fallback manuel d'urgence pour demain
        $this->scheduleManualFallback();
    }

    /**
     * ✅ ENVOYER NOTIFICATION DE SUCCÈS
     */
    private function sendSuccessNotification(string $output): void
    {
        try {
            $adminEmail = env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com');

            $subject = "✅ RÉSOLU - Génération hebdomadaire de rattrapage réussie";

            $content = "RÉCUPÉRATION SYSTÈME PIXELRISE

✅ GÉNÉRATION DE RATTRAPAGE RÉUSSIE
══════════════════════════════════════════════════════════════════════

Le système de fallback automatique a récupéré avec succès la génération hebdomadaire.

Date/Heure : " . now()->format('d/m/Y à H:i:s') . "
Semaine : " . now()->format('Y-W') . "

RÉSULTATS DE LA GÉNÉRATION
─────────────────────────────────────────────────
" . $output . "

STATUT SYSTÈME
─────────────────────────────────────────────────
✅ Génération hebdomadaire : Récupérée
✅ Fallback automatique : Fonctionnel  
✅ Système : Opérationnel

Aucune action manuelle requise.
Le système fonctionne normalement.

--
Système de surveillance PixelRise";

            \Mail::raw($content, function ($message) use ($adminEmail, $subject) {
                $message->to($adminEmail)->subject($subject);
            });

        } catch (\Exception $e) {
            Log::error("❌ Impossible d'envoyer notification de succès", [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ ENVOYER ALERTE CRITIQUE
     */
    private function sendCriticalAlert(string $error): void
    {
        try {
            $adminEmail = env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com');

            $subject = "🚨 CRITIQUE - Échec total génération hebdomadaire";

            $content = "ALERTE CRITIQUE PIXELRISE

🚨 ÉCHEC TOTAL DU SYSTÈME DE GÉNÉRATION
══════════════════════════════════════════════════════════════════════

Le système de génération hebdomadaire ET son fallback automatique ont échoué.

Date/Heure : " . now()->format('d/m/Y à H:i:s') . "
Semaine concernée : " . now()->format('Y-W') . "
Tentatives effectuées : {$this->tries}

ERREUR FINALE
─────────────────────────────────────────────────
{$error}

IMPACT SYSTÈME
─────────────────────────────────────────────────
❌ Aucun post automatique généré cette semaine
❌ Utilisateurs sans contenu prévu
❌ Système de fallback en échec

ACTIONS REQUISES IMMÉDIATEMENT
─────────────────────────────────────────────────
1. 🔴 INTERVENTION MANUELLE URGENTE
2. Vérifier infrastructure (DB, Redis, serveurs)
3. Lancer manuellement : php artisan posts:generate-weekly --force
4. Vérifier les queues : php artisan queue:work
5. Redémarrer les services si nécessaire

FALLBACK D'URGENCE PROGRAMMÉ
─────────────────────────────────────────────────
⏰ Tentative manuelle programmée pour demain matin
📧 Notifications de surveillance activées

Cette situation nécessite une intervention immédiate.

--
Système critique PixelRise";

            \Mail::raw($content, function ($message) use ($adminEmail, $subject) {
                $message->to($adminEmail)->subject($subject);
            });

        } catch (\Exception $e) {
            Log::error("❌ Impossible d'envoyer alerte critique", [
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ PROGRAMMER FALLBACK MANUEL POUR DEMAIN
     */
    private function scheduleManualFallback(): void
    {
        try {
            // Programmer une nouvelle tentative demain matin
            dispatch(new self())->delay(now()->addDay()->setHour(8)->setMinute(0));

            Log::info("🔄 [EMERGENCY] Fallback manuel programmé pour demain", [
                'scheduled_for' => now()->addDay()->setHour(8)->setMinute(0)->toISOString()
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Impossible de programmer fallback manuel", [
                'error' => $e->getMessage()
            ]);
        }
    }
}