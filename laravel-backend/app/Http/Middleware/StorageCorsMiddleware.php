<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;

class StorageCorsMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // ✅ LOG DEBUG : Requête entrante
        Log::info('🔍 [StorageCorsMiddleware] Requête entrante', [
            'url' => $request->url(),
            'method' => $request->method(),
            'path' => $request->path(),
            'user_agent' => $request->userAgent(),
            'referer' => $request->header('referer'),
            'origin' => $request->header('origin'),
        ]);

        // Traiter la requête
        $response = $next($request);

        // ✅ LOG DEBUG : Réponse avant headers CORS
        Log::info('📤 [StorageCorsMiddleware] Réponse avant CORS', [
            'status' => $response->status(),
            'content_type' => $response->headers->get('Content-Type'),
            'headers_before' => $response->headers->all(),
        ]);

        // Ajouter les en-têtes CORS pour tous les fichiers statiques
        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-Requested-With');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
        $response->headers->set('Access-Control-Max-Age', '86400');

        // En-têtes spécifiques pour les fichiers
        $response->headers->set('Cross-Origin-Resource-Policy', 'cross-origin');
        $response->headers->set('Cross-Origin-Embedder-Policy', 'unsafe-none');
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // ✅ LOG DEBUG : Réponse après headers CORS
        Log::info('✅ [StorageCorsMiddleware] Réponse après CORS', [
            'status' => $response->status(),
            'headers_after' => $response->headers->all(),
            'cors_origin' => $response->headers->get('Access-Control-Allow-Origin'),
            'cors_policy' => $response->headers->get('Cross-Origin-Resource-Policy'),
        ]);

        // Gérer les requêtes OPTIONS (preflight)
        if ($request->getMethod() === 'OPTIONS') {
            Log::info('🔧 [StorageCorsMiddleware] Requête OPTIONS preflight');
            $response->setStatusCode(200);
            return $response;
        }

        return $response;
    }
}
