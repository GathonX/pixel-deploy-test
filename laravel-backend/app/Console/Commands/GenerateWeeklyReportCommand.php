<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use App\Models\User;
use App\Models\UserFeatureAccess;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class GenerateWeeklyReportCommand extends Command
{
    protected $signature = 'reports:weekly';

    protected $description = 'Génère et envoie le rapport hebdomadaire';

    public function handle()
    {
        $this->info('📊 Génération rapport hebdomadaire...');

        try {
            $startOfWeek = now()->startOfWeek();
            $endOfWeek = now()->endOfWeek();
            $week = now()->format('Y-W');

            $stats = [
                'week' => $week,
                'blog_posts' => BlogPost::where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                    ->count(),
                'social_posts' => SocialMediaPost::where('is_ai_generated', true)
                    ->whereBetween('created_at', [$startOfWeek, $endOfWeek])
                    ->count(),
                'active_users' => User::whereHas('featureAccess', function ($query) {
                    $query->where('admin_enabled', true)
                        ->where('user_activated', true)
                        ->where('status', 'active')
                        ->where(function($q) {
                            $q->whereNull('expires_at')
                              ->orWhere('expires_at', '>', now());
                        });
                })->count(),
                'users_with_posts' => User::whereHas('blogPosts', function ($query) use ($startOfWeek, $endOfWeek) {
                    $query->where('is_ai_generated', true)
                        ->whereBetween('created_at', [$startOfWeek, $endOfWeek]);
                })->orWhereHas('socialMediaPosts', function ($query) use ($startOfWeek, $endOfWeek) {
                    $query->where('is_ai_generated', true)
                        ->whereBetween('created_at', [$startOfWeek, $endOfWeek]);
                })->count(),
                'features_expired_this_week' => UserFeatureAccess::where('status', 'expired')
                    ->whereBetween('expires_at', [$startOfWeek, $endOfWeek])
                    ->count(),
                'features_expiring_next_week' => UserFeatureAccess::where('status', 'active')
                    ->whereBetween('expires_at', [now()->addWeek()->startOfWeek(), now()->addWeek()->endOfWeek()])
                    ->count(),
            ];

            $this->info("📝 Posts blog: {$stats['blog_posts']}");
            $this->info("📱 Posts sociaux: {$stats['social_posts']}");
            $this->info("👥 Utilisateurs actifs: {$stats['active_users']}");

            Log::info("📊 Rapport hebdomadaire avec expiration", $stats);

            if (env('WEEKLY_REPORTS_ENABLED', true)) {
                $this->sendWeeklyReportEmail($stats);
                $this->info('📧 Email envoyé');
            }

            $this->info('✅ Rapport généré');
            return 0;

        } catch (\Exception $e) {
            $this->error("❌ Erreur: {$e->getMessage()}");
            Log::error("❌ Erreur génération rapport hebdomadaire", ['error' => $e->getMessage()]);
            return 1;
        }
    }

    private function sendWeeklyReportEmail(array $stats)
    {
        $adminEmail = env('MAIL_ADMIN_EMAIL', 'admin@pixelrise.com');
        $subject = "📊 Rapport PixelRise - Semaine {$stats['week']}";

        $content = "RAPPORT HEBDOMADAIRE PIXELRISE

Semaine : {$stats['week']}
Période : " . now()->startOfWeek()->format('d/m/Y') . " - " . now()->endOfWeek()->format('d/m/Y') . "

STATISTIQUES DE GÉNÉRATION
─────────────────────────────────────────────────
📝 Articles de blog générés : {$stats['blog_posts']}
📱 Posts sociaux générés : {$stats['social_posts']}
📊 Total posts : " . ($stats['blog_posts'] + $stats['social_posts']) . "

UTILISATEURS
─────────────────────────────────────────────────
👥 Utilisateurs actifs : {$stats['active_users']}
✅ Utilisateurs avec posts : {$stats['users_with_posts']}
📈 Taux de génération : " . round(($stats['users_with_posts'] / max($stats['active_users'], 1)) * 100, 1) . "%

GESTION DES EXPIRATIONS
─────────────────────────────────────────────────
💔 Fonctionnalités expirées cette semaine : {$stats['features_expired_this_week']}
⚠️  Expirent la semaine prochaine : {$stats['features_expiring_next_week']}

Date du rapport : " . now()->format('d/m/Y à H:i:s') . "

--
Système automatique PixelRise";

        Mail::raw($content, function ($message) use ($adminEmail, $subject) {
            $message->to($adminEmail)->subject($subject);
        });

        Log::info("📧 Rapport hebdomadaire envoyé", ['email' => $adminEmail, 'week' => $stats['week']]);
    }
}
