<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class FixFormDataMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // Traiter uniquement les requêtes POST avec _method=PUT vers blog-posts
        if ($request->isMethod('POST') && 
            $request->input('_method') === 'PUT' && 
            $request->is('api/blog-posts/*')) {
            
            Log::info('[FixFormDataMiddleware] Traitement de la requête FormData');
            
            // Forcer Laravel à reparser le contenu multipart
            $contentType = $request->header('Content-Type');
            
            if (str_contains($contentType, 'multipart/form-data')) {
                Log::info('[FixFormDataMiddleware] Détection multipart/form-data');
                
                // Récupérer le contenu brut
                $rawContent = $request->getContent();
                Log::info('[FixFormDataMiddleware] Taille contenu brut:', ['size' => strlen($rawContent)]);
                
                // Parser manuellement si nécessaire
                if (empty($request->allFiles()) && !empty($rawContent)) {
                    Log::info('[FixFormDataMiddleware] Tentative de parsing manuel du FormData');
                    
                    // Utiliser le parser Symfony pour extraire les fichiers
                    $this->parseMultipartContent($request, $rawContent, $contentType);
                }
            }
        }

        return $next($request);
    }

    private function parseMultipartContent(Request $request, string $content, string $contentType): void
    {
        // Extraire le boundary
        preg_match('/boundary=(.+)/', $contentType, $matches);
        $boundary = $matches[1] ?? null;
        
        if (!$boundary) {
            Log::error('[FixFormDataMiddleware] Boundary non trouvé');
            return;
        }

        Log::info('[FixFormDataMiddleware] Boundary détecté:', ['boundary' => $boundary]);

        // Parser les parties du multipart
        $parts = explode('--' . $boundary, $content);
        
        foreach ($parts as $part) {
            if (empty(trim($part)) || trim($part) === '--') {
                continue;
            }

            // Séparer headers et contenu
            $sections = explode("\r\n\r\n", $part, 2);
            if (count($sections) !== 2) {
                continue;
            }

            $headers = $sections[0];
            $body = trim($sections[1], "\r\n");

            // Parser le Content-Disposition
            if (preg_match('/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/', $headers, $matches)) {
                $fieldName = $matches[1];
                $filename = $matches[2] ?? null;

                Log::info('[FixFormDataMiddleware] Partie trouvée:', [
                    'field' => $fieldName,
                    'filename' => $filename,
                    'body_size' => strlen($body)
                ]);

                if ($filename && $fieldName === 'header_image') {
                    // C'est un fichier - créer un fichier temporaire
                    Log::info('[FixFormDataMiddleware] Création fichier temporaire pour:', $filename);
                    
                    $tmpFile = tmpfile();
                    $tmpPath = stream_get_meta_data($tmpFile)['uri'];
                    fwrite($tmpFile, $body);
                    
                    // Créer un UploadedFile
                    $uploadedFile = new \Symfony\Component\HttpFoundation\File\UploadedFile(
                        $tmpPath,
                        $filename,
                        $this->getMimeTypeFromHeaders($headers),
                        null,
                        true // test mode
                    );

                    // Ajouter à la requête
                    $request->files->set($fieldName, $uploadedFile);
                    Log::info('[FixFormDataMiddleware] Fichier ajouté à la requête');
                } else {
                    // C'est un champ normal
                    $request->request->set($fieldName, $body);
                }
            }
        }
    }

    private function getMimeTypeFromHeaders(string $headers): string
    {
        if (preg_match('/Content-Type: (.+)/', $headers, $matches)) {
            return trim($matches[1]);
        }
        return 'application/octet-stream';
    }
}