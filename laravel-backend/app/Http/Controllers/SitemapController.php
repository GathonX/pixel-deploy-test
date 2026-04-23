<?php

namespace App\Http\Controllers;

use App\Models\BlogPost;

class SitemapController extends Controller
{
    /**
     * Génère le sitemap.xml dynamiquement depuis la base de données
     * Ce sitemap est mis à jour en temps réel à chaque requête
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        try {
            // URLs statiques de base
            $staticUrls = [
                ['loc' => '/', 'changefreq' => 'daily', 'priority' => '1.0'],
                ['loc' => '/login', 'changefreq' => 'monthly', 'priority' => '0.8'],
                ['loc' => '/discuter-projet', 'changefreq' => 'monthly', 'priority' => '0.8'],
                ['loc' => '/mon-actualite', 'changefreq' => 'daily', 'priority' => '0.9'],
                ['loc' => '/blog', 'changefreq' => 'daily', 'priority' => '0.9'],
                ['loc' => '/dashboard', 'changefreq' => 'weekly', 'priority' => '0.7'],
                ['loc' => '/reservation', 'changefreq' => 'weekly', 'priority' => '0.7'],
            ];

            // Récupérer TOUS les articles publiés depuis la base de données
            $articles = BlogPost::where('status', 'published')
                ->select('slug', 'published_at', 'created_at')
                ->orderBy('published_at', 'desc')
                ->get();

            $siteUrl = config('app.url');
            $today = now()->format('Y-m-d');

            // Générer le XML
            $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

            // URLs statiques
            foreach ($staticUrls as $url) {
                $xml .= '  <url>' . "\n";
                $xml .= '    <loc>' . $siteUrl . $url['loc'] . '</loc>' . "\n";
                $xml .= '    <lastmod>' . $today . '</lastmod>' . "\n";
                $xml .= '    <changefreq>' . $url['changefreq'] . '</changefreq>' . "\n";
                $xml .= '    <priority>' . $url['priority'] . '</priority>' . "\n";
                $xml .= '  </url>' . "\n";
            }

            // URLs dynamiques des articles de blog
            foreach ($articles as $article) {
                if (!empty($article->slug)) {
                    $lastmod = $article->published_at
                        ? $article->published_at->format('Y-m-d')
                        : ($article->created_at ? $article->created_at->format('Y-m-d') : $today);

                    $xml .= '  <url>' . "\n";
                    $xml .= '    <loc>' . $siteUrl . '/blog/' . $article->slug . '</loc>' . "\n";
                    $xml .= '    <lastmod>' . $lastmod . '</lastmod>' . "\n";
                    $xml .= '    <changefreq>weekly</changefreq>' . "\n";
                    $xml .= '    <priority>0.8</priority>' . "\n";
                    $xml .= '  </url>' . "\n";
                }
            }

            $xml .= '</urlset>';

            // Retourner le XML avec le bon Content-Type
            return response($xml, 200)
                ->header('Content-Type', 'application/xml');

        } catch (\Exception $e) {
            // En cas d'erreur, retourner un sitemap de base avec l'erreur en commentaire
            return response('<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Error: ' . htmlspecialchars($e->getMessage()) . ' -->
  <url>
    <loc>' . config('app.url') . '</loc>
    <lastmod>' . now()->format('Y-m-d') . '</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>', 200)
                ->header('Content-Type', 'application/xml');
        }
    }
}
