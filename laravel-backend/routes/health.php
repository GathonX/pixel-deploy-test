<?php

// laravel-backend/routes/health.php - ROUTES DE SANTÉ ET DIAGNOSTIC

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

/*
|--------------------------------------------------------------------------
| Health Check Routes
|--------------------------------------------------------------------------
|
| ✅ Routes pour vérifier l'état du système
| ✅ Diagnostic des services et composants
| ✅ Monitoring et surveillance
|
*/

// ===== ROUTE DE SANTÉ PRINCIPALE =====

/**
 * ✅ SANTÉ GLOBALE DU SYSTÈME
 * Endpoint principal pour vérifier que l'API fonctionne
 */
Route::get('/health', function () {
    try {
        // Test connexion base de données
        $dbConnected = false;
        $dbError = null;
        try {
            DB::connection()->getPdo();
            $dbConnected = true;
        } catch (\Exception $e) {
            $dbError = $e->getMessage();
        }

        // Test cache
        $cacheWorking = false;
        try {
            Cache::put('health_check', 'ok', 10);
            $cacheWorking = Cache::get('health_check') === 'ok';
            Cache::forget('health_check');
        } catch (\Exception $e) {
            // Cache pas disponible
        }

        // Informations système
        $health = [
            'status' => 'ok',
            'timestamp' => now()->toISOString(),
            'environment' => app()->environment(),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            '
abase' => [
                'connected' => $dbConnected,
                'error' => $dbError,
            ],
            'cache' => [
                'working' => $cacheWorking,
                'driver' => config('cache.default'),
            ],
            'services' => [
                
                'openai' => [
                    'configured' => !empty(config('services.openai.api_key')),
                ],
                'mail' => [
                    'configured' => !empty(config('mail.mailers.smtp.host')),
                    'driver' => config('mail.default'),
                ],
            ],
            'modules' => [
                'auth' => 'active',
                'profile' => 'active',
                'business_plan' => 'active',
                'projects' => 'active',
                'sprints' => 'active',
                'chat_assistant' => 'active',
                'schedule' => 'active',
                'admin' => 'active',
                'tickets' => 'active',
                'blog_posts' => 'active',
                'tracking' => 'active',
                
            ],
        ];

        // Déterminer le statut global
        $isHealthy = $dbConnected && 
                    !empty(config('app.key')) &&
                    file_exists(storage_path('logs'));

        return response()->json($health, $isHealthy ? 200 : 503);

    } catch (\Exception $e) {
        return response()->json([
            'status' => 'error',
            'message' => 'Health check failed',
            'error' => $e->getMessage(),
            'timestamp' => now()->toISOString(),
        ], 500);
    }
})->name('api.health');

// ===== ROUTE DE SANTÉ AUTHENTIFICATION =====

/**
 * ✅ VÉRIFICATION ÉTAT AUTHENTIFICATION
 * Teste si l'utilisateur est connecté
 */
Route::get('/auth/check', function () {
    try {
        if (auth()->check()) {
            $user = auth()->user();
            return response()->json([
                'authenticated' => true,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->is_admin ? 'admin' : 'user',
                ],
                'session_active' => true,
                'timestamp' => now()->toISOString(),
            ]);
        }
        
        return response()->json([
            'authenticated' => false,
            'session_active' => false,
            'timestamp' => now()->toISOString(),
        ], 401);

    } catch (\Exception $e) {
        return response()->json([
            'authenticated' => false,
            'error' => 'Auth check failed',
            'message' => $e->getMessage(),
            'timestamp' => now()->toISOString(),
        ], 500);
    }
})->name('api.auth.check');

// ===== ROUTES DE DIAGNOSTIC AVANCÉ (DÉVELOPPEMENT) =====

