<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\UserSite;
use App\Models\BlogPost;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Log;

class SitePublicDataController extends Controller
{
    /**
     * GET /site-builder/public/sites/{siteId}/posts?lang=en
     * Retourne les articles publiés du propriétaire du site (public, sans auth).
     * Si lang != langue par défaut du site, traduit les titres/résumés via OpenAI (cache 24h).
     */
    public function posts(Request $request, string $siteId): JsonResponse
    {
        $site = UserSite::find($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé.'], 404);
        }

        $posts = BlogPost::where('user_id', $site->user_id)
            ->where('status', 'published')
            ->orderByDesc('published_at')
            ->get(['id', 'slug', 'title', 'summary', 'header_image', 'published_at', 'tags', 'views'])
            ->map(fn($p) => [
                'id'           => $p->id,
                'slug'         => $p->slug,
                'title'        => $p->title,
                'summary'      => $p->summary,
                'header_image' => $p->header_image,
                'published_at' => $p->published_at?->toDateString(),
                'tags'         => $p->tags ?? [],
                'views'        => $p->views ?? 0,
            ])->toArray();

        // Si une langue cible est demandée, vérifier si elle est différente de la langue par défaut
        $targetLang = strtolower(trim($request->query('lang', '')));
        $targetLangName = trim($request->query('lang_name', ''));
        if ($targetLang) {
            $defaultLang = $site->languages()->where('is_default', true)->value('language_code') ?? 'fr';
            if ($targetLang !== strtolower($defaultLang) && count($posts) > 0) {
                $posts = $this->translatePosts($posts, $targetLang, $targetLangName, $siteId);
            }
        }

        return response()->json(['success' => true, 'data' => $posts]);
    }

    /**
     * Traduit les titres et résumés des articles via OpenAI, avec cache 24h.
     */
    private function translatePosts(array $posts, string $targetLang, string $targetLangName, string $siteId): array
    {
        // Clé de cache basée sur les IDs des articles (invalide si articles changent)
        $postIds = implode(',', array_column($posts, 'id'));
        $cacheKey = "posts_tr_{$siteId}_{$targetLang}_" . md5($postIds);

        $translations = Cache::remember($cacheKey, 86400, function () use ($posts, $targetLang, $targetLangName) {
            return $this->callOpenAIForPosts($posts, $targetLang, $targetLangName);
        });

        if (!$translations) {
            return $posts; // fallback : contenu original
        }

        return array_map(function ($post) use ($translations) {
            $id = $post['id'];
            if (isset($translations[$id])) {
                $post['title']   = $translations[$id]['title']   ?? $post['title'];
                $post['summary'] = $translations[$id]['summary'] ?? $post['summary'];
                if (!empty($translations[$id]['tag']) && !empty($post['tags'])) {
                    $post['tags'] = [$translations[$id]['tag']];
                }
            }
            return $post;
        }, $posts);
    }

    /**
     * Appel OpenAI pour traduire les champs texte des articles en une seule requête.
     * $targetLangName est le nom complet (ex: "Malagasy", "日本語") fourni par le frontend.
     * Si absent, on utilise le code brut — OpenAI le comprend aussi.
     */
    private function callOpenAIForPosts(array $posts, string $targetLang, string $targetLangName): ?array
    {
        $apiKey = env('OPENAI_API_KEY');
        if (!$apiKey) return null;

        // Préparer un objet compact : { postId: { title, summary, tag } }
        $toTranslate = [];
        foreach ($posts as $post) {
            $toTranslate[$post['id']] = [
                'title'   => $post['title'] ?? '',
                'summary' => $post['summary'] ?? '',
                'tag'     => $post['tags'][0] ?? '',
            ];
        }

        $json = json_encode($toTranslate, JSON_UNESCAPED_UNICODE);
        // Utiliser le nom complet fourni par le frontend (ex: "Malagasy"), sinon le code
        $langLabel = $targetLangName ?: $targetLang;

        try {
            $response = Http::timeout(30)->withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type'  => 'application/json',
            ])->post('https://api.openai.com/v1/chat/completions', [
                'model'    => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role'    => 'system',
                        'content' => "You are a professional blog content translator. Translate article titles, summaries, and tags to {$langLabel}. Return ONLY raw JSON with the same structure, no markdown.",
                    ],
                    [
                        'role'    => 'user',
                        'content' => "Translate to {$langLabel}. Keep the same JSON keys (post IDs). Translate only the text values:\n{$json}",
                    ],
                ],
                'temperature'     => 0.2,
                'max_tokens'      => 3000,
                'response_format' => ['type' => 'json_object'],
            ]);

            if (!$response->successful()) {
                Log::warning('OpenAI posts translate failed', ['status' => $response->status()]);
                return null;
            }

            $raw = $response->json('choices.0.message.content', '{}');
            return json_decode($raw, true) ?: null;

        } catch (\Throwable $e) {
            Log::warning('Posts translation error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * GET /site-builder/public/sites/{siteId}/posts/{slug}
     * Retourne un article complet par slug (public, sans auth).
     */
    public function post(Request $request, string $siteId, string $slug): JsonResponse
    {
        $site = UserSite::find($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé.'], 404);
        }

        $post = BlogPost::where('user_id', $site->user_id)
            ->where('slug', $slug)
            ->where('status', 'published')
            ->first(['id', 'slug', 'title', 'summary', 'content', 'header_image', 'published_at', 'tags', 'views']);

        if (!$post) {
            return response()->json(['success' => false, 'message' => 'Article non trouvé.'], 404);
        }

        // Incrémenter les vues
        $post->increment('views');

        return response()->json([
            'success' => true,
            'data' => [
                'id'           => $post->id,
                'slug'         => $post->slug,
                'title'        => $post->title,
                'summary'      => $post->summary,
                'content'      => $post->content,
                'header_image' => $post->header_image,
                'published_at' => $post->published_at?->toDateString(),
                'tags'         => $post->tags ?? [],
                'views'        => $post->views ?? 0,
                'author_name'  => $site->name,
            ],
        ]);
    }

    /**
     * POST /site-builder/public/sites/{siteId}/contact
     * Soumet un message de contact → stocké en DB + email vers le propriétaire du site.
     */
    public function contact(Request $request, string $siteId): JsonResponse
    {
        // Rate limiting par IP
        $key = 'site_contact:' . $siteId . ':' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                'success' => false,
                'message' => 'Trop de tentatives. Réessayez plus tard.',
            ], 429);
        }

        $validated = $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'required|email|max:255',
            'phone'   => 'nullable|string|max:50',
            'message' => 'required|string|max:2000',
        ]);

        $site = UserSite::with('user')->find($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé.'], 404);
        }

        try {
            $contact = ContactMessage::create([
                'user_id' => $site->user_id,
                'name'    => strip_tags($validated['name']),
                'email'   => $validated['email'],
                'message' => strip_tags($validated['message']),
                'source'  => 'site_builder',
                'status'  => 'new',
                'metadata' => [
                    'phone'        => $validated['phone'] ?? null,
                    'site_id'      => $siteId,
                    'site_name'    => $site->name,
                    'referrer'     => $request->header('referer'),
                    'submitted_at' => now()->toISOString(),
                    'ip_address'   => $request->ip(),
                ],
            ]);

            RateLimiter::hit($key, 600);

            // Envoyer l'email au destinataire configuré (seo_config.contactEmail ou email du propriétaire)
            $seoConfig = $site->seo_config ?? [];
            $recipientEmail = $seoConfig['contactEmail'] ?? null ?: $site->user?->email;
            if ($recipientEmail) {
                try {
                    \Illuminate\Support\Facades\Mail::to($recipientEmail)
                        ->send(new \App\Mail\ContactMessageReceived($contact));
                } catch (\Throwable $e) {
                    Log::warning('SiteBuilder contact email failed', ['error' => $e->getMessage()]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Message envoyé avec succès.',
            ], 201);

        } catch (\Throwable $e) {
            Log::error('SiteBuilder contact error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Erreur serveur.'], 500);
        }
    }

    /**
     * GET /site-builder/public/sites/{siteId}/meta
     * Retourne les métadonnées publiques du site (owner_id, contact_email).
     */
    public function meta(string $siteId): JsonResponse
    {
        $site = UserSite::with('user:id,email,name')->find($siteId);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'site_id'       => $site->id,
                'site_name'     => $site->name,
                'owner_id'      => $site->user_id,
                'contact_email' => $site->user?->email,
            ],
        ]);
    }
}
