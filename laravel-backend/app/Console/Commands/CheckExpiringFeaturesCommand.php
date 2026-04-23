<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\UserFeatureAccess;
use App\Models\Notification;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CheckExpiringFeaturesCommand extends Command
{
    protected $signature = 'features:check-expiring';
    protected $description = 'Vérifier les fonctionnalités qui expirent bientôt et envoyer alertes';

    public function handle()
    {
        $this->info('🔍 Vérification des fonctionnalités en cours d\'expiration...');

        $now = now();

        // Définir les seuils d'alerte (7 jours et 1 jour seulement)
        $alerts = [
            '7_days' => $now->copy()->addDays(7),
            '1_day' => $now->copy()->addDays(1),
            'expired' => $now,
        ];

        $stats = [
            '7_days' => 0,
            '1_day' => 0,
            'expired' => 0,
        ];

        // Récupérer les fonctionnalités qui expirent dans les 7 prochains jours
        // OU qui viennent d'expirer (dernières 24h seulement)
        // Les fonctionnalités expirées depuis plus longtemps sont gérées par SendExpirationRemindersCommand
        $activeFeatures = UserFeatureAccess::with(['user', 'feature'])
            ->where('admin_enabled', true)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', $now->copy()->subDay())
            ->where('expires_at', '<=', $now->copy()->addDays(7))
            ->get();

        foreach ($activeFeatures as $access) {
            $expiresAt = $access->expires_at;
            $daysUntilExpiry = $now->diffInDays($expiresAt, false);

            // 🔴 EXPIRÉ (aujourd'hui ou dans le passé)
            if ($expiresAt->isPast()) {
                if (!$this->checkIfAlertSent($access->user_id, $access->feature_id, 'expired')) {
                    $this->sendExpiredAlert($access);
                    $stats['expired']++;
                }
            }
            // 🔴 EXPIRE DANS 1 JOUR
            elseif ($daysUntilExpiry <= 1 && $daysUntilExpiry >= 0) {
                if (!$this->checkIfAlertSent($access->user_id, $access->feature_id, '1_day')) {
                    $this->sendUrgentAlert($access, 1);
                    $stats['1_day']++;
                }
            }
            // 🟡 EXPIRE DANS 7 JOURS (1 seule alerte pour toute la période)
            elseif ($daysUntilExpiry <= 7 && $daysUntilExpiry > 1) {
                if (!$this->checkIfAlertSent($access->user_id, $access->feature_id, '7_days')) {
                    $this->sendInfoAlert($access, (int) round($daysUntilExpiry));
                    $stats['7_days']++;
                }
            }
        }

        $this->info("✅ Vérification terminée :");
        $this->info("   - 7 jours : {$stats['7_days']} alertes envoyées");
        $this->info("   - 1 jour : {$stats['1_day']} alertes envoyées");
        $this->info("   - Expirées : {$stats['expired']} alertes envoyées");

        Log::info('✅ [CheckExpiringFeatures] Vérification terminée', $stats);

        return 0;
    }

    /**
     * Vérifier si une alerte a déjà été envoyée (via notifications en DB, résistant au cache:clear)
     * - Alerte 7 jours : 1 seule fois pour toute la période 7j→2j
     * - Alerte 1 jour : 1 seule fois
     * - Alerte expirée : 1 seule fois par semaine
     */
    private function checkIfAlertSent(int $userId, int $featureId, string $alertType): bool
    {
        // Mapping type d'alerte → type notification + période de vérification
        $config = [
            '7_days' => ['notification_type' => 'feature_expiring_soon', 'lookback_days' => 7],
            '1_day'  => ['notification_type' => 'feature_expiring_urgent', 'lookback_days' => 1],
            'expired' => ['notification_type' => 'feature_expired', 'lookback_days' => 7],
        ];

        $alertConfig = $config[$alertType] ?? $config['7_days'];

        // Vérifier dans les notifications en DB (résistant au cache:clear du dimanche)
        $alreadySent = Notification::where('user_id', $userId)
            ->where('type', $alertConfig['notification_type'])
            ->where('created_at', '>=', now()->subDays($alertConfig['lookback_days']))
            ->whereJsonContains('data->feature_id', $featureId)
            ->exists();

        return $alreadySent;
    }

    /**
     * 🟡 ALERTE : Expire dans 7 jours
     */
    private function sendInfoAlert(UserFeatureAccess $access, int $days)
    {
        $user = $access->user;
        $feature = $access->feature;

        // Notification système
        Notification::create([
            'user_id' => $user->id,
            'type' => 'feature_expiring_soon',
            'priority' => 'normal',
            'status' => 'unread',
            'title' => "⏰ {$feature->name} expire dans {$days} jours",
            'message' => "Votre accès à {$feature->name} expire le {$access->expires_at->format('d/m/Y à H:i')}. Pensez à renouveler !",
            'data' => [
                'feature_id' => $feature->id,
                'feature_key' => $feature->key,
                'feature_name' => $feature->name,
                'expires_at' => $access->expires_at->toISOString(),
                'days_remaining' => $days,
                'access_id' => $access->id,
            ],
            'href' => "/features/purchase/{$feature->id}",
            'category' => 'expiration',
            'tags' => ['expiration', 'info', $feature->key],
            'show_badge' => true,
        ]);

        // Email
        $this->sendEmail($user, $feature, $access, $days, 'info');

        Log::info("📧 [7j] Alerte envoyée", [
            'user_id' => $user->id,
            'feature' => $feature->name,
            'expires_at' => $access->expires_at,
        ]);
    }

    /**
     * 🔴 ALERTE URGENTE : Expire dans 1 jour
     */
    private function sendUrgentAlert(UserFeatureAccess $access, int $days)
    {
        $user = $access->user;
        $feature = $access->feature;

        Notification::create([
            'user_id' => $user->id,
            'type' => 'feature_expiring_urgent',
            'priority' => 'urgent',
            'status' => 'unread',
            'title' => "🚨 URGENT : {$feature->name} expire demain !",
            'message' => "URGENT ! Votre accès à {$feature->name} expire demain ({$access->expires_at->format('d/m/Y à H:i')}). Renouvelez immédiatement !",
            'data' => [
                'feature_id' => $feature->id,
                'feature_key' => $feature->key,
                'feature_name' => $feature->name,
                'expires_at' => $access->expires_at->toISOString(),
                'days_remaining' => $days,
                'access_id' => $access->id,
            ],
            'href' => "/features/purchase/{$feature->id}",
            'category' => 'expiration',
            'tags' => ['expiration', 'urgent', $feature->key],
            'show_badge' => true,
        ]);

        $this->sendEmail($user, $feature, $access, $days, 'urgent');

        Log::info("📧 [1j] Alerte URGENTE envoyée", [
            'user_id' => $user->id,
            'feature' => $feature->name,
            'expires_at' => $access->expires_at,
        ]);
    }

    /**
     * 🔴 ALERTE : Fonctionnalité expirée
     */
    private function sendExpiredAlert(UserFeatureAccess $access)
    {
        $user = $access->user;
        $feature = $access->feature;

        Notification::create([
            'user_id' => $user->id,
            'type' => 'feature_expired',
            'priority' => 'urgent',
            'status' => 'unread',
            'title' => "❌ {$feature->name} a expiré",
            'message' => "Votre accès à {$feature->name} a expiré le {$access->expires_at->format('d/m/Y à H:i')}. Renouvelez pour continuer à utiliser cette fonctionnalité.",
            'data' => [
                'feature_id' => $feature->id,
                'feature_key' => $feature->key,
                'feature_name' => $feature->name,
                'expired_at' => $access->expires_at->toISOString(),
                'access_id' => $access->id,
            ],
            'href' => "/features/purchase/{$feature->id}",
            'category' => 'expiration',
            'tags' => ['expiration', 'expired', $feature->key],
            'show_badge' => true,
        ]);

        $this->sendEmail($user, $feature, $access, 0, 'expired');

        Log::info("📧 [EXPIRÉ] Alerte envoyée", [
            'user_id' => $user->id,
            'feature' => $feature->name,
            'expired_at' => $access->expires_at,
        ]);
    }

    /**
     * Envoyer l'email d'alerte
     */
    private function sendEmail($user, $feature, $access, $days, $type)
    {
        try {
            $expiryDate = $access->expires_at->format('d/m/Y à H:i');
            $periodLabel = $access->getPeriodLabel();

            $subjects = [
                'info' => "⏰ {$feature->name} expire dans {$days} jours",
                'urgent' => "🚨 URGENT : {$feature->name} expire demain !",
                'expired' => "❌ Votre accès à {$feature->name} a expiré",
            ];

            $messages = [
                'info' => "Bonjour {$user->name},\n\nVotre accès à la fonctionnalité {$feature->name} expire dans {$days} jours ({$expiryDate}).\n\nPensez à renouveler votre accès pour continuer à profiter de cette fonctionnalité.",
                'urgent' => "Bonjour {$user->name},\n\n🚨 URGENT : Votre accès à {$feature->name} expire DEMAIN ({$expiryDate}) !\n\nRenouvelez IMMÉDIATEMENT pour ne pas perdre l'accès à cette fonctionnalité.",
                'expired' => "Bonjour {$user->name},\n\n❌ Votre accès à {$feature->name} a expiré le {$expiryDate}.\n\nVous ne pouvez plus utiliser cette fonctionnalité. Renouvelez votre accès dès maintenant pour la réactiver.",
            ];

            $subject = $subjects[$type];
            $message = $messages[$type];

            $emailContent = $message . "\n\n";
            $emailContent .= "DÉTAILS DE VOTRE ACCÈS\n";
            $emailContent .= "-----------------------------------------\n";
            $emailContent .= "Fonctionnalité : {$feature->name}\n";
            $emailContent .= "Formule : " . ($access->billing_period === 'yearly' ? 'Annuelle' : 'Mensuelle') . "\n";
            $emailContent .= "Prix : {$feature->price}€/{$periodLabel}\n";

            if ($type !== 'expired') {
                $emailContent .= "Date d'expiration : {$expiryDate}\n";
                $emailContent .= "Jours restants : {$days}\n";
            } else {
                $emailContent .= "Date d'expiration : {$expiryDate} (expiré)\n";
            }

            $emailContent .= "\n";
            $emailContent .= "RENOUVELER MAINTENANT\n";
            $emailContent .= "-----------------------------------------\n";
            $emailContent .= "Lien de renouvellement : " . config('app.frontend_url') . "/features/purchase/{$feature->id}\n";
            $emailContent .= "\n";
            $emailContent .= "Cordialement,\n";
            $emailContent .= "L'équipe PixelRise\n";
            $emailContent .= config('app.frontend_url');

            Mail::raw($emailContent, function ($mail) use ($user, $subject) {
                $mail->to($user->email)
                     ->subject($subject);
            });

            Log::info("✉️ Email d'expiration envoyé", [
                'user_email' => $user->email,
                'type' => $type,
                'feature' => $feature->name,
            ]);

        } catch (\Exception $e) {
            Log::error("❌ Erreur envoi email expiration", [
                'user_id' => $user->id,
                'feature' => $feature->name,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
