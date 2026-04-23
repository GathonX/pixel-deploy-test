<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Contrôleur pour le calendrier unifié (Blog + Social Media)
 * Route : /api/content/calendar
 */
class ContentCalendarController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * GET /api/content/calendar
     * Récupérer tous les contenus (blog + social media) pour le calendrier
     *
     * Paramètres:
     * - year: int (optionnel) - Année à filtrer
     * - month: int (optionnel) - Mois à filtrer (1-12)
     * - type: string (optionnel) - Type de contenu ('blog', 'social', 'all')
     * - status: string (optionnel) - Statut ('draft', 'scheduled', 'published', 'all')
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $year = $request->input('year');
            $month = $request->input('month');
            $type = $request->input('type', 'all'); // blog, social, all
            $status = $request->input('status', 'all');

            Log::info("📅 [ContentCalendar] Récupération contenus", [
                'user_id' => $user->id,
                'year' => $year,
                'month' => $month,
                'type' => $type,
                'status' => $status
            ]);

            $contents = [];

            // ✅ Récupérer les posts blog
            if (in_array($type, ['blog', 'all'])) {
                $blogQuery = $user->blogPosts()->with(['categories', 'user']);

                if ($year) {
                    $blogQuery->whereYear('created_at', $year);
                }

                if ($month) {
                    $blogQuery->whereMonth('created_at', $month);
                }

                if ($status !== 'all') {
                    $blogQuery->where('status', $status);
                }

                $blogPosts = $blogQuery->orderBy('created_at', 'desc')->get();

                // Formatter les posts blog
                foreach ($blogPosts as $post) {
                    $contents[] = [
                        'id' => $post->id,
                        'type' => 'blog',
                        'title' => $post->title,
                        'summary' => $post->summary ?? '',
                        'content' => $post->content ?? '',
                        'header_image' => $post->header_image,
                        'slug' => $post->slug,
                        'status' => $post->status,
                        'published_at' => $post->published_at,
                        'created_at' => $post->created_at,
                        'updated_at' => $post->updated_at,
                        'tags' => $post->tags ?? [],
                        'categories' => $post->categories->map(function ($cat) {
                            return [
                                'id' => $cat->id,
                                'name' => $cat->name,
                                'slug' => $cat->slug
                            ];
                        }),
                        'user' => [
                            'id' => $post->user->id ?? $user->id,
                            'name' => $post->user->name ?? $user->name
                        ],
                        'views' => $post->views ?? 0,
                        'likes' => $post->likes ?? 0,
                        'shares' => $post->shares ?? 0,
                        'comments' => $post->comments_count ?? 0
                    ];
                }

                Log::info("✅ [ContentCalendar] {$blogPosts->count()} posts blog récupérés");
            }

            // ✅ Récupérer les posts social media
            if (in_array($type, ['social', 'all'])) {
                $socialQuery = $user->socialMediaPosts();

                if ($year) {
                    $socialQuery->whereYear('created_at', $year);
                }

                if ($month) {
                    $socialQuery->whereMonth('created_at', $month);
                }

                if ($status !== 'all') {
                    $socialQuery->where('status', $status);
                }

                $socialPosts = $socialQuery->orderBy('created_at', 'desc')->get();

                // Formatter les posts social media
                foreach ($socialPosts as $post) {
                    $contents[] = [
                        'id' => $post->id,
                        'type' => 'social',
                        'platform' => $post->platform, // facebook, instagram, twitter, linkedin
                        'title' => $this->truncate($post->content, 50), // Titre = début du contenu
                        'content' => $post->content,
                        'media_url' => $post->media_url,
                        'status' => $post->status,
                        'published_at' => $post->published_at,
                        'created_at' => $post->created_at,
                        'updated_at' => $post->updated_at,
                        'hashtags' => $post->hashtags ?? [],
                        'user' => [
                            'id' => $user->id,
                            'name' => $user->name
                        ],
                        'views' => $post->views ?? 0,
                        'likes' => $post->likes ?? 0,
                        'shares' => $post->shares ?? 0,
                        'comments' => $post->comments ?? 0
                    ];
                }

                Log::info("✅ [ContentCalendar] {$socialPosts->count()} posts social récupérés");
            }

            // Trier tous les contenus par date décroissante
            usort($contents, function ($a, $b) {
                $dateA = $a['published_at'] ?? $a['created_at'];
                $dateB = $b['published_at'] ?? $b['created_at'];
                return strtotime($dateB) - strtotime($dateA);
            });

            // ✅ Calculer les statistiques
            $stats = [
                'total' => count($contents),
                'blog' => count(array_filter($contents, fn($c) => $c['type'] === 'blog')),
                'social' => count(array_filter($contents, fn($c) => $c['type'] === 'social')),
                'by_status' => [
                    'draft' => count(array_filter($contents, fn($c) => $c['status'] === 'draft')),
                    'scheduled' => count(array_filter($contents, fn($c) => $c['status'] === 'scheduled')),
                    'published' => count(array_filter($contents, fn($c) => $c['status'] === 'published'))
                ],
                'by_platform' => []
            ];

            // Compter par plateforme pour les posts sociaux
            foreach ($contents as $content) {
                if ($content['type'] === 'social') {
                    $platform = $content['platform'];
                    if (!isset($stats['by_platform'][$platform])) {
                        $stats['by_platform'][$platform] = 0;
                    }
                    $stats['by_platform'][$platform]++;
                }
            }

            Log::info("📊 [ContentCalendar] Statistiques calculées", [
                'total' => $stats['total'],
                'blog' => $stats['blog'],
                'social' => $stats['social']
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'contents' => $contents,
                    'stats' => $stats,
                    'filters' => [
                        'year' => $year,
                        'month' => $month,
                        'type' => $type,
                        'status' => $status
                    ]
                ],
                'message' => "Calendrier chargé: {$stats['total']} contenus"
            ]);

        } catch (\Exception $e) {
            Log::error("❌ [ContentCalendar] Erreur récupération", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => Auth::id()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du calendrier',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Tronquer un texte
     */
    private function truncate(string $text, int $length = 50): string
    {
        if (strlen($text) <= $length) {
            return $text;
        }

        return substr($text, 0, $length) . '...';
    }
}