if (app()->environment(['local', 'testing', 'development'])) {
    
    /**
     * ✅ DIAGNOSTIC COMPLET DU SYSTÈME
     * Informations détaillées pour debugging
     */
    Route::get('/health/detailed', function () {
        try {
            $detailed = [
                'system' => [
                    'php_version' => PHP_VERSION,
                    'laravel_version' => app()->version(),
                    'environment' => app()->environment(),
                    'debug_mode' => config('app.debug'),
                    'timezone' => config('app.timezone'),
                    'locale' => config('app.locale'),
                    'memory_limit' => ini_get('memory_limit'),
                    'max_execution_time' => ini_get('max_execution_time'),
                ],
                'database' => [
                    'default_connection' => config('database.default'),
                    'connections' => collect(config('database.connections'))->keys(),
                    'migrations_table_exists' => Schema::hasTable('migrations'),
                ],
                'storage' => [
                    'logs_writable' => is_writable(storage_path('logs')),
                    'cache_writable' => is_writable(storage_path('framework/cache')),
                    'sessions_writable' => is_writable(storage_path('framework/sessions')),
                    'disk_space' => disk_free_space('/') / 1024 / 1024 / 1024, // GB
                ],
                'configuration' => [
                    'app_url' => config('app.url'),
                    'app_key_set' => !empty(config('app.key')),
                    'queue_driver' => config('queue.default'),
                    'cache_driver' => config('cache.default'),
                    'session_driver' => config('session.driver'),
                    'mail_driver' => config('mail.default'),
                ],
                
                'services' => [
                    'openai_key_set' => !empty(config('services.openai.api_key')),
                    'openai_key_length' => strlen(config('services.openai.api_key', '')),
                ],
                'routes' => [
                    'total_routes' => count(Route::getRoutes()),
                    'api_routes' => collect(Route::getRoutes())->filter(function ($route) {
                        return str_starts_with($route->uri(), 'api/');
                    })->count(),
                ],
                'database_tables' => [
                    'users' => Schema::hasTable('users'),
                    'subscriptions' => Schema::hasTable('subscriptions'),
                    'payments' => Schema::hasTable('payments'),
                    'payment_methods' => Schema::hasTable('payment_methods'),
                    'invoices' => Schema::hasTable('invoices'),
                ],
                'timestamp' => now()->toISOString(),
            ];

            return response()->json([
                'status' => 'detailed_health_check',
                'data' => $detailed,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Detailed health check failed',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ], 500);
        }
    })->name('api.health.detailed');

    /**
     * ✅ TEST CONNECTIVITÉ SERVICES EXTERNES
     * Test des APIs externes (, OpenAI, etc.)
     */
    Route::get('/health/services', function () {
        $services = [];
        
      

        // Test OpenAI
        try {
            if (!empty(config('services.openai.api_key'))) {
                $ch = curl_init('https://api.openai.com/v1/models');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                curl_setopt($ch, CURLOPT_NOBODY, true);
                $result = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                $services['openai'] = [
                    'reachable' => $result !== false,
                    'http_code' => $httpCode,
                    'configured' => true,
                ];
            } else {
                $services['openai'] = [
                    'reachable' => null,
                    'configured' => false,
                    'message' => 'OpenAI not configured',
                ];
            }
        } catch (\Exception $e) {
            $services['openai'] = [
                'reachable' => false,
                'configured' => !empty(config('services.openai.api_key')),
                'error' => $e->getMessage(),
            ];
        }

        return response()->json([
            'status' => 'services_check',
            'services' => $services,
            'timestamp' => now()->toISOString(),
        ]);
    })->name('api.health.services');

    /**
     * ✅ NETTOYAGE CACHE ET CONFIGURATION
     * Outil de maintenance rapide
     */
    Route::post('/health/maintenance', function () {
        try {
            // Nettoyer les caches
            \Artisan::call('cache:clear');
            \Artisan::call('config:clear');
            \Artisan::call('route:clear');
            \Artisan::call('view:clear');

            return response()->json([
                'status' => 'maintenance_completed',
                'actions' => [
                    'cache_cleared' => true,
                    'config_cleared' => true,
                    'routes_cleared' => true,
                    'views_cleared' => true,
                ],
                'timestamp' => now()->toISOString(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'maintenance_failed',
                'error' => $e->getMessage(),
                'timestamp' => now()->toISOString(),
            ], 500);
        }
    })->name('api.health.maintenance');
}