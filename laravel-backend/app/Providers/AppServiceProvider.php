<?php

namespace App\Providers;

use App\Models\Task;
use App\Observers\TaskObserver;
use App\Models\Project;
use App\Observers\ProjectObserver;
use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ✅ CORRECTION : Forcer HTTPS en production pour éviter les erreurs de "mixed content"
        if (config('app.env') === 'production') {
            URL::forceScheme('https');
        }

        // Personnalisation de l'URL de réinitialisation de mot de passe
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')
                . "/password-reset/{$token}"
                . "?email=" . $notifiable->getEmailForPasswordReset();
        });
    }
}
