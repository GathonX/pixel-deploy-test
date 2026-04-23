<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogFormDataMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // Log uniquement pour les requêtes blog-posts avec fichiers
        if ($request->is('api/blog-posts/*') && $request->isMethod('PUT')) {
            Log::info('[Middleware] === ANALYSE REQUÊTE PUT ===', [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'content_type' => $request->header('Content-Type'),
                'content_length' => $request->header('Content-Length'),
                'user_agent' => $request->header('User-Agent'),
                'all_headers' => $request->headers->all(),
            ]);

            Log::info('[Middleware] Analyse du contenu brut:', [
                'raw_content_size' => strlen($request->getContent()),
                'raw_content_preview' => substr($request->getContent(), 0, 500),
                'input_all' => $request->all(),
                'files_all' => $request->allFiles(),
                'has_files' => !empty($request->allFiles()),
            ]);

            // Analyser le boundary multipart si présent
            $contentType = $request->header('Content-Type');
            if (str_contains($contentType, 'multipart/form-data')) {
                preg_match('/boundary=(.+)/', $contentType, $matches);
                $boundary = $matches[1] ?? 'NOT_FOUND';
                Log::info('[Middleware] Multipart boundary:', ['boundary' => $boundary]);
                
                // Vérifier si le boundary est présent dans le contenu
                $rawContent = $request->getContent();
                $boundaryInContent = str_contains($rawContent, $boundary);
                Log::info('[Middleware] Boundary présent dans contenu:', ['present' => $boundaryInContent]);
            }
        }

        return $next($request);
    }
}