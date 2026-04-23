<?php
// Créer ce fichier : laravel-backend/routes/debug_email.php
// A ajouter TEMPORAIREMENT pour tester l'email

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Mail;
use Illuminate\Http\Request;

// ⚠️ ROUTE DE DEBUG - À SUPPRIMER EN PRODUCTION
Route::get('/debug/test-email', function (Request $request) {

    try {
        // Test simple d'envoi d'email
        $testEmail = 'admin@pixel-rise.com';

        Mail::raw('Test email depuis Laravel - Si vous recevez ceci, la config email fonctionne !', function ($message) use ($testEmail) {
            $message->to($testEmail)
                    ->subject('Test Email Laravel - ' . now());
        });

        return response()->json([
            'success' => true,
            'message' => 'Email de test envoyé à ' . $testEmail,
            'timestamp' => now(),
            'config' => [
                'mailer' => config('mail.default'),
                'host' => config('mail.mailers.smtp.host'),
                'port' => config('mail.mailers.smtp.port'),
                'username' => config('mail.mailers.smtp.username'),
                'from_address' => config('mail.from.address'),
            ]
        ]);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Erreur envoi email',
            'error' => $e->getMessage(),
            'config' => [
                'mailer' => config('mail.default'),
                'host' => config('mail.mailers.smtp.host'),
                'port' => config('mail.mailers.smtp.port'),
                'username' => config('mail.mailers.smtp.username'),
                'from_address' => config('mail.from.address'),
            ]
        ], 500);
    }
});

// Test avec plus de détails
Route::get('/debug/email-config', function () {
    return response()->json([
        'mail_config' => [
            'default_mailer' => config('mail.default'),
            'smtp_host' => config('mail.mailers.smtp.host'),
            'smtp_port' => config('mail.mailers.smtp.port'),
            'smtp_username' => config('mail.mailers.smtp.username'),
            'smtp_password' => config('mail.mailers.smtp.password') ? '***CONFIGURÉ***' : 'NON CONFIGURÉ',
            'from_address' => config('mail.from.address'),
            'from_name' => config('mail.from.name'),
        ],
        'env_vars' => [
            'MAIL_MAILER' => env('MAIL_MAILER'),
            'MAIL_HOST' => env('MAIL_HOST'),
            'MAIL_PORT' => env('MAIL_PORT'),
            'MAIL_USERNAME' => env('MAIL_USERNAME'),
            'MAIL_PASSWORD' => env('MAIL_PASSWORD') ? '***CONFIGURÉ***' : 'NON CONFIGURÉ',
            'MAIL_FROM_ADDRESS' => env('MAIL_FROM_ADDRESS'),
        ]
    ]);
});
