<?php
// laravel-backend/config/sanctum.php - CONFIGURATION SÉCURISÉE

use Laravel\Sanctum\Sanctum;

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Domaines autorisés pour les sessions stateful
    */
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', implode(',', [
        'localhost:8080',      // Frontend principal
        '127.0.0.1:8080',     // IPv4 local
        'localhost:8000',      // ✅ AJOUT: Backend pour tests
        '127.0.0.1:8000',     // ✅ AJOUT: IPv4 backend
        'localhost:3000',      // Dev alternatif
        '127.0.0.1:3000',     // IPv4 dev
        'localhost:5173',      // Vite par défaut
        '127.0.0.1:5173',     // IPv4 Vite
    ]))),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Sessions web uniquement pour SPA
    */
    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Pas d'expiration pour les sessions (géré par Laravel)
    */
    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Pas de tokens API pour cette config
    */
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Middleware
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Middleware complet pour sessions
    */
    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];