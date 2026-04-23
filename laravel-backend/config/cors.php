<?php

// laravel-backend/config/cors.php - CORS PRODUCTION SÉCURISÉ

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    | ✅ PRODUCTION : Configuration sécurisée pour domaines réels uniquement
    */

    'paths'                    => [
        'api/*',                           // ✅ TOUTES les routes API
        'sanctum/csrf-cookie',             // ✅ Cookie CSRF Sanctum
        'user',                            // ✅ Route user spécifique
        'tracking/consent',                // ✅ Tracking consent
        'verify-email/*',                  // ✅ Vérification email web
        'account/delete-confirm/*',        // ✅ Suppression compte
        'login',                           // ✅ Login direct
        'register',                        // ✅ Register direct
        'logout',                          // ✅ Logout direct
        'forgot-password',                 // ✅ Mot de passe oublié
        'reset-password',                  // ✅ Reset password
        'email/verification-notification', // ✅ Vérification email
        'storage/*',                       // ✅ Fichiers statiques (tickets, images, etc.)
        'api/interactions/view',           // ✅ EMBED - Vue publique
        'api/interactions/embed/*',        // ✅ EMBED - Interactions publiques
        'api/embed/*',                     // ✅ EMBED - Toutes routes embed
    ],

    'allowed_methods'          => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // ✅ Méthodes explicites

    'allowed_origins'          => [
                                      // ✅ DOMAINES PRODUCTION UNIQUEMENT
        'https://app.pixel-rise.com', // Application principale
        'https://pixel-rise.com',     // Landing page
        'https://www.pixel-rise.com', // Landing page avec www

        // ✅ Variables d'environnement
        env('FRONTEND_URL', 'https://app.pixel-rise.com'),
        env('LANDING_URL', 'https://pixel-rise.com'),

        // ✅ DÉVELOPPEMENT (seulement si APP_ENV=local)
         ...(env('APP_ENV') === 'local' ? [
            'http://localhost:8080',
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:8080',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
            'https://localhost:8080',
            'https://localhost:3000',
            'https://localhost:5173',
            'http://react-frontend:8080',
            'http://laravel-backend:8000',
            'null',     // Pour file://
            'file://',  // ✅ EMBED - Pour les tests de fichiers HTML locaux
        ] : []),
    ],

    'allowed_origins_patterns' => [
        // ✅ DÉVELOPPEMENT UNIQUEMENT
         ...(env('APP_ENV') === 'local' ? [
            '/^https?:\/\/localhost:\d+$/',
            '/^https?:\/\/127\.0\.0\.1:\d+$/',
            '/^https?:\/\/[^\/]+\.localhost:\d+$/',
        ] : []),

        // ✅ PRODUCTION : Patterns sécurisés
        '/^https:\/\/.*\.pixel-rise\.com$/',

        // ✅ EMBED : Autoriser TOUS les domaines pour embed uniquement
        '/^https?:\/\/.+$/',
    ],

    'allowed_headers'          => [
        'Accept',
        'Accept-Language',
        'Content-Language',
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-CSRF-TOKEN',
        'X-XSRF-TOKEN',
        'X-Client-ID',              // ✅ EMBED - Header client ID
        'X-Embed-Token',           // ✅ EMBED - Token embed pour sécurité
        'Origin',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'Cache-Control',
        'Pragma',
        'Range',
        'Content-Range',
    ],

    'exposed_headers'          => [
        'X-CSRF-TOKEN',
        'X-XSRF-TOKEN',
        'Set-Cookie',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Credentials',
        'Content-Length',
        'Content-Range',
        'Accept-Ranges',
    ],

    'max_age'                  => 86400, // 24 heures

    'supports_credentials'     => true, // ✅ CRUCIAL pour Sanctum + React

];
