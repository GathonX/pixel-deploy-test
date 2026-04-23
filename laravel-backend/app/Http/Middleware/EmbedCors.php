<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;

class EmbedCors
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Log pour debug
        Log::info('🔍 [EmbedCors] Requête embed entrante', [
            'url' => $request->url(),
            'method' => $request->method(),
            'path' => $request->path(),
            'user_agent' => $request->userAgent(),
            'referer' => $request->header('referer'),
            'origin' => $request->header('origin'),
        ]);

        // Gérer les requêtes OPTIONS (preflight) en premier
        if ($request->getMethod() === 'OPTIONS') {
            Log::info('🔧 [EmbedCors] Requête OPTIONS preflight pour embed');
            
            $response = response('', 200);
            
            // Headers CORS pour preflight
            $response->headers->set('Access-Control-Allow-Origin', $request->header('Origin', '*'));
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-Requested-With, X-CSRF-TOKEN, X-Client-ID, X-Embed-Token');
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Access-Control-Max-Age', '86400');
            
            return $response;
        }

        // Traiter la requête
        $response = $next($request);

        // Ajouter les en-têtes CORS pour toutes les réponses embed (éviter les doublons)
        $origin = $request->header('Origin', '*');
        
        if (!$response->headers->has('Access-Control-Allow-Origin')) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
        }
        if (!$response->headers->has('Access-Control-Allow-Methods')) {
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        }
        if (!$response->headers->has('Access-Control-Allow-Headers')) {
            $response->headers->set('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-Requested-With, X-CSRF-TOKEN, X-Client-ID, X-Embed-Token');
        }
        if (!$response->headers->has('Access-Control-Allow-Credentials')) {
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }

        // En-têtes spécifiques pour les embeds
        $response->headers->set('X-Frame-Options', 'ALLOWALL');
        $response->headers->set('Content-Security-Policy', "frame-ancestors *;");
        $response->headers->set('Cross-Origin-Resource-Policy', 'cross-origin');
        $response->headers->set('Cross-Origin-Embedder-Policy', 'unsafe-none');

        Log::info('✅ [EmbedCors] Headers CORS ajoutés pour embed', [
            'status' => $response->status(),
            'cors_origin' => $response->headers->get('Access-Control-Allow-Origin'),
            'frame_options' => $response->headers->get('X-Frame-Options'),
        ]);

        return $response;
    }
}