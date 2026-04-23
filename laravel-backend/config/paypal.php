<?php

// laravel-backend/config/paypal.php - CONFIGURATION PAYPAL COMPLÈTE

return [

    /*
    |--------------------------------------------------------------------------
    | PayPal Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration pour l'intégration PayPal
    | ✅ Toutes les valeurs proviennent des variables d'environnement
    | ✅ Fallbacks sécurisés pour le développement
    |
    */

    // ===== AUTHENTIFICATION PAYPAL =====
    'client_id' => env('PAYPAL_CLIENT_ID', ''),
    'client_secret' => env('PAYPAL_CLIENT_SECRET', ''),
    
    // ===== MODE DE FONCTIONNEMENT =====
    'mode' => env('PAYPAL_MODE', 'sandbox'), // 'sandbox' ou 'live'
    
    // ===== URLS DE BASE =====
    'base_url' => env('PAYPAL_MODE', 'sandbox') === 'live' 
        ? 'https://api.paypal.com'
        : 'https://api.sandbox.paypal.com',
    
    'web_url' => env('PAYPAL_MODE', 'sandbox') === 'live'
        ? 'https://www.paypal.com'
        : 'https://www.sandbox.paypal.com',

    // ===== CONFIGURATION MONNAIE =====
    'currency' => env('PAYPAL_CURRENCY', 'EUR'),
    'locale' => env('PAYPAL_LOCALE', 'fr_FR'),

    // ===== URLS DE REDIRECTION =====
    'return_url' => env('PAYPAL_RETURN_URL', env('APP_URL', 'http://localhost:3000') . '/payment/success'),
    'cancel_url' => env('PAYPAL_CANCEL_URL', env('APP_URL', 'http://localhost:3000') . '/payment/cancel'),

    // ===== WEBHOOKS =====
    'webhook_id' => env('PAYPAL_WEBHOOK_ID', ''),
    'webhook_url' => env('PAYPAL_WEBHOOK_URL', env('APP_URL', 'http://localhost:8000') . '/api/paypal/webhook'),

    // ===== CONFIGURATION DES PLANS =====
    'plans' => [
        'starter' => [
            'name' => 'Plan Starter',
            'description' => 'Parfait pour commencer votre aventure',
            'monthly_price' => 25.00,
            'yearly_price' => 250.00,
            'features' => [
                'Accès à tous les outils de base',
                'Support par email',
                '5 projets maximum',
                '10 GB de stockage',
                'Analyses de base'
            ],
            'limits' => [
                'projects' => 5,
                'storage_gb' => 10,
                'api_calls_per_month' => 1000,
            ]
        ],
        'pro' => [
            'name' => 'Plan Pro',
            'description' => 'Pour les professionnels exigeants',
            'monthly_price' => 75.00,
            'yearly_price' => 750.00,
            'features' => [
                'Accès à tous les outils avancés',
                'Support prioritaire',
                'Projets illimités',
                '100 GB de stockage',
                'Analyses avancées',
                'API complète',
                'Intégrations tierces'
            ],
            'limits' => [
                'projects' => -1, // illimité
                'storage_gb' => 100,
                'api_calls_per_month' => 10000,
            ]
        ],
        'enterprise' => [
            'name' => 'Plan Enterprise',
            'description' => 'Solution sur mesure pour les équipes',
            'monthly_price' => 150.00,
            'yearly_price' => 1500.00,
            'features' => [
                'Toutes les fonctionnalités Pro',
                'Support dédié 24/7',
                'Stockage illimité',
                'Analyses en temps réel',
                'API complète + webhooks',
                'Intégrations personnalisées',
                'Formation équipe incluse',
                'SLA garantie'
            ],
            'limits' => [
                'projects' => -1, // illimité
                'storage_gb' => -1, // illimité
                'api_calls_per_month' => 100000,
            ]
        ]
    ],

    // ===== CONFIGURATION DES TAXES =====
    'tax' => [
        'enabled' => env('PAYPAL_TAX_ENABLED', true),
        'rate' => env('PAYPAL_TAX_RATE', 20.0), // 20% TVA France
        'included_in_price' => env('PAYPAL_TAX_INCLUDED', true),
    ],

    // ===== CONFIGURATION DES ESSAIS GRATUITS =====
    'trial' => [
        'enabled' => env('PAYPAL_TRIAL_ENABLED', true),
        'duration_days' => env('PAYPAL_TRIAL_DAYS', 14),
        'require_payment_method' => env('PAYPAL_TRIAL_REQUIRE_PAYMENT', true),
    ],

    // ===== CONFIGURATION DES REMISES =====
    'discounts' => [
        'yearly_discount_percent' => 20, // 20% de réduction sur l'annuel
        'student_discount_percent' => 50, // 50% pour les étudiants
        'nonprofit_discount_percent' => 30, // 30% pour les associations
    ],

    // ===== LIMITES ET TIMEOUTS =====
    'limits' => [
        'max_subscription_attempts' => 3,
        'max_payment_attempts' => 5,
        'webhook_retry_attempts' => 3,
        'api_timeout_seconds' => 30,
    ],

    // ===== CONFIGURATION DE LOGGING =====
    'logging' => [
        'enabled' => env('PAYPAL_LOGGING_ENABLED', true),
        'level' => env('PAYPAL_LOG_LEVEL', 'info'), // debug, info, warning, error
        'log_requests' => env('PAYPAL_LOG_REQUESTS', true),
        'log_responses' => env('PAYPAL_LOG_RESPONSES', true),
        'log_webhooks' => env('PAYPAL_LOG_WEBHOOKS', true),
    ],

    // ===== CONFIGURATION DES NOTIFICATIONS =====
    'notifications' => [
        'admin_email' => env('PAYPAL_ADMIN_EMAIL', env('MAIL_FROM_ADDRESS')),
        'send_subscription_notifications' => true,
        'send_payment_notifications' => true,
        'send_failure_notifications' => true,
    ],

    // ===== CONFIGURATION DE SÉCURITÉ =====
    'security' => [
        'verify_webhook_signature' => env('PAYPAL_VERIFY_WEBHOOKS', true),
        'allowed_ips' => env('PAYPAL_ALLOWED_IPS', ''), // IPs autorisées pour webhooks (vide = toutes)
        'rate_limit_webhooks' => env('PAYPAL_WEBHOOK_RATE_LIMIT', 100), // requêtes/minute
    ],

    // ===== CONFIGURATION DES FACTURES =====
    'invoicing' => [
        'enabled' => true,
        'auto_generate' => true,
        'send_email' => true,
        'template' => 'paypal.invoice', // Vue pour les factures
        'numbering_prefix' => env('INVOICE_PREFIX', 'INV-'),
        'company_info' => [
            'name' => env('COMPANY_NAME', 'PixelRise'),
            'address' => env('COMPANY_ADDRESS', ''),
            'city' => env('COMPANY_CITY', ''),
            'postal_code' => env('COMPANY_POSTAL_CODE', ''),
            'country' => env('COMPANY_COUNTRY', 'FR'),
            'tax_id' => env('COMPANY_TAX_ID', ''),
            'email' => env('COMPANY_EMAIL', env('MAIL_FROM_ADDRESS')),
            'phone' => env('COMPANY_PHONE', ''),
            'website' => env('COMPANY_WEBSITE', env('APP_URL')),
        ]
    ],

    // ===== URLS D'API PAYPAL =====
    'api_endpoints' => [
        'token' => '/v1/oauth2/token',
        'plans' => '/v1/billing/plans',
        'subscriptions' => '/v1/billing/subscriptions',
        'payments' => '/v2/payments',
        'webhooks' => '/v1/notifications/webhooks',
        'refunds' => '/v2/payments/captures/{capture_id}/refund',
    ],

    // ===== CONFIGURATION DÉVELOPPEMENT =====
    'development' => [
        'mock_payments' => env('PAYPAL_MOCK_PAYMENTS', false),
        'log_all_requests' => env('PAYPAL_DEBUG_REQUESTS', false),
        'sandbox_accounts' => [
            'buyer' => env('PAYPAL_SANDBOX_BUYER_EMAIL', ''),
            'seller' => env('PAYPAL_SANDBOX_SELLER_EMAIL', ''),
        ]
    ],

    // ===== MESSAGES D'ERREUR PERSONNALISÉS =====
    'error_messages' => [
        'payment_failed' => 'Le paiement a échoué. Veuillez réessayer ou contactez le support.',
        'subscription_cancelled' => 'Votre abonnement a été annulé avec succès.',
        'subscription_suspended' => 'Votre abonnement a été suspendu. Contactez le support.',
        'invalid_payment_method' => 'Méthode de paiement invalide. Veuillez en choisir une autre.',
        'insufficient_funds' => 'Fonds insuffisants. Veuillez vérifier votre compte PayPal.',
        'technical_error' => 'Une erreur technique est survenue. Notre équipe a été notifiée.',
    ],

    // ===== CONFIGURATION CACHE =====
    'cache' => [
        'enabled' => env('PAYPAL_CACHE_ENABLED', true),
        'ttl_minutes' => env('PAYPAL_CACHE_TTL', 60), // 1 heure
        'prefix' => 'paypal:',
        'tags' => ['paypal', 'payments', 'subscriptions'],
    ],

    // ===== CONFIGURATION QUEUE =====
    'queue' => [
        'enabled' => env('PAYPAL_QUEUE_ENABLED', true),
        'connection' => env('PAYPAL_QUEUE_CONNECTION', 'default'),
        'webhook_processing' => 'paypal-webhooks',
        'invoice_generation' => 'paypal-invoices',
        'notification_sending' => 'paypal-notifications',
    ],

];