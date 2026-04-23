<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\ContentGeneration\PostManagementService;
use App\Services\ContentGeneration\InteractionService;
use App\Models\User;
use App\Models\BlogPost;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Models\ContactMessage;
use App\Models\Reservation;
use App\Mail\ContactMessageReceived;
use App\Mail\ReservationReceived;
use Illuminate\Support\Facades\Mail;

class EmbedController extends Controller
{
    private PostManagementService $postManagementService;
    private InteractionService $interactionService;

    public function __construct(
        PostManagementService $postManagementService,
        InteractionService $interactionService
    ) {
        // Routes publiques - Pas d'authentification requise
        $this->postManagementService = $postManagementService;
        $this->interactionService = $interactionService;
    }

    /**
     * GET /api/embed/blogs?client_id=CLIENT_ID
     * Récupère les articles d'un utilisateur pour l'embed JavaScript
     */
    public function getBlogFeed(Request $request): JsonResponse
    {
        try {
            $clientId = $request->get('client_id');

            if (!$clientId) {
                return response()->json([
                    'success' => false,
                    'message' => 'client_id requis'
                ], 400);
            }

            Log::info("[Embed] Récupération flux blog", [
                'client_id' => $clientId,
                'user_agent' => $request->userAgent()
            ]);

            // Trouver l'utilisateur par client_id (supposé être l'ID utilisateur)
            $user = User::find($clientId);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Client non trouvé'
                ], 404);
            }

            // ✅ PAGINATION : Récupérer paramètres de pagination
            $page = $request->get('page', 1);
            $perPage = $request->get('per_page', 6);
            
            // Valider les paramètres
            $page = max(1, intval($page));
            $perPage = min(20, max(1, intval($perPage))); // Limiter entre 1 et 20
            
            // Récupérer les articles publiés avec pagination
            $blogPostsPaginated = BlogPost::where('user_id', $user->id)
                ->where('status', 'published')
                ->orderBy('published_at', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

                $articles = $blogPostsPaginated->map(function ($post) use ($user) {
    return [
        'id' => $post->id,
        'title' => $post->title,
        'slug' => $post->slug,  // ✅ AJOUTÉ - Slug pour URL publique
        'excerpt' => $this->generateExcerpt($post->summary, $post->content, 100),
        'url' => url("/embed/blog/{$post->slug}?utm_source=client_site&utm_medium=blog_embed&utm_campaign=article&utm_content={$user->id}"),
        'image' => $post->header_image,
        'published_at' => $post->published_at?->toISOString(),
        'stats' => [
            'views' => $post->views ?? 0,
            'likes' => $post->likes ?? 0,
            'comments' => $post->comments()->count(),
            'shares' => $post->shares ?? 0
        ]
    ];
});

            return response()->json([
                'success' => true,
                'data' => [
                    'clientName' => $user->name,
                    'clientUrl' => $user->website ?? '#',
                    'articles' => $articles,
                    'pagination' => [
                        'current_page' => $blogPostsPaginated->currentPage(),
                        'per_page' => $blogPostsPaginated->perPage(),
                        'total' => $blogPostsPaginated->total(),
                        'last_page' => $blogPostsPaginated->lastPage(),
                        'from' => $blogPostsPaginated->firstItem(),
                        'to' => $blogPostsPaginated->lastItem()
                    ]
                ],
                'message' => 'Articles récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("[Embed] Erreur récupération flux", [
                'client_id' => $request->get('client_id'),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des articles'
            ], 500);
        }
    }

    /**
     * GET /api/embed/blog/{slug}
     * Récupère un article complet pour l'embed (page article complète)
     */
    public function getBlogArticle(string $slug, Request $request): JsonResponse
    {
        try {
            $clientId = $request->get('client_id');
            $utm_source = $request->get('utm_source');

            Log::info("[Embed] Récupération article complet", [
                'slug' => $slug,
                'client_id' => $clientId,
                'utm_source' => $utm_source,
                'user_agent' => $request->userAgent()
            ]);

            // Récupérer l'article par slug
            $blogPost = BlogPost::where('slug', $slug)
                ->where('status', 'published')
                ->with(['user', 'categories'])
                ->first();

            if (!$blogPost) {
                return response()->json([
                    'success' => false,
                    'message' => 'Article non trouvé'
                ], 404);
            }

            // Incrémenter les vues (public, sans auth)
            $this->interactionService->incrementViews('blog', $blogPost->id, null);

            // Formater l'article pour l'embed
            $article = [
                'id' => $blogPost->id,
                'title' => $blogPost->title,
                'slug' => $blogPost->slug,
                'content' => $blogPost->content,
                'summary' => $blogPost->summary,
                'header_image' => $blogPost->header_image,
                'published_at' => $blogPost->published_at?->toISOString(),
                'author' => [
                    'id' => $blogPost->user->id,
                    'name' => $blogPost->user->name,
                    'website' => $blogPost->user->website ?? '#'
                ],
                'categories' => $blogPost->categories->map(function ($category) {
                    return [
                        'name' => $category->name,
                        'slug' => $category->slug
                    ];
                }),
                'stats' => [
                    'views' => $blogPost->views ?? 0,
                    'likes' => $blogPost->likes ?? 0,
                    'comments' => $blogPost->comments()->count(),
                    'shares' => $blogPost->shares ?? 0
                ],
                'backlink' => [
                    'text' => "Article généré pour {$blogPost->user->name} par Pixel Rise",
                    'url' => $blogPost->user->website ?? '#'
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $article,
                'message' => 'Article récupéré avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("[Embed] Erreur récupération article", [
                'slug' => $slug,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'article'
            ], 500);
        }
    }

    /**
     * GET /api/embed/blog/article/{id}?client_id=CLIENT_ID (Premium)
     * Exportation d'un article complet pour import dans CMS client
     */
    public function exportBlogArticle(int $id, Request $request): JsonResponse
    {
        try {
            $clientId = $request->get('client_id');

            if (!$clientId) {
                return response()->json([
                    'success' => false,
                    'message' => 'client_id requis'
                ], 400);
            }

            Log::info("[Embed] Export article premium", [
                'article_id' => $id,
                'client_id' => $clientId
            ]);

            // Vérifier que l'utilisateur est propriétaire de l'article
            $user = User::find($clientId);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Client non trouvé'
                ], 404);
            }

            $blogPost = BlogPost::where('id', $id)
                ->where('user_id', $user->id)
                ->where('status', 'published')
                ->first();

            if (!$blogPost) {
                return response()->json([
                    'success' => false,
                    'message' => 'Article non trouvé ou non autorisé'
                ], 404);
            }

            // Générer le contenu avec backlink obligatoire
            $contentWithBacklink = $blogPost->content . "\n\n<p>Propulsé par <a href=\"https://pixel-rise.com\">Pixel Rise</a></p>";

            return response()->json([
                'success' => true,
                'data' => [
                    'title' => $blogPost->title,
                    'content' => $contentWithBacklink,
                    'excerpt' => $blogPost->summary,
                    'image' => $blogPost->header_image,
                    'tags' => $blogPost->tags ?? [],
                    'categories' => $blogPost->categories->pluck('name')->toArray(),
                    'published_at' => $blogPost->published_at?->toISOString()
                ],
                'message' => 'Article exporté avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error("[Embed] Erreur export article", [
                'article_id' => $id,
                'client_id' => $request->get('client_id'),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export de l\'article'
            ], 500);
        }
    }

    /**
     * Gérer la soumission du formulaire de contact via embed
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function handleContactForm(Request $request)
    {
        try {
            // Validation des headers
            $clientId = $request->header('X-Client-ID');
            $embedToken = $request->header('X-Embed-Token');

            Log::info('Contact Form Submission', [
                'client_id' => $clientId,
                'embed_token' => $embedToken,
                'all_headers' => $request->headers->all(),
                'all_input' => $request->all()
            ]);

            if (!$clientId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Header X-Client-ID manquant'
                ], 400);
            }

            // Validation du token embed (exemple simple, à personnaliser)
            if (!$this->validateEmbedToken($clientId, $embedToken)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Token embed invalide'
                ], 403);
            }

            // Validation des données
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|max:255',
                'message' => 'required|string|max:1000',
                'client_id' => 'required|exists:users,id'
            ], [
                // Messages d'erreur personnalisés
                'name.required' => 'Le nom est obligatoire',
                'email.required' => 'L\'email est obligatoire',
                'email.email' => 'L\'email doit être une adresse email valide',
                'message.required' => 'Le message est obligatoire'
            ]);

            // Vérifier que le client_id correspond au X-Client-ID
            if ($validated['client_id'] != $clientId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Identifiant client invalide'
                ], 403);
            }

            // Récupérer le client
            $client = User::findOrFail($validated['client_id']);

            // Créer une nouvelle entrée de contact
            $contact = ContactMessage::create([
                'user_id' => $client->id,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'message' => $validated['message'],
                'source' => 'embed_form',
                'status' => 'new',
                'metadata' => [
                    'client_origin' => $request->header('Origin'),
                    'user_agent' => $request->header('User-Agent')
                ]
            ]);

            // Modification de la partie d'envoi d'email
            try {
                // Envoyer l'email uniquement si un email client est disponible
                if ($client->email) {
                    Mail::to($client->email)->send(new ContactMessageReceived($contact));
                } else {
                    Log::warning('Aucun email client trouvé pour l\'envoi de notification', [
                        'contact_id' => $contact->id,
                        'client_id' => $client->id
                    ]);
                }
            } catch (\Exception $emailError) {
                Log::error('Erreur lors de l\'envoi de l\'email de contact', [
                    'contact_id' => $contact->id,
                    'error' => $emailError->getMessage(),
                    'trace' => $emailError->getTraceAsString()
                ]);
                // Ne pas bloquer la requête si l'email échoue
            }

            return response()->json([
                'success' => true,
                'message' => 'Votre message a été envoyé avec succès.',
                'contact_id' => $contact->id
            ]);
        } catch (ValidationException $e) {
            Log::error('Contact Form Validation Error', [
                'errors' => $e->errors()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur formulaire contact embed', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de l\'envoi du message.',
                'error_details' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Valider le token embed
     * @param string $clientId
     * @param string|null $embedToken
     * @return bool
     */
    private function validateEmbedToken(string $clientId, ?string $embedToken): bool
    {
        // Validation simple basée sur le timestamp
        if (!$embedToken) {
            return false;
        }

        try {
            // Décoder le token base64
            $decodedToken = base64_decode($embedToken);
            
            // Vérifier le format : clientId:timestamp
            $parts = explode(':', $decodedToken);
            if (count($parts) !== 2) {
                return false;
            }

            list($tokenClientId, $timestamp) = $parts;

            // Vérifier que le client ID correspond
            if ($tokenClientId !== $clientId) {
                return false;
            }

            // Vérifier l'expiration du token (valide 5 minutes)
            $currentTime = time();
            $tokenTime = intval($timestamp);
            
            return ($currentTime - $tokenTime) <= 300; // 5 minutes
        } catch (\Exception $e) {
            Log::error('Erreur validation token embed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Gérer la soumission du formulaire de réservation via embed
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function handleReservationForm(Request $request)
    {
        try {
            // Validation des données
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|max:255',
                'phone' => 'required|string|max:20',
                'client_id' => 'required|exists:users,id',
                'reservation_type' => 'required|in:quick,full',
                'date' => 'nullable|date_format:Y-m-d',
                'message' => 'nullable|string|max:1000'
            ]);

            // Récupérer le client
            $client = User::findOrFail($validated['client_id']);

            // Créer une nouvelle réservation
            $reservation = Reservation::create([
                'client_id' => $client->id,
                'user_id' => $client->id,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'type' => $validated['reservation_type'],
                'date' => $validated['date'] ?? now(),
                'guests' => $validated['guests'] ?? 1,
                'message' => $validated['message'] ?? null,
                'status' => 'pending',
                'source' => 'embed_form',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);

            // Envoyer une notification par email au client
            Mail::to($client->email)->send(new ReservationReceived($reservation));

            return response()->json([
                'success' => true,
                'message' => 'Votre réservation a été enregistrée avec succès.',
                'reservation_id' => $reservation->id
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur formulaire réservation embed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de l\'enregistrement de votre réservation.'
            ], 500);
        }
    }

    /**
     * Générer un extrait personnalisé
     */
    private function generateExcerpt(?string $summary, ?string $content, int $maxLength = 100): string
    {
        if ($summary) {
            return $this->truncateText($summary, $maxLength);
        }

        if ($content) {
            // Nettoyer le HTML et extraire le texte
            $cleanContent = strip_tags($content);
            return $this->truncateText($cleanContent, $maxLength);
        }

        return 'Découvrez cet article généré par l\'IA...';
    }

    /**
     * Tronquer le texte intelligemment
     */
    private function truncateText(string $text, int $maxLength): string
    {
        if (strlen($text) <= $maxLength) {
            return $text;
        }

        $truncated = substr($text, 0, $maxLength);
        $lastSpace = strrpos($truncated, ' ');
        
        if ($lastSpace !== false) {
            $truncated = substr($truncated, 0, $lastSpace);
        }

        return $truncated . '...';
    }
}