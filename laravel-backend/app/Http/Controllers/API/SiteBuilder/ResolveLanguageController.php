<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ResolveLanguageController extends Controller
{
    /**
     * Normalise une saisie libre en langue ISO via OpenAI.
     * Input : { "input": "anglais" }
     * Output: { "code": "en", "name": "English", "flag": "🇬🇧" }
     */
    public function resolve(Request $request): JsonResponse
    {
        $request->validate(['input' => 'required|string|max:100']);

        $userInput = trim($request->input('input'));

        $apiKey = env('OPENAI_API_KEY');
        if (!$apiKey) {
            return response()->json(['success' => false, 'message' => 'OpenAI non configuré.'], 500);
        }

        $prompt = <<<PROMPT
The user typed "{$userInput}" to identify a human language.

Return ONLY a valid JSON object (no markdown, no explanation) with exactly these fields:
- "code": ISO 639-1 two-letter language code (e.g. "fr", "en", "mg", "zh")
- "name": the language name in its own language (e.g. "Français", "English", "Malagasy", "中文")
- "flag": the most representative country flag emoji for this language (e.g. "🇫🇷", "🇬🇧", "🇲🇬", "🇨🇳")

If the input is not a recognizable language, return: {"error": "not_a_language"}
PROMPT;

        try {
            $response = Http::timeout(10)->withHeaders([
                'Authorization' => "Bearer {$apiKey}",
                'Content-Type'  => 'application/json',
            ])->post('https://api.openai.com/v1/chat/completions', [
                'model'       => 'gpt-4o-mini',
                'messages'    => [
                    ['role' => 'system', 'content' => 'You are a language identification assistant. Always respond with raw JSON only.'],
                    ['role' => 'user',   'content' => $prompt],
                ],
                'temperature' => 0,
                'max_tokens'  => 60,
            ]);

            if (!$response->successful()) {
                Log::warning('OpenAI resolve-language failed', ['status' => $response->status()]);
                return response()->json(['success' => false, 'message' => 'Erreur OpenAI.'], 502);
            }

            $content = $response->json('choices.0.message.content', '{}');
            // Nettoyer si OpenAI wrap en markdown
            $content = preg_replace('/^```json\s*/i', '', trim($content));
            $content = preg_replace('/```$/i', '', trim($content));

            $data = json_decode($content, true);

            if (!$data || isset($data['error'])) {
                return response()->json([
                    'success' => false,
                    'message' => "Langue non reconnue. Essayez d'écrire le nom en français ou en anglais.",
                ], 422);
            }

            if (empty($data['code']) || empty($data['name']) || empty($data['flag'])) {
                return response()->json(['success' => false, 'message' => 'Réponse OpenAI invalide.'], 502);
            }

            return response()->json([
                'success' => true,
                'data'    => [
                    'code' => strtolower($data['code']),
                    'name' => $data['name'],
                    'flag' => $data['flag'],
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('ResolveLanguageController error', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Erreur serveur.'], 500);
        }
    }
}
