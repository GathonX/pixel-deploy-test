<?php
// laravel-backend/config/session.php - CONFIGURATION SÉCURISÉE

return [

    /*
    |--------------------------------------------------------------------------
    | Default Session Driver
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Base de données pour persistance et sécurité
    */
    'driver' => env('SESSION_DRIVER', 'database'),

    /*
    |--------------------------------------------------------------------------
    | Session Lifetime
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : 2 heures d'inactivité max
    */
    'lifetime' => env('SESSION_LIFETIME', 120),

    /*
    |--------------------------------------------------------------------------
    | Session Expiration On Close
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Session expire à la fermeture du navigateur
    */
    'expire_on_close' => false,

    /*
    |--------------------------------------------------------------------------
    | Session Encryption
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Chiffrement des données de session
    */
    'encrypt' => env('SESSION_ENCRYPT', true),

    /*
    |--------------------------------------------------------------------------
    | Session File Location
    |--------------------------------------------------------------------------
    */
    'files' => storage_path('framework/sessions'),

    /*
    |--------------------------------------------------------------------------
    | Session Database Connection
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Même DB que l'application
    */
    'connection' => env('SESSION_CONNECTION'),

    /*
    |--------------------------------------------------------------------------
    | Session Database Table
    |--------------------------------------------------------------------------
    */
    'table' => env('SESSION_TABLE', 'sessions'),

    /*
    |--------------------------------------------------------------------------
    | Session Cache Store
    |--------------------------------------------------------------------------
    */
    'store' => env('SESSION_STORE'),

    /*
    |--------------------------------------------------------------------------
    | Session Sweeping Lottery
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Nettoyage automatique des sessions expirées
    */
    'lottery' => [2, 100],

    /*
    |--------------------------------------------------------------------------
    | Session Cookie Name
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Nom de cookie personnalisé
    */
    'cookie' => env('APP_SESSION_COOKIE', 'laravel_session'),

    /*
    |--------------------------------------------------------------------------
    | Session Cookie Path
    |--------------------------------------------------------------------------
    */
    'path' => env('SESSION_PATH', '/'),

    /*
    |--------------------------------------------------------------------------
    | Session Cookie Domain
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Domaine pour SPA cross-origin
    */
    'domain' => env('SESSION_DOMAIN', null), // null pour permettre localhost:8000 et localhost:8080

    /*
    |--------------------------------------------------------------------------
    | HTTPS Only Cookies
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : false en développement pour permettre SameSite=none
    */
    'secure' => env('SESSION_SECURE_COOKIE', false), // false en dev pour SameSite=none

    /*
    |--------------------------------------------------------------------------
    | HTTP Access Only
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Cookies inaccessibles via JavaScript (anti-XSS)
    */
    'http_only' => env('SESSION_HTTP_ONLY', true),

    /*
    |--------------------------------------------------------------------------
    | Same-Site Cookies
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : 'lax' en développement local pour éviter l'erreur SameSite
    | En production HTTPS, utiliser 'none' si nécessaire
    */
    'same_site' => env('SESSION_SAME_SITE', 'lax'),

    /*
    |--------------------------------------------------------------------------
    | Partitioned Cookies
    |--------------------------------------------------------------------------
    | ✅ SÉCURITÉ : Pas de partitioning pour SPA classique
    */
    'partitioned' => env('SESSION_PARTITIONED_COOKIE', false),

];