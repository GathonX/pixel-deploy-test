<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\UserFeatureAccess;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class GenerateMonthlyExpirationReportCommand extends Command
{
    protected $signature = 'reports:monthly-expiration';

    protected $description = 'Génère le rapport mensuel d\'expiration des fonctionnalités';

    public function handle()
    {
        $this->info('📅 Génération rapport mensuel expiration...');

        try {
            $startOfMonth = now()->startOfMonth();
            $endOfMonth = now()->endOfMonth();

            $stats = [
                'month' => now()->format('Y-m'),
                'features_expired' => UserFeatureAccess::where('status', 'expired')
                    ->whereBetween('expires_at', [$startOfMonth, $endOfMonth])
                    ->count(),
                'features_expiring_soon' => UserFeatureAccess::where('status', 'active')
                    ->whereBetween('expires_at', [now(), now()->addDays(7)])
                    ->count(),
                'renewals_this_month' => UserFeatureAccess::where('status', 'active')
                    ->whereBetween('user_activated_at', [$startOfMonth, $endOfMonth])
                    ->whereNotNull('expires_at')
                    ->count(),
                'total_active_features' => UserFeatureAccess::where('status', 'active')
                    ->count()
            ];

            $this->info("💔 Expirées: {$stats['features_expired']}");
            $this->info("⚠️  Expirent bientôt: {$stats['features_expiring_soon']}");
            $this->info("🔄 Renouvellements: {$stats['renewals_this_month']}");
            $this->info("✅ Total actives: {$stats['total_active_features']}");

            Log::info("📊 Rapport mensuel expiration", $stats);

            if (env('MONTHLY_REPORTS_ENABLED', true)) {
                $this->sendMonthlyExpirationEmail($stats);
                $this->info('📧 Email envoyé');
            }

            $this->info('✅ Rapport généré');
            return 0;

        } catch (\Exception $e) {
            $this->error("❌ Erreur: {$e->getMessage()}");
            Log::error("❌ Erreur rapport mensuel expiration", ['error' => $e->getMessage()]);
            return 1;
        }
    }

    private function sendMonthlyExpirationEmail(array $stats)
    {
        $adminEmail = env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com');
        $subject = "📅 Rapport Expirations PixelRise - " . now()->format('F Y');

        $content = "RAPPORT MENSUEL DES EXPIRATIONS

Mois : " . now()->format('F Y') . "
Période : " . now()->startOfMonth()->format('d/m/Y') . " - " . now()->endOfMonth()->format('d/m/Y') . "

STATISTIQUES D'EXPIRATION
─────────────────────────────────────────────────
💔 Fonctionnalités expirées ce mois : {$stats['features_expired']}
⚠️  Expirent dans les 7 prochains jours : {$stats['features_expiring_soon']}
🔄 Renouvellements ce mois : {$stats['renewals_this_month']}
✅ Total fonctionnalités actives : {$stats['total_active_features']}

TAUX DE RÉTENTION
─────────────────────────────────────────────────
📈 Taux de renouvellement : " . round(($stats['renewals_this_month'] / max($stats['features_expired'] + $stats['renewals_this_month'], 1)) * 100, 1) . "%

ACTIONS RECOMMANDÉES
─────────────────────────────────────────────────
• Contacter les utilisateurs avec expirations imminentes
• Analyser les raisons de non-renouvellement
• Optimiser les rappels automatiques

Date du rapport : " . now()->format('d/m/Y à H:i:s') . "

--
Système automatique PixelRise";

        Mail::raw($content, function ($message) use ($adminEmail, $subject) {
            $message->to($adminEmail)->subject($subject);
        });

        Log::info("📧 Rapport mensuel expiration envoyé", ['email' => $adminEmail, 'month' => $stats['month']]);
    }
}
