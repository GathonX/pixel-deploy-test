<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\OpenAI\OpenAIService;
use App\Services\OpenAI\SprintGenerationService;

class OpenAIServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->singleton(OpenAIService::class, function ($app) {
            return new OpenAIService();
        });

        $this->app->singleton(SprintGenerationService::class, function ($app) {
            return new SprintGenerationService();
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
