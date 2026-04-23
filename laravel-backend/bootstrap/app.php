<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {

        // ===== TRUST PROXIES (reverse proxy Nginx → Docker) =====
        $middleware->trustProxies(at: '*', headers: \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR |
            \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST |
            \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT |
            \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO |
            \Illuminate\Http\Request::HEADER_X_FORWARDED_AWS_ELB);

        // ===== MIDDLEWARES GLOBAUX =====

        // Middlewares globaux pour toutes les requêtes - CORS en priorité
        $middleware->prepend([
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        // Middlewares globaux pour le groupe WEB
        $middleware->web(append: [
            \App\Http\Middleware\LogUserAgent::class,
        ]);

        // Middlewares globaux pour le groupe API
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            \App\Http\Middleware\LogUserAgent::class,
        ]);

        // ✅ NOUVEAU : Marquer automatiquement les fonctionnalités expirées
        $middleware->api(append: [
            \App\Http\Middleware\MarkExpiredFeatures::class,
        ]);

        // ✅ AJOUT : Session pour routes d'authentification Sanctum SPA dans API
        $middleware->api(append: [
            \Illuminate\Session\Middleware\StartSession::class,
        ]);

        // Middleware de debug pour FormData (existant)
        $middleware->api(append: [
            \App\Http\Middleware\FixFormDataMiddleware::class,
            \App\Http\Middleware\LogFormDataMiddleware::class,
            'throttle:api',
        ]);

        // ===== GROUPES DE MIDDLEWARES =====

        // Groupe middleware pour génération de contenu
        $middleware->group('content-generation', [
            'auth:sanctum',
            'throttle:content-generation',
        ]);

        // Groupe middleware pour interactions
        $middleware->group('interactions', [
            'auth:sanctum',
            'throttle:interactions',
        ]);

        // Groupe middleware pour commentaires
        $middleware->group('comments', [
            'auth:sanctum',
            'throttle:comments',
        ]);

        // Groupe middleware pour vues
        $middleware->group('views', [
            'auth:sanctum',
            'throttle:views',
        ]);

        // ✅ CORRECTION : Groupe middleware pour fichiers statiques avec CORS
        $middleware->group('storage-cors', [
            \App\Http\Middleware\StorageCorsMiddleware::class,
        ]);

        // ✅ NOUVEAU : Groupe middleware pour embed avec CORS spécialisé
        $middleware->group('embed-cors', [
            \App\Http\Middleware\EmbedCors::class,
        ]);

        // ===== ALIAS DE MIDDLEWARE =====

        $middleware->alias([
            'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'feature' => \App\Http\Middleware\CheckFeatureAccess::class,
            'workspace.active' => \App\Http\Middleware\WorkspaceActiveMiddleware::class,
            'ai.plan'         => \App\Http\Middleware\CheckAiPlanMiddleware::class,
            'booking.plan'    => \App\Http\Middleware\CheckBookingPlan::class,
            'pro.feature'     => \App\Http\Middleware\CheckProSiteFeature::class,
            'content.generation' => 'content-generation',
            'content.interactions' => 'interactions',
            'content.comments' => 'comments',
            'content.views' => 'views',
            // ✅ CORRECTION : Alias direct pour le middleware de storage
            'storage.cors' => \App\Http\Middleware\StorageCorsMiddleware::class,
            // ✅ NOUVEAU : Alias pour middleware embed CORS
            'embed.cors' => \App\Http\Middleware\EmbedCors::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {

        // ===== GESTION ERREURS =====

        // Gestion des erreurs de rate limiting pour API JSON
        $exceptions->render(function (Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Trop de requêtes. Veuillez patienter.',
                    'retry_after' => $e->getHeaders()['Retry-After'] ?? 60,
                    'type' => 'rate_limit_exceeded'
                ], 429);
            }
        });

        // Gestion des erreurs de validation pour API JSON
        $exceptions->render(function (Illuminate\Validation\ValidationException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $e->errors(),
                    'type' => 'validation_error'
                ], 422);
            }
        });

        // ✅ NOUVEAU : Gestion des erreurs de fichiers pour CORS
        $exceptions->render(function (Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, Request $request) {
            // Si c'est une requête pour un fichier storage
            if ($request->is('storage/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fichier non trouvé',
                    'type' => 'file_not_found'
                ], 404)->withHeaders([
                    'Access-Control-Allow-Origin' => '*',
                    'Access-Control-Allow-Methods' => 'GET, HEAD, OPTIONS',
                    'Cross-Origin-Resource-Policy' => 'cross-origin',
                ]);
            }
        });
    })
    ->booted(function () {
        // ===== RATE LIMITING CONFIGURATION =====

       // ===== RATE LIMITING CONFIGURATION =====

// Rate limiting général API - Optimisé pour charge élevée
RateLimiter::for('api', function (Request $request) {
    return [
        Limit::perMinute(600)->by($request->user()?->id ?: $request->ip()),
        Limit::perHour(5000)->by($request->user()?->id ?: $request->ip()),
    ];
});

// ✅ NOUVEAU : Rate limiting spécifique pour endpoints publics du blog (très permissif)
RateLimiter::for('public-blog', function (Request $request) {
    return [
        Limit::perMinute(1000)->by($request->ip()),
        Limit::perHour(10000)->by($request->ip()),
    ];
});

// Rate limiting spécifique génération de contenu IA
RateLimiter::for('content-generation', function (Request $request) {
    return [
        Limit::perMinute(5)->by($request->user()?->id ?: $request->ip()),
        Limit::perHour(20)->by($request->user()?->id ?: $request->ip()),
    ];
});

// Rate limiting pour interactions (likes, commentaires) - Optimisé pour utilisateurs multiples
RateLimiter::for('interactions', function (Request $request) {
    return [
        Limit::perMinute(100)->by($request->user()?->id ?: $request->ip()),
        Limit::perHour(1000)->by($request->user()?->id ?: $request->ip()),
        Limit::perDay(5000)->by($request->user()?->id ?: $request->ip()),
    ];
});

// Rate limiting pour commentaires (plus strict)
RateLimiter::for('comments', function (Request $request) {
    return [
        Limit::perMinute(5)->by($request->user()?->id ?: $request->ip()),
        Limit::perHour(50)->by($request->user()?->id ?: $request->ip()),
    ];
});

// Rate limiting pour vues (très permissif)
RateLimiter::for('views', function (Request $request) {
    return Limit::perMinute(100)->by($request->user()?->id ?: $request->ip());
});

// ✅ CORRECTION : Rate limiting pour fichiers statiques (très permissif)
RateLimiter::for('storage', function (Request $request) {
    return [
        Limit::perMinute(200)->by($request->ip()),
        Limit::perHour(1000)->by($request->ip()), // ✅ Ajout limite horaire
    ];
});

// ✅ NOUVEAU : Rate limiting pour vérification email (COMPATIBLE MOBILE)
RateLimiter::for('email-verification', function (Request $request) {
    return [
        // Plus permissif pour les mobiles qui changent d'IP
        Limit::perMinute(10)->by($request->ip()),
        Limit::perHour(50)->by($request->ip()),
        // Limite additionnelle par User-Agent pour éviter les abus
        Limit::perMinute(3)->by($request->header('User-Agent') . '|' . $request->ip()),
    ];
});

// ✅ NOUVEAU : Rate limiters manquants pour compatibilité mobile

// Account deletion (critique - actions irréversibles)
RateLimiter::for('2,10', function (Request $request) {
    return [
        Limit::perMinute(2)->by($request->ip()),
        Limit::perHour(10)->by($request->ip()), // Buffer mobile
                                                // Protection User-Agent pour éviter abus
        Limit::perMinute(1)->by($request->header('User-Agent') . '|' . $request->ip()),
    ];
});

// Reservations quick (formulaire rapide)
RateLimiter::for('10,1', function (Request $request) {
    return [
        Limit::perMinute(10)->by($request->ip()),
        Limit::perHour(100)->by($request->ip()), // Mobile friendly
    ];
});

// Reservations standard (formulaires complets)
RateLimiter::for('5,10', function (Request $request) {
    return [
        Limit::perMinute(5)->by($request->ip()),
        Limit::perHour(30)->by($request->ip()), // Mobile friendly
                                                // Protection par User-Agent
        Limit::perMinute(3)->by($request->header('User-Agent') . '|' . $request->ip()),
    ];
});

// Reservations completion data (récupération données)
RateLimiter::for('10,5', function (Request $request) {
    return [
        Limit::perMinute(10)->by($request->ip()),
        Limit::perHour(60)->by($request->ip()), // Mobile friendly
    ];
});

// Legacy : Rate limiting par défaut pour format "X,Y" (backward compatibility)
RateLimiter::for('5,2', function (Request $request) {
    return [
        Limit::perMinute(5)->by($request->ip()),
        Limit::perHour(30)->by($request->ip()), // Mobile buffer
    ];
});
})
        ->create();

