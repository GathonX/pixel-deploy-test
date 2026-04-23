<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\UserFeatureAccess;
use App\Models\Notification;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SendExpirationRemindersCommand extends Command
{
    /**
     * ✅ COMMANDE : Rappels post-expiration (1 fois par semaine)
     * Cette commande envoie des rappels aux users dont les fonctionnalités sont DÉJÀ expirées
     * - Notification dans la cloche : 1 fois par semaine
     * - Email Gmail : 1 fois par semaine
     */
    protected $signature = 'features:send-expiration-reminders
                            {--feature= : Clé de la fonctionnalité (blog, social_media, sprint_planning)}
                            {--user= : ID utilisateur spécifique}
                            {--dry-run : Mode test sans envoi réel}';

    protected $description = 'Envoie des rappels 1 fois par semaine pour les fonctionnalités expirées (notification + email)';

    public function handle()
    {
        $this->info("📬 Démarrage envoi rappels d'expiration");

        $startTime = now();
        $isDryRun = $this->option('dry-run');

        $stats = [
            'expired_found' => 0,
            'reminders_eligible' => 0,
            'notifications_sent' => 0,
            'emails_sent' => 0,
            'skipped_recent' => 0,
        ];

        try {
            // ÉTAPE 1: Récupérer toutes les fonctionnalités expirées
            $expiredFeatures = $this->getExpiredFeatures();
            $stats['expired_found'] = $expiredFeatures->count();

            $this->info("📊 {$stats['expired_found']} fonctionnalités expirées trouvées");

            // ÉTAPE 2: Filtrer celles éligibles pour rappel (pas de rappel dans les 7 derniers jours)
            foreach ($expiredFeatures as $access) {
                // Vérifier si un rappel a été envoyé dans les 7 derniers jours
                if ($this->hasRecentReminder($access)) {
                    $stats['skipped_recent']++;
                    $this->line("⏭️  Skipped: {$access->feature->name} (user {$access->user_id}) - rappel déjà envoyé récemment");
                    continue;
                }

                $stats['reminders_eligible']++;

                if ($isDryRun) {
                    $this->warn("🔍 [DRY-RUN] Rappel pour: {$access->feature->name} (user {$access->user_id})");
                    continue;
                }

                // ÉTAPE 3: Envoyer notification dans la cloche
                $notificationSent = $this->sendNotificationReminder($access);
                if ($notificationSent) {
                    $stats['notifications_sent']++;
                }

                // ÉTAPE 4: Envoyer email Gmail
                $emailSent = $this->sendEmailReminder($access);
                if ($emailSent) {
                    $stats['emails_sent']++;
                }

                $this->info("✅ Rappel envoyé: {$access->feature->name} (user {$access->user_id})");
            }

            $duration = $startTime->diffInSeconds(now());

            $this->info("✅ Envoi rappels terminé");
            $this->table(['Métrique', 'Valeur'], [
                ['Fonctionnalités expirées trouvées', $stats['expired_found']],
                ['Éligibles pour rappel', $stats['reminders_eligible']],
                ['Skipped (rappel récent)', $stats['skipped_recent']],
                ['Notifications envoyées', $stats['notifications_sent']],
                ['Emails envoyés', $stats['emails_sent']],
                ['Mode', $isDryRun ? 'DRY-RUN' : 'PRODUCTION'],
                ['Durée', "{$duration}s"]
            ]);

            Log::info("✅ Rappels d'expiration envoyés", [
                'stats' => $stats,
                'duration_seconds' => $duration,
                'dry_run' => $isDryRun,
                'date' => now()->toDateString()
            ]);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ Erreur: {$e->getMessage()}");

            Log::error("❌ Erreur envoi rappels expiration", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return Command::FAILURE;
        }
    }

    /**
     * ✅ RÉCUPÉRER LES FONCTIONNALITÉS EXPIRÉES
     */
    private function getExpiredFeatures()
    {
        $query = UserFeatureAccess::with(['user', 'feature'])
            ->where('admin_enabled', true)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now());

        // Filtrer par fonctionnalité si spécifié
        if ($this->option('feature')) {
            $query->whereHas('feature', function($q) {
                $q->where('key', $this->option('feature'));
            });
        }

        // Filtrer par utilisateur si spécifié
        if ($this->option('user')) {
            $query->where('user_id', $this->option('user'));
        }

        return $query->get();
    }

    /**
     * ✅ VÉRIFIER SI UN RAPPEL A ÉTÉ ENVOYÉ DANS LES 7 DERNIERS JOURS (1 fois par semaine)
     */
    private function hasRecentReminder(UserFeatureAccess $access): bool
    {
        $sevenDaysAgo = now()->subDays(7);

        // Vérifier dans les notifications
        $hasRecentNotification = Notification::where('user_id', $access->user_id)
            ->where('type', 'feature_expired_reminder')
            ->whereJsonContains('data->feature_id', $access->feature_id)
            ->where('created_at', '>=', $sevenDaysAgo)
            ->exists();

        return $hasRecentNotification;
    }

    /**
     * ✅ ENVOYER NOTIFICATION DANS LA CLOCHE (1 fois par semaine)
     */
    private function sendNotificationReminder(UserFeatureAccess $access): bool
    {
        try {
            $user = $access->user;
            $feature = $access->feature;
            $expiredDaysAgo = now()->diffInDays($access->expires_at);

            Notification::create([
                'user_id' => $user->id,
                'type' => 'feature_expired_reminder',
                'priority' => 'urgent',
                'status' => 'unread',
                'title' => "⏰ Rappel : {$feature->name} expiré",
                'message' => "Votre fonctionnalité {$feature->name} est expirée depuis {$expiredDaysAgo} jour" . ($expiredDaysAgo > 1 ? 's' : '') . ". Renouvelez maintenant pour continuer à l'utiliser.",
                'data' => [
                    'feature_id' => $feature->id,
                    'feature_key' => $feature->key,
                    'feature_name' => $feature->name,
                    'expired_at' => $access->expires_at->toISOString(),
                    'expired_days_ago' => $expiredDaysAgo,
                    'can_renew' => true,
                    'reminder_type' => 'post_expiration_weekly',
                    'access_id' => $access->id,
                ],
                'href' => "/features",
                'category' => 'feature_expiration',
                'tags' => ['feature', 'expired', 'reminder', $feature->key],
                'show_badge' => true,
            ]);

            Log::info("🔔 Notification rappel expiration envoyée", [
                'user_id' => $user->id,
                'feature_key' => $feature->key,
                'expired_days_ago' => $expiredDaysAgo
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error("❌ Erreur envoi notification rappel", [
                'user_id' => $access->user_id,
                'feature_key' => $access->feature->key,
                'error' => $e->getMessage()
            ]);

            return false;
        }
    }

    /**
     * ✅ ENVOYER EMAIL GMAIL (1 fois par semaine)
     */
    private function sendEmailReminder(UserFeatureAccess $access): bool
    {
        try {
            $user = $access->user;
            $feature = $access->feature;
            $expiredDaysAgo = now()->diffInDays($access->expires_at);

            $subject = "⏰ Rappel : Votre abonnement {$feature->name} a expiré";

            $emailContent = "Bonjour {$user->name},

Ceci est un rappel concernant votre fonctionnalité expirée.

STATUT ACTUEL
-----------------------------------------
Fonctionnalité : {$feature->name}
Statut : Expirée depuis {$expiredDaysAgo} jour" . ($expiredDaysAgo > 1 ? 's' : '') . "
Date d'expiration : " . $access->expires_at->format('d/m/Y à H:i') . "

QUE SE PASSE-T-IL MAINTENANT ?
-----------------------------------------
• Vous pouvez consulter vos anciens contenus
• La génération automatique est désactivée
• Vos données sont conservées en sécurité

RENOUVELER MAINTENANT
-----------------------------------------
Pour reprendre la génération automatique et débloquer toutes les fonctionnalités :

👉 " . config('app.frontend_url') . "/features

DÉTAILS DU RENOUVELLEMENT
-----------------------------------------
• Accès immédiat après paiement
• Toutes vos données restaurées
• Génération automatique réactivée
• Prix : {$feature->price}€/mois

BESOIN D'AIDE ?
-----------------------------------------
Notre équipe support est disponible :
• Support : " . config('app.frontend_url') . "/dashboard/tickets
• Email : support@pixelrise.com

Cordialement,
L'équipe PixelRise
" . config('app.frontend_url') . "

---
Vous recevez ce rappel une fois par semaine car votre fonctionnalité est expirée.
Pour arrêter ces rappels, renouvelez votre abonnement.";

            Mail::raw($emailContent, function ($message) use ($user, $subject) {
                $message->to($user->email)
                        ->subject($subject);
            });

            Log::info("📧 Email rappel expiration envoyé", [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'feature_key' => $feature->key,
                'expired_days_ago' => $expiredDaysAgo
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error("❌ Erreur envoi email rappel", [
                'user_id' => $access->user_id,
                'feature_key' => $access->feature->key,
                'error' => $e->getMessage()
            ]);

            return false;
        }
    }
}
