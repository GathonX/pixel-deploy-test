<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\UserSite;
use App\Models\SiteSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TranslateController extends Controller
{
    /**
     * Traduit tout le site (toutes les pages, toutes les sections) vers une langue cible.
     * POST /site-builder/sites/{siteId}/translate
     * Body: { "target_lang": "en", "target_name": "English", "target_flag": "🇬🇧" }
     */
    public function translate(Request $request, string $siteId): JsonResponse
    {
        $request->validate([
            'target_lang' => 'required|string|max:10',
            'target_name' => 'required|string|max:100',
        ]);

        $site = UserSite::forUser(Auth::id())
            ->with(['pages.sections'])
            ->find($siteId);

        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé.'], 404);
        }

        $apiKey = env('OPENAI_API_KEY');
        if (!$apiKey) {
            return response()->json(['success' => false, 'message' => 'OpenAI non configuré.'], 500);
        }

        $targetLang = strtolower($request->input('target_lang'));
        $targetName = $request->input('target_name');

        // ── 1. Collecter toutes les sections avec leur contenu ──────────────
        $allSections = [];
        foreach ($site->pages as $page) {
            foreach ($page->sections as $section) {
                // Si des traductions existent déjà pour cette langue, on les écrase
                $allSections[$section->id] = [
                    'section_type' => $section->section_type_id,
                    'content'      => $section->content ?? [],
                ];
            }
        }

        if (empty($allSections)) {
            return response()->json(['success' => false, 'message' => 'Aucune section à traduire.'], 422);
        }

        // ── 2. Préparer les données à envoyer à GPT ──────────────────────────
        // On extrait uniquement les champs texte (pas les URLs, images, prix)
        $toTranslate = [];
        foreach ($allSections as $sectionId => $data) {
            $textFields = $this->extractTextFields($data['content'], $data['section_type']);
            if (!empty($textFields)) {
                $toTranslate[$sectionId] = $textFields;
            }
        }

        if (empty($toTranslate)) {
            return response()->json(['success' => false, 'message' => 'Aucun texte trouvé à traduire.'], 422);
        }

        // ── 3. Appel OpenAI (un seul appel pour tout le site) ────────────────
        $prompt = $this->buildPrompt($toTranslate, $targetName);

        try {
            $response = Http::timeout(60)->withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type'  => 'application/json',
            ])->post('https://api.openai.com/v1/chat/completions', [
                'model'       => 'gpt-4o-mini',
                'messages'    => [
                    [
                        'role'    => 'system',
                        'content' => 'You are a professional hotel/resort website translator. Translate all text values accurately and professionally. Return ONLY raw JSON, no markdown.',
                    ],
                    ['role' => 'user', 'content' => $prompt],
                ],
                'temperature' => 0.2,
                'max_tokens'  => 4000,
                'response_format' => ['type' => 'json_object'],
            ]);

            if (!$response->successful()) {
                Log::warning('OpenAI translate failed', ['status' => $response->status(), 'body' => $response->body()]);
                return response()->json(['success' => false, 'message' => 'Erreur OpenAI (' . $response->status() . ').'], 502);
            }

            $raw = $response->json('choices.0.message.content', '{}');
            $translated = json_decode($raw, true);

            if (!$translated) {
                return response()->json(['success' => false, 'message' => 'Réponse OpenAI invalide.'], 502);
            }

        } catch (\Throwable $e) {
            Log::error('TranslateController error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Erreur serveur: ' . $e->getMessage()], 500);
        }

        // ── 4. Sauvegarder les traductions en base ───────────────────────────
        $updatedCount = 0;
        foreach ($translated as $sectionId => $translatedFields) {
            $section = SiteSection::find($sectionId);
            if (!$section) continue;

            // Reconstruire les champs traduits (notamment les links JSON)
            $finalTranslation = $this->mergeTranslatedFields(
                $section->content ?? [],
                $translatedFields,
                $section->section_type_id
            );

            $existing = $section->translations ?? [];
            $existing[$targetLang] = $finalTranslation;
            $section->translations = $existing;
            $section->save();
            $updatedCount++;
        }

        return response()->json([
            'success' => true,
            'message' => "Site traduit en {$targetName} ({$updatedCount} sections mises à jour).",
            'data'    => [
                'target_lang'   => $targetLang,
                'sections_count' => $updatedCount,
            ],
        ]);
    }

    /**
     * Extrait uniquement les champs texte traduisibles d'un contenu de section.
     * Exclut les URLs, images, prix, emails, téléphones, etc.
     */
    private function extractTextFields(array $content, string $sectionType): array
    {
        $skipPatterns = [
            // Champs non-texte
            '/Url$/', '/Image$/', '/url$/', '/image$/', '/href$/',
            '/email/', '/phone/', '/Price$/', '/price$/',
            // Champs structurels
            '/^overlayOpacity$/', '/^opts\d+$/',
        ];

        $fields = [];
        foreach ($content as $key => $value) {
            if (!is_string($value) || empty(trim($value))) continue;

            // Skip si la clé match un pattern non-texte
            $skip = false;
            foreach ($skipPatterns as $pattern) {
                if (preg_match($pattern, $key)) { $skip = true; break; }
            }
            if ($skip) continue;

            // Skip les valeurs qui ressemblent à des URLs ou chemins
            if (preg_match('/^(https?:\/\/|\/images\/|\/uploads\/)/', $value)) continue;

            // Champ spécial : links (JSON array avec label+href)
            if ($key === 'links') {
                $links = json_decode($value, true);
                if (is_array($links)) {
                    $labels = array_map(fn($l) => $l['label'] ?? '', $links);
                    $fields['__links_labels__'] = implode('|', $labels);
                }
                continue;
            }

            $fields[$key] = $value;
        }

        return $fields;
    }

    /**
     * Reconstruit le contenu final en intégrant les champs traduits.
     */
    private function mergeTranslatedFields(array $originalContent, array $translatedFields, string $sectionType): array
    {
        $result = $translatedFields;

        // Reconstruire les links si traduits
        if (isset($translatedFields['__links_labels__']) && isset($originalContent['links'])) {
            $originalLinks = json_decode($originalContent['links'], true);
            if (is_array($originalLinks)) {
                $translatedLabels = explode('|', $translatedFields['__links_labels__']);
                foreach ($originalLinks as $i => $link) {
                    if (isset($translatedLabels[$i])) {
                        $originalLinks[$i]['label'] = $translatedLabels[$i];
                    }
                }
                $result['links'] = json_encode($originalLinks, JSON_UNESCAPED_UNICODE);
            }
            unset($result['__links_labels__']);
        }

        return $result;
    }

    /**
     * Construit le prompt pour GPT avec toutes les sections à traduire.
     */
    private function buildPrompt(array $toTranslate, string $targetName): string
    {
        $json = json_encode($toTranslate, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        return <<<PROMPT
Translate all text values in the following JSON to {$targetName}.

Rules:
- Translate ONLY the values (not keys)
- Keep the exact same JSON structure and keys
- Do NOT translate: prices, phone numbers, proper names of people
- Keep brand names (LUXIOS, etc.) unchanged
- For hotel/resort content: use professional, elegant language
- Return ONLY the translated JSON object with the same structure

Input:
{$json}
PROMPT;
    }
}
