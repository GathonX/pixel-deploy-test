<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\UserFeatureAccess;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class CheckExpiredFeatures extends Command
{
    /**
     * ✅ COMMANDE AUTOMATIQUE : Vérifie et notifie les expirations
     */
    protected $signature = 'features:check-expired
                            {--force : Forcer la vérification même si déjà fait aujourd\'hui}
                            {--user= : ID utilisateur spécifique}
                            {--send-notifications : Envoyer les notifications}';

    protected $description = 'Vérifie les fonctionnalités expirées et envoie des notifications de rappel';

    public function handle()
    {
        $this->info("📅 Démarrage vérification expirations fonctionnalités");

        $startTime = now();
        $stats = [
            'expired_marked' => 0,
            'reminders_7d' => 0,
            'reminders_3d' => 0,
            'reminders_1d' => 0,
            'expired_notifications' => 0,
            'emails_sent' => 0
        ];

        try {
            // ÉTAPE 1: Marquer les fonctionnalités expirées
            $stats['expired_marked'] = $this->markExpiredFeatures();

            // ÉTAPE 2: Envoyer rappels 7 jours avant expiration
            $stats['reminders_7d'] = $this->sendExpirationReminders(7);

            // ÉTAPE 3: Envoyer rappels 3 jours avant expiration
            $stats['reminders_3d'] = $this->sendExpirationReminders(3);

            // ÉTAPE 4: Envoyer rappels 1 jour avant expiration
            $stats['reminders_1d'] = $this->sendExpirationReminders(1);

            // ÉTAPE 5: Notifier les fonctionnalités qui viennent d'expirer
            $stats['expired_notifications'] = $this->notifyJustExpired();

            $duration = $startTime->diffInSeconds(now());

            $this->info("✅ Vérification expirations terminée");
            $this->table(['Action', 'Nombre'], [
                ['Fonctionnalités expirées marquées', $stats['expired_marked']],
                ['Rappels 7 jours', $stats['reminders_7d']],
                ['Rappels 3 jours', $stats['reminders_3d']],
                ['Rappels 1 jour', $stats['reminders_1d']],
                ['Notifications expiration', $stats['expired_notifications']],
                ['Emails envoyés', $stats['emails_sent']],
                ['Durée', "{$duration}s"]
            ]);

            Log::info("✅ Vérification expirations terminée", [
                'stats' => $stats,
                'duration_seconds' => $duration,
                'date' => now()->toDateString()
            ]);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ Erreur lors de la vérification: {$e->getMessage()}");

            Log::error("❌ Erreur vérification expirations", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return Command::FAILURE;
        }
    }

    /**
     * ✅ MARQUER LES FONCTIONNALITÉS EXPIRÉES
     */
    private function markExpiredFeatures(): int
    {
        $this->line("🔍 Recherche des fonctionnalités expirées...");

        $query = UserFeatureAccess::where('status', 'active')
            ->where('expires_at', '<=', now())
            ->whereNotNull('expires_at');

        // Filtrer par utilisateur si spécifié
        if ($this->option('user')) {
            $query->where('user_id', $this->option('user'));
        }

        $expiredCount = $query->update([
            'status' => 'expired',
            'user_activated' => false
        ]);

        if ($expiredCount > 0) {
            $this->warn("⏰ {$expiredCount} fonctionnalités marquées comme expirées");

            Log::info("⏰ Fonctionnalités marquées comme expirées", [
                'count' => $expiredCount,
                'date' => now()->toDateString()
            ]);
        } else {
            $this->line("✅ Aucune fonctionnalité expirée trouvée");
        }

        return $expiredCount;
    }

    /**
     * ✅ ENVOYER RAPPELS D'EXPIRATION
     */
    private function sendExpirationReminders(int $daysBeforeExpiry): int
    {
        $this->line("📢 Envoi rappels {$daysBeforeExpiry} jours avant expiration...");

        $targetDate = now()->addDays($daysBeforeExpiry)->startOfDay();
        $endDate = $targetDate->copy()->endOfDay();

        $query = UserFeatureAccess::with(['user', 'feature'])
            ->where('status', 'active')
            ->where('user_activated', true)
            ->whereBetween('expires_at', [$targetDate, $endDate]);

        // Filtrer par utilisateur si spécifié
        if ($this->option('user')) {
            $query->where('user_id', $this->option('user'));
        }

        $expiringFeatures = $query->get();

        $notificationsSent = 0;

        foreach ($expiringFeatures as $access) {
            // Vérifier si notification déjà envoyée aujourd'hui
            if ($this->hasReminderBeenSent($access, $daysBeforeExpiry)) {
                continue;
            }

            // Créer notification in-app
            $this->createExpirationNotification($access, $daysBeforeExpiry);

            // Envoyer email si demandé
            if ($this->option('send-notifications')) {
                $this->sendExpirationEmail($access, $daysBeforeExpiry);
            }

            $notificationsSent++;

            Log::info("📢 Rappel expiration envoyé", [
                'user_id' => $access->user_id,
                'feature_key' => $access->feature->key,
                'days_before_expiry' => $daysBeforeExpiry,
                'expires_at' => $access->expires_at->toISOString()
            ]);
        }

        if ($notificationsSent > 0) {
            $this->info("📧 {$notificationsSent} rappels {$daysBeforeExpiry}j envoyés");
        }

        return $notificationsSent;
    }

    /**
     * ✅ NOTIFIER LES FONCTIONNALITÉS QUI VIENNENT D'EXPIRER
     */
    private function notifyJustExpired(): int
    {
        $this->line("💔 Notification fonctionnalités expirées aujourd'hui...");

        $query = UserFeatureAccess::with(['user', 'feature'])
            ->where('status', 'expired')
            ->whereDate('expires_at', today());

        // Filtrer par utilisateur si spécifié
        if ($this->option('user')) {
            $query->where('user_id', $this->option('user'));
        }

        $expiredToday = $query->get();

        $notificationsSent = 0;

        foreach ($expiredToday as $access) {
            // Vérifier si notification déjà envoyée
            if ($this->hasExpiredNotificationBeenSent($access)) {
                continue;
            }

            // Créer notification expiration
            $this->createExpiredNotification($access);

            // Envoyer email si demandé
            if ($this->option('send-notifications')) {
                $this->sendExpiredEmail($access);
            }

            $notificationsSent++;

            Log::info("💔 Notification expiration envoyée", [
                'user_id' => $access->user_id,
                'feature_key' => $access->feature->key,
                'expired_at' => $access->expires_at->toISOString()
            ]);
        }

        if ($notificationsSent > 0) {
            $this->error("💔 {$notificationsSent} notifications d'expiration envoyées");
        }

        return $notificationsSent;
    }

    /**
     * ✅ CRÉER NOTIFICATION D'EXPIRATION
     */
    private function createExpirationNotification(UserFeatureAccess $access, int $daysRemaining): void
    {
        $messages = [
            7 => "Votre fonctionnalité {$access->feature->name} expire dans 7 jours. Pensez à renouveler votre accès !",
            3 => "⚠️ Votre fonctionnalité {$access->feature->name} expire dans 3 jours. Renouvelez maintenant pour éviter l'interruption.",
            1 => "🚨 URGENT: Votre fonctionnalité {$access->feature->name} expire demain ! Renouvelez immédiatement."
        ];

        $priorities = [7 => 'normal', 3 => 'high', 1 => 'urgent'];

        Notification::create([
            'user_id' => $access->user_id,
            'type' => 'feature_expiring',
            'priority' => $priorities[$daysRemaining],
            'status' => 'unread',
            'title' => "Expiration dans {$daysRemaining} jour" . ($daysRemaining > 1 ? 's' : ''),
            'message' => $messages[$daysRemaining],
            'data' => [
                'feature_id' => $access->feature_id,
                'feature_key' => $access->feature->key,
                'feature_name' => $access->feature->name,
                'expires_at' => $access->expires_at->toISOString(),
                'days_remaining' => $daysRemaining,
                'can_renew' => true,
                'reminder_type' => "{$daysRemaining}_days_before"
            ],
            'href' => "/features",
            'category' => 'feature_expiration',
            'tags' => ['feature', 'expiration', 'reminder', $access->feature->key],
            'show_badge' => true,
        ]);
    }

    /**
     * ✅ CRÉER NOTIFICATION EXPIRÉE
     */
    private function createExpiredNotification(UserFeatureAccess $access): void
    {
        Notification::create([
            'user_id' => $access->user_id,
            'type' => 'feature_expired',
            'priority' => 'urgent',
            'status' => 'unread',
            'title' => 'Fonctionnalité expirée',
            'message' => "Votre fonctionnalité {$access->feature->name} a expiré. Renouvelez votre accès pour continuer à l'utiliser.",
            'data' => [
                'feature_id' => $access->feature_id,
                'feature_key' => $access->feature->key,
                'feature_name' => $access->feature->name,
                'expired_at' => $access->expires_at->toISOString(),
                'can_renew' => true,
                'notification_type' => 'expired'
            ],
            'href' => "/features",
            'category' => 'feature_expiration',
            'tags' => ['feature', 'expired', $access->feature->key],
            'show_badge' => true,
        ]);
    }

    /**
     * ✅ ENVOYER EMAIL D'EXPIRATION
     */
    private function sendExpirationEmail(UserFeatureAccess $access, int $daysRemaining): void
    {
        try {
            $user = $access->user;
            $feature = $access->feature;

            $subjects = [
                7 => "Votre fonctionnalité {$feature->name} expire dans 7 jours",
                3 => "⚠️ Votre fonctionnalité {$feature->name} expire dans 3 jours",
                1 => "🚨 URGENT: Votre fonctionnalité {$feature->name} expire demain !"
            ];

            $subject = $subjects[$daysRemaining];

            $emailContent = "Bonjour {$user->name},

Votre fonctionnalité {$feature->name} expire dans {$daysRemaining} jour" . ($daysRemaining > 1 ? 's' : '') . ".

DÉTAILS DE L'EXPIRATION
-----------------------------------------
Fonctionnalité : {$feature->name}
Date d'expiration : " . $access->expires_at->format('d/m/Y à H:i') . "
Jours restants : {$daysRemaining}

RENOUVELER VOTRE ACCÈS
-----------------------------------------
Pour continuer à utiliser cette fonctionnalité, renouvelez votre accès dès maintenant :

👉 " . config('app.frontend_url') . "/features

POURQUOI RENOUVELER ?
-----------------------------------------
• Continuez à profiter de toutes les fonctionnalités
• Évitez l'interruption de vos projets en cours
• Conservez vos données et paramètres

BESOIN D'AIDE ?
-----------------------------------------
Notre équipe support est à votre disposition :
• Support : " . config('app.frontend_url') . "/dashboard/tickets

Cordialement,
L'équipe PixelRise
" . config('app.frontend_url');

            Mail::raw($emailContent, function ($message) use ($user, $subject) {
                $message->to($user->email)
                        ->subject($subject);
            });

            Log::info('📧 Email rappel expiration envoyé', [
                'user_id' => $user->id,
                'feature_key' => $access->feature->key,
                'days_remaining' => $daysRemaining
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur envoi email rappel', [
                'user_id' => $access->user_id,
                'feature_key' => $access->feature->key,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ ENVOYER EMAIL FONCTIONNALITÉ EXPIRÉE
     */
    private function sendExpiredEmail(UserFeatureAccess $access): void
    {
        try {
            $user = $access->user;
            $feature = $access->feature;

            $subject = "💔 Votre fonctionnalité {$feature->name} a expiré";

            $emailContent = "Bonjour {$user->name},

Votre fonctionnalité {$feature->name} a expiré aujourd'hui.

STATUT ACTUEL
-----------------------------------------
Fonctionnalité : {$feature->name}
Date d'expiration : " . $access->expires_at->format('d/m/Y à H:i') . "
Statut : Expirée

RENOUVELER IMMÉDIATEMENT
-----------------------------------------
Renouvelez votre accès pour reprendre l'utilisation :

👉 " . config('app.frontend_url') . "/features

QUE SE PASSE-T-IL MAINTENANT ?
-----------------------------------------
• Accès à la fonctionnalité suspendu
• Vos données sont conservées
• Renouvellement possible à tout moment

RENOUVELER MAINTENANT
-----------------------------------------
• Accès immédiat après renouvellement
• Toutes vos données restaurées
• Prix : {$feature->price}€ pour 30 jours

Cordialement,
L'équipe PixelRise
" . config('app.frontend_url');

            Mail::raw($emailContent, function ($message) use ($user, $subject) {
                $message->to($user->email)
                        ->subject($subject);
            });

            Log::info('💔 Email expiration envoyé', [
                'user_id' => $user->id,
                'feature_key' => $access->feature->key
            ]);

        } catch (\Exception $e) {
            Log::error('❌ Erreur envoi email expiration', [
                'user_id' => $access->user_id,
                'feature_key' => $access->feature->key,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ VÉRIFIER SI RAPPEL DÉJÀ ENVOYÉ
     */
    private function hasReminderBeenSent(UserFeatureAccess $access, int $daysRemaining): bool
    {
        return Notification::where('user_id', $access->user_id)
            ->where('type', 'feature_expiring')
            ->whereJsonContains('data->feature_id', $access->feature_id)
            ->whereJsonContains('data->reminder_type', "{$daysRemaining}_days_before")
            ->whereDate('created_at', today())
            ->exists();
    }

    /**
     * ✅ VÉRIFIER SI NOTIFICATION EXPIRATION DÉJÀ ENVOYÉE
     */
    private function hasExpiredNotificationBeenSent(UserFeatureAccess $access): bool
    {
        return Notification::where('user_id', $access->user_id)
            ->where('type', 'feature_expired')
            ->whereJsonContains('data->feature_id', $access->feature_id)
            ->whereDate('created_at', today())
            ->exists();
    }
}
