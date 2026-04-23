<?php

namespace App\Services\AgentIntelligent;

use App\Models\User;
use App\Models\IntelligentAgent;
use App\Models\AgentInteraction;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ConversationalMemoryService
{
    protected User $user;
    protected IntelligentAgent $agent;
    protected string $sessionKey;

    public function __construct(User $user)
    {
        $this->user = $user;
        $this->agent = $user->intelligentAgent;
        $this->sessionKey = "agent_memory_{$user->id}";
    }

    /**
     * 🧠 OBTENIR MÉMOIRE CONVERSATIONNELLE COMPLÈTE
     */
    public function getConversationalMemory(): array
    {
        // 🧠 INTELLIGENCE COMPLÈTE avec cache optimisé par sections
        return [
            'conversation_history' => $this->getRecentConversationHistory(),
            'user_preferences' => $this->extractUserPreferencesOptimized(),
            'conversation_context' => $this->getConversationContextOptimized(),
            'personality_profile' => $this->buildPersonalityProfileOptimized(),
            'recent_topics' => $this->getRecentTopicsOptimized(),
            'conversation_patterns' => $this->analyzeConversationPatternsOptimized(),
            'emotional_state' => $this->detectEmotionalStateOptimized(),
            'session_metadata' => $this->getSessionMetadata(),
        ];
    }

    /**
     * 📝 OBTENIR HISTORIQUE CONVERSATION RÉCENT
     */
    protected function getRecentConversationHistory(): array
    {
        $interactions = AgentInteraction::where('user_id', $this->user->id)
            ->where('intelligent_agent_id', $this->agent->id)
            ->where('created_at', '>=', Carbon::now()->subHours(24))
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get(['user_input', 'agent_response', 'interaction_type', 'created_at', 'confidence_score']);

        return $interactions->map(function ($interaction) {
            return [
                'user' => $interaction->user_input,
                'assistant' => $interaction->agent_response,
                'type' => $interaction->interaction_type,
                'timestamp' => $interaction->created_at ? $interaction->created_at->format('H:i') : 'N/A',
                'confidence' => $interaction->confidence_score,
            ];
        })->reverse()->values()->toArray();
    }

    /**
     * 🚀 VERSION BASIQUE PRÉFÉRENCES (Performance optimisée)
     */
    protected function extractUserPreferencesBasic(): array
    {
        return [
            'communication_style' => 'professional',
            'preferred_response_length' => 'medium',
            'preferred_domains' => ['business', 'general'],
            'response_timing' => 'normal',
            'formality_level' => 'professional',
            'detail_preference' => 'balanced',
        ];
    }

    /**
     * 🧠 PRÉFÉRENCES OPTIMISÉES (Intelligence + Performance)
     */
    protected function extractUserPreferencesOptimized(): array
    {
        $cacheKey = "user_prefs_{$this->user->id}";

        return Cache::remember($cacheKey, 1800, function () {
            $interactions = AgentInteraction::where('user_id', $this->user->id)
                ->where('intelligent_agent_id', $this->agent->id)
                ->where('created_at', '>=', Carbon::now()->subDays(7))
                ->select(['user_input', 'agent_response', 'user_satisfaction_rating', 'category'])
                ->limit(50) // Limite intelligente
                ->get();

            return [
                'communication_style' => $this->detectCommunicationStyleSmart($interactions),
                'preferred_response_length' => $this->detectPreferredResponseLengthSmart($interactions),
                'preferred_domains' => $this->getPreferredDomainsSmart($interactions),
                'response_timing' => 'normal',
                'formality_level' => $this->detectFormalityLevelSmart($interactions),
                'detail_preference' => $this->detectDetailPreferenceSmart($interactions),
            ];
        });
    }

    /**
     * 🧠 CONTEXTE OPTIMISÉ (Intelligence + Performance)
     */
    protected function getConversationContextOptimized(): array
    {
        $cacheKey = "conv_context_{$this->user->id}";

        return Cache::remember($cacheKey, 900, function () {
            $lastInteraction = AgentInteraction::where('user_id', $this->user->id)
                ->where('intelligent_agent_id', $this->agent->id)
                ->latest()
                ->first(['user_input', 'agent_response', 'created_at', 'category']);

            if (!$lastInteraction) {
                return [
                    'is_first_interaction' => true,
                    'last_topic' => null,
                    'conversation_mood' => 'welcoming',
                    'context_continuity' => false,
                ];
            }

            return [
                'is_first_interaction' => false,
                'last_topic' => $this->extractTopicFromInteractionSmart($lastInteraction),
                'last_interaction_time' => $lastInteraction->created_at ? $lastInteraction->created_at->diffForHumans() : 'Unknown',
                'conversation_mood' => $this->detectMoodFromInteractionSmart($lastInteraction),
                'context_continuity' => $lastInteraction->created_at ? $lastInteraction->created_at->diffInMinutes() < 30 : false,
                'unresolved_questions' => $this->findUnresolvedQuestionsSmart(),
            ];
        });
    }

    /**
     * 🧠 PROFIL PERSONNALITÉ OPTIMISÉ (Intelligence + Performance)
     */
    protected function buildPersonalityProfileOptimized(): array
    {
        $cacheKey = "personality_{$this->user->id}";

        return Cache::remember($cacheKey, 3600, function () {
            $interactions = AgentInteraction::where('user_id', $this->user->id)
                ->where('intelligent_agent_id', $this->agent->id)
                ->where('created_at', '>=', Carbon::now()->subDays(30))
                ->select(['user_input', 'category', 'user_satisfaction_rating', 'confidence_score'])
                ->limit(100) // Limite intelligente
                ->get();

            return [
                'interaction_frequency' => $this->calculateInteractionFrequencySmart($interactions),
                'question_types' => $this->analyzeQuestionTypesSmart($interactions),
                'response_satisfaction' => $this->calculateResponseSatisfactionSmart($interactions),
                'business_focus' => $this->identifyBusinessFocusSmart($interactions),
                'learning_style' => $this->identifyLearningStyleSmart($interactions),
                'decision_making_style' => $this->analyzeDecisionMakingStyleSmart($interactions),
            ];
        });
    }

    /**
     * 🧠 SUJETS RÉCENTS OPTIMISÉS (Intelligence + Performance)
     */
    protected function getRecentTopicsOptimized(): array
    {
        $cacheKey = "recent_topics_{$this->user->id}";

        return Cache::remember($cacheKey, 600, function () {
            $interactions = AgentInteraction::where('user_id', $this->user->id)
                ->where('intelligent_agent_id', $this->agent->id)
                ->where('created_at', '>=', Carbon::now()->subDays(3))
                ->select(['user_input', 'category'])
                ->limit(20)
                ->get();

            $topics = [];
            foreach ($interactions as $interaction) {
                $topic = $this->extractTopicFromInteractionSmart($interaction);
                if ($topic && !in_array($topic, $topics)) {
                    $topics[] = $topic;
                }
            }

            return array_slice($topics, 0, 5);
        });
    }

    /**
     * 🧠 PATTERNS CONVERSATIONNELS OPTIMISÉS (Intelligence + Performance)
     */
    protected function analyzeConversationPatternsOptimized(): array
    {
        $cacheKey = "conv_patterns_{$this->user->id}";

        return Cache::remember($cacheKey, 1800, function () {
            $interactions = AgentInteraction::where('user_id', $this->user->id)
                ->where('intelligent_agent_id', $this->agent->id)
                ->where('created_at', '>=', Carbon::now()->subDays(14))
                ->select(['created_at', 'user_input', 'interaction_type'])
                ->get();

            return [
                'common_greetings' => $this->findCommonGreetingsSmart($interactions),
                'typical_session_length' => $this->calculateTypicalSessionLengthSmart($interactions),
                'peak_interaction_times' => $this->findPeakInteractionTimesSmart($interactions),
                'question_progression' => $this->analyzeQuestionProgressionSmart($interactions),
                'follow_up_patterns' => $this->analyzeFollowUpPatternsSmart($interactions),
            ];
        });
    }

    /**
     * 🧠 ÉTAT ÉMOTIONNEL OPTIMISÉ (Intelligence + Performance)
     */
    protected function detectEmotionalStateOptimized(): array
    {
        $cacheKey = "emotional_state_{$this->user->id}";

        return Cache::remember($cacheKey, 300, function () {
            $lastInteractions = AgentInteraction::where('user_id', $this->user->id)
                ->where('intelligent_agent_id', $this->agent->id)
                ->where('created_at', '>=', Carbon::now()->subHours(2))
                ->orderBy('created_at', 'desc')
                ->select(['user_input', 'user_satisfaction_rating'])
                ->limit(3)
                ->get();

            if ($lastInteractions->isEmpty()) {
                return ['mood' => 'neutral', 'confidence' => 0.5, 'indicators' => [], 'trend' => 'stable'];
            }

            return $this->analyzeMoodFromMessagesSmart($lastInteractions);
        });
    }

    /**
     * 🚀 VERSION BASIQUE CONTEXTE (Performance optimisée)
     */
    protected function getConversationContextBasic(): array
    {
        $lastInteraction = AgentInteraction::where('user_id', $this->user->id)
            ->where('intelligent_agent_id', $this->agent->id)
            ->latest()
            ->first();

        if (!$lastInteraction) {
            return [
                'is_first_interaction' => true,
                'last_topic' => null,
                'conversation_mood' => 'neutral',
                'context_continuity' => false,
            ];
        }

        return [
            'is_first_interaction' => false,
            'last_topic' => 'general',
            'last_interaction_time' => $lastInteraction->created_at ? $lastInteraction->created_at->diffForHumans() : 'Unknown',
            'conversation_mood' => 'neutral',
            'context_continuity' => $lastInteraction->created_at ? $lastInteraction->created_at->diffInMinutes() < 30 : false,
            'unresolved_questions' => [],
        ];
    }

    /**
     * 🎯 EXTRAIRE PRÉFÉRENCES UTILISATEUR DES CONVERSATIONS (Version complexe)
     */
    protected function extractUserPreferences(): array
    {
        $interactions = AgentInteraction::where('user_id', $this->user->id)
            ->where('intelligent_agent_id', $this->agent->id)
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->get();

        $preferences = [
            'communication_style' => $this->detectCommunicationStyle($interactions),
            'preferred_response_length' => $this->detectPreferredResponseLength($interactions),
            'preferred_domains' => $this->getPreferredDomains($interactions),
            'response_timing' => $this->analyzeResponseTiming($interactions),
            'formality_level' => $this->detectFormalityLevel($interactions),
            'detail_preference' => $this->detectDetailPreference($interactions),
        ];

        return $preferences;
    }

    /**
     * 🔄 OBTENIR CONTEXTE CONVERSATIONNEL
     */
    protected function getConversationContext(): array
    {
        $lastInteraction = AgentInteraction::where('user_id', $this->user->id)
            ->where('intelligent_agent_id', $this->agent->id)
            ->latest()
            ->first();

        if (!$lastInteraction) {
            return [
                'is_first_interaction' => true,
                'last_topic' => null,
                'conversation_mood' => 'neutral',
                'context_continuity' => false,
            ];
        }

        return [
            'is_first_interaction' => false,
            'last_topic' => $this->extractTopicFromInteraction($lastInteraction),
            'last_interaction_time' => $lastInteraction->created_at ? $lastInteraction->created_at->diffForHumans() : 'Unknown',
            'conversation_mood' => $this->detectMoodFromInteraction($lastInteraction),
            'context_continuity' => $this->shouldContinueContext($lastInteraction),
            'unresolved_questions' => $this->findUnresolvedQuestions(),
        ];
    }

    /**
     * 👤 CONSTRUIRE PROFIL PERSONNALITÉ UTILISATEUR
     */
    protected function buildPersonalityProfile(): array
    {
        $interactions = AgentInteraction::where('user_id', $this->user->id)
            ->where('intelligent_agent_id', $this->agent->id)
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->get();

        return [
            'interaction_frequency' => $this->calculateInteractionFrequency($interactions),
            'question_types' => $this->analyzeQuestionTypes($interactions),
            'response_satisfaction' => $this->calculateResponseSatisfaction($interactions),
            'business_focus' => $this->identifyBusinessFocus($interactions),
            'learning_style' => $this->identifyLearningStyle($interactions),
            'decision_making_style' => $this->analyzeDecisionMakingStyle($interactions),
        ];
    }

    /**
     * 📊 OBTENIR SUJETS RÉCENTS
     */
    protected function getRecentTopics(): array
    {
        $interactions = AgentInteraction::where('user_id', $this->user->id)
            ->where('intelligent_agent_id', $this->agent->id)
            ->where('created_at', '>=', Carbon::now()->subDays(3))
            ->get();

        $topics = [];
        foreach ($interactions as $interaction) {
            $topic = $this->extractTopicFromInteraction($interaction);
            if ($topic && !in_array($topic, $topics)) {
                $topics[] = $topic;
            }
        }

        return array_slice($topics, 0, 5);
    }

    /**
     * 🔍 ANALYSER PATTERNS CONVERSATIONNELS
     */
    protected function analyzeConversationPatterns(): array
    {
        $interactions = AgentInteraction::where('user_id', $this->user->id)
            ->where('intelligent_agent_id', $this->agent->id)
            ->where('created_at', '>=', Carbon::now()->subDays(14))
            ->get();

        return [
            'common_greetings' => $this->findCommonGreetings($interactions),
            'typical_session_length' => $this->calculateTypicalSessionLength($interactions),
            'peak_interaction_times' => $this->findPeakInteractionTimes($interactions),
            'question_progression' => $this->analyzeQuestionProgression($interactions),
            'follow_up_patterns' => $this->analyzeFollowUpPatterns($interactions),
        ];
    }

    /**
     * 😊 DÉTECTER ÉTAT ÉMOTIONNEL
     */
    protected function detectEmotionalState(): array
    {
        $lastInteractions = AgentInteraction::where('user_id', $this->user->id)
            ->where('intelligent_agent_id', $this->agent->id)
            ->where('created_at', '>=', Carbon::now()->subHours(2))
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get();

        if ($lastInteractions->isEmpty()) {
            return ['mood' => 'neutral', 'confidence' => 0.5, 'indicators' => []];
        }

        $mood = $this->analyzeMoodFromMessages($lastInteractions);

        return [
            'mood' => $mood['dominant_mood'],
            'confidence' => $mood['confidence'],
            'indicators' => $mood['indicators'],
            'trend' => $mood['trend'], // improving/declining/stable
        ];
    }

    /**
     * ⚙️ OBTENIR MÉTADONNÉES SESSION
     */
    protected function getSessionMetadata(): array
    {
        return [
            'session_start' => now()->format('H:i'),
            'total_interactions_today' => $this->getTodayInteractionCount(),
            'session_number' => $this->getSessionNumber(),
            'last_active' => $this->getLastActiveTime(),
            'preferred_greeting' => $this->getPreferredGreeting(),
        ];
    }

    /**
     * 💾 SAUVEGARDER NOUVEAU MESSAGE DANS MÉMOIRE
     */
    public function saveInteractionToMemory(string $userMessage, string $agentResponse, array $analysis): void
    {
        // Invalider le cache pour forcer le rechargement
        Cache::forget($this->sessionKey);

        // Analyser et sauvegarder les patterns détectés
        $this->updateUserPreferences($userMessage, $analysis);
        $this->updateConversationContext($userMessage, $agentResponse);
        $this->updatePersonalityProfile($userMessage, $analysis);
    }

    /**
     * 🎨 GÉNÉRER PROMPT PERSONNALISÉ AVEC MÉMOIRE
     */
    public function generatePersonalizedPrompt(string $userMessage): string
    {
        $memory = $this->getConversationalMemory();

        $prompt = "MÉMOIRE CONVERSATIONNELLE :\n";

        // Contexte de conversation
        if (!$memory['conversation_context']['is_first_interaction']) {
            $prompt .= "• Ce n'est PAS la première interaction avec cet utilisateur.\n";
            $prompt .= "• Dernière interaction : {$memory['conversation_context']['last_interaction_time']}\n";

            if ($memory['conversation_context']['context_continuity']) {
                $prompt .= "• CONTINUEZ la conversation précédente sur : {$memory['conversation_context']['last_topic']}\n";
            }
        } else {
            $prompt .= "• PREMIÈRE INTERACTION avec cet utilisateur - présentez-vous chaleureusement.\n";
        }

        // Historique récent
        if (!empty($memory['conversation_history'])) {
            $prompt .= "\nHISTORIQUE RÉCENT (dernières interactions) :\n";
            $recent = array_slice($memory['conversation_history'], -3);
            foreach ($recent as $interaction) {
                $prompt .= "• User: " . substr($interaction['user'], 0, 100) . "\n";
                $prompt .= "• Assistant: " . substr($interaction['assistant'], 0, 100) . "\n";
            }
        }

        // Préférences utilisateur
        $preferences = $memory['user_preferences'];
        $prompt .= "\nPRÉFÉRENCES UTILISATEUR :\n";
        $prompt .= "• Style : {$preferences['communication_style']}\n";
        $prompt .= "• Niveau détail : {$preferences['detail_preference']}\n";
        $prompt .= "• Domaines préférés : " . implode(', ', $preferences['preferred_domains']) . "\n";

        // État émotionnel
        $emotional = $memory['emotional_state'] ?? [];
        if (!empty($emotional) && isset($emotional['mood'], $emotional['confidence'])) {
            $prompt .= "\nÉTAT ÉMOTIONNEL DÉTECTÉ : {$emotional['mood']} (confiance: {$emotional['confidence']})\n";
        }

        // Sujets récents
        if (!empty($memory['recent_topics'])) {
            $prompt .= "\nSUJETS RÉCENTS : " . implode(', ', $memory['recent_topics']) . "\n";
        }

        $prompt .= "\nINSTRUCTIONS :\n";
        $prompt .= "• Utilisez cette mémoire pour personnaliser votre réponse\n";
        $prompt .= "• Référez-vous naturellement aux conversations précédentes si pertinent\n";
        $prompt .= "• Adaptez votre ton selon l'état émotionnel et les préférences\n";
        $prompt .= "• NE répétez PAS 'Bonjour' si ce n'est pas la première interaction\n";
        $prompt .= "• Soyez naturel et humain dans la continuité conversationnelle\n\n";

        $prompt .= "MESSAGE UTILISATEUR : " . $userMessage;

        return $prompt;
    }

    // ===== MÉTHODES UTILITAIRES =====

    protected function detectCommunicationStyle($interactions): string
    {
        // Analyser le style basé sur la longueur et le vocabulaire des messages
        $avgLength = $interactions->avg(fn($i) => strlen($i->user_input ?? ''));

        if ($avgLength > 200) return 'detailed';
        if ($avgLength < 50) return 'concise';
        return 'balanced';
    }

    protected function detectPreferredResponseLength($interactions): string
    {
        $satisfactionByLength = [];
        foreach ($interactions as $interaction) {
            $length = strlen($interaction->agent_response ?? '');
            $satisfaction = $interaction->user_satisfaction_rating ?? 3;
            $satisfactionByLength[] = ['length' => $length, 'satisfaction' => $satisfaction];
        }

        // Analyser corrélation longueur/satisfaction
        return 'medium'; // Placeholder
    }

    protected function getPreferredDomains($interactions): array
    {
        return $interactions->groupBy('category')
            ->sortByDesc(fn($group) => $group->count())
            ->keys()
            ->take(3)
            ->toArray();
    }

    protected function extractTopicFromInteraction($interaction): ?string
    {
        $keywords = ['blog', 'contenu', 'conversion', 'revenus', 'analytics', 'business plan'];
        $input = strtolower($interaction->user_input ?? '');

        foreach ($keywords as $keyword) {
            if (strpos($input, $keyword) !== false) {
                return $keyword;
            }
        }

        return null;
    }

    protected function shouldContinueContext($lastInteraction): bool
    {
        return $lastInteraction->created_at ? $lastInteraction->created_at->diffInMinutes() < 30 : false;
    }

    protected function analyzeMoodFromMessages($interactions): array
    {
        $positiveWords = ['merci', 'excellent', 'parfait', 'super', 'génial'];
        $negativeWords = ['problème', 'erreur', 'bug', 'difficile', 'frustrant'];

        $score = 0;
        $indicators = [];

        foreach ($interactions as $interaction) {
            $text = strtolower($interaction->user_input ?? '');

            foreach ($positiveWords as $word) {
                if (strpos($text, $word) !== false) {
                    $score += 1;
                    $indicators[] = "Mot positif: $word";
                }
            }

            foreach ($negativeWords as $word) {
                if (strpos($text, $word) !== false) {
                    $score -= 1;
                    $indicators[] = "Mot négatif: $word";
                }
            }
        }

        if ($score > 0) return ['dominant_mood' => 'positive', 'confidence' => 0.7, 'indicators' => $indicators, 'trend' => 'stable'];
        if ($score < 0) return ['dominant_mood' => 'negative', 'confidence' => 0.7, 'indicators' => $indicators, 'trend' => 'stable'];
        return ['dominant_mood' => 'neutral', 'confidence' => 0.5, 'indicators' => $indicators, 'trend' => 'stable'];
    }

    protected function getTodayInteractionCount(): int
    {
        return AgentInteraction::where('user_id', $this->user->id)
            ->where('intelligent_agent_id', $this->agent->id)
            ->whereDate('created_at', today())
            ->count();
    }

    protected function getPreferredGreeting(): string
    {
        $morning = ['Bonjour', 'Salut', 'Hello'];
        $hour = now()->hour;

        if ($hour < 12) return $morning[array_rand($morning)];
        if ($hour < 18) return 'Bon après-midi';
        return 'Bonsoir';
    }

    // Placeholders pour les autres méthodes utilitaires
    protected function analyzeResponseTiming($interactions): string { return 'normal'; }
    protected function detectFormalityLevel($interactions): string { return 'professional'; }
    protected function detectDetailPreference($interactions): string { return 'balanced'; }
    protected function detectMoodFromInteraction($interaction): string { return 'neutral'; }
    protected function findUnresolvedQuestions(): array { return []; }
    protected function calculateInteractionFrequency($interactions): string { return 'regular'; }
    protected function analyzeQuestionTypes($interactions): array { return ['business', 'technical']; }
    protected function calculateResponseSatisfaction($interactions): float { return 0.8; }
    protected function identifyBusinessFocus($interactions): array { return ['growth', 'analytics']; }
    protected function identifyLearningStyle($interactions): string { return 'practical'; }
    protected function analyzeDecisionMakingStyle($interactions): string { return 'analytical'; }
    protected function findCommonGreetings($interactions): array { return ['Bonjour', 'Salut']; }
    protected function calculateTypicalSessionLength($interactions): string { return '5-10 minutes'; }
    protected function findPeakInteractionTimes($interactions): array { return ['09:00-11:00', '14:00-16:00']; }
    protected function analyzeQuestionProgression($interactions): array { return ['simple', 'complex', 'specific']; }
    protected function analyzeFollowUpPatterns($interactions): array { return ['clarification', 'deep_dive']; }
    protected function getSessionNumber(): int { return 1; }
    protected function getLastActiveTime(): string { return '2 minutes ago'; }
    protected function updateUserPreferences($message, $analysis): void {}
    protected function updateConversationContext($userMessage, $agentResponse): void {}
    protected function updatePersonalityProfile($message, $analysis): void {}

    // 🧠 MÉTHODES INTELLIGENTES OPTIMISÉES (Performance + Intelligence)
    protected function detectCommunicationStyleSmart($interactions): string
    {
        $avgLength = $interactions->avg(fn($i) => strlen($i->user_input ?? ''));
        $questionCount = $interactions->filter(fn($i) => str_contains($i->user_input ?? '', '?'))->count();

        if ($avgLength > 200 && $questionCount > $interactions->count() * 0.3) return 'detailed_analytical';
        if ($avgLength < 50) return 'concise';
        if ($questionCount > $interactions->count() * 0.6) return 'inquisitive';
        return 'balanced';
    }

    protected function detectPreferredResponseLengthSmart($interactions): string
    {
        $avgResponseLength = $interactions->avg(fn($i) => strlen($i->agent_response ?? ''));
        $satisfactionScores = $interactions->pluck('user_satisfaction_rating')->filter();

        if ($avgResponseLength > 1000 && $satisfactionScores->avg() > 4) return 'detailed';
        if ($avgResponseLength < 300) return 'concise';
        return 'medium';
    }

    protected function getPreferredDomainsSmart($interactions): array
    {
        return $interactions->groupBy('category')
            ->sortByDesc(fn($group) => $group->count())
            ->keys()
            ->take(3)
            ->toArray();
    }

    protected function detectFormalityLevelSmart($interactions): string
    {
        $formalWords = ['monsieur', 'madame', 'pourriez-vous', 'veuillez', 'cordialement'];
        $casualWords = ['salut', 'merci', 'ok', 'cool', 'super'];

        $formalCount = 0;
        $casualCount = 0;

        foreach ($interactions as $interaction) {
            $text = strtolower($interaction->user_input ?? '');
            foreach ($formalWords as $word) {
                if (strpos($text, $word) !== false) $formalCount++;
            }
            foreach ($casualWords as $word) {
                if (strpos($text, $word) !== false) $casualCount++;
            }
        }

        if ($formalCount > $casualCount) return 'formal';
        if ($casualCount > $formalCount * 2) return 'casual';
        return 'professional';
    }

    protected function detectDetailPreferenceSmart($interactions): string
    {
        $detailWords = ['détail', 'explication', 'pourquoi', 'comment', 'exemple'];
        $quickWords = ['rapide', 'résumé', 'bref', 'simple'];

        $detailCount = 0;
        $quickCount = 0;

        foreach ($interactions as $interaction) {
            $text = strtolower($interaction->user_input ?? '');
            foreach ($detailWords as $word) {
                if (strpos($text, $word) !== false) $detailCount++;
            }
            foreach ($quickWords as $word) {
                if (strpos($text, $word) !== false) $quickCount++;
            }
        }

        if ($detailCount > $quickCount) return 'detailed';
        if ($quickCount > $detailCount) return 'concise';
        return 'balanced';
    }

    protected function extractTopicFromInteractionSmart($interaction): ?string
    {
        $keywords = [
            'blog' => ['blog', 'article', 'contenu', 'rédaction', 'publication'],
            'analytics' => ['analytics', 'statistique', 'données', 'performance', 'métriques'],
            'business' => ['business', 'entreprise', 'stratégie', 'croissance', 'développement'],
            'technical' => ['technique', 'problème', 'bug', 'erreur', 'fonctionnement', 'aide'],
            'conversion' => ['conversion', 'vente', 'client', 'revenus', 'profit'],
            'marketing' => ['marketing', 'promotion', 'publicité', 'campagne', 'social']
        ];

        $input = strtolower($interaction->user_input ?? '');

        foreach ($keywords as $topic => $words) {
            foreach ($words as $word) {
                if (strpos($input, $word) !== false) {
                    return $topic;
                }
            }
        }

        return $interaction->category ?? 'general';
    }

    protected function detectMoodFromInteractionSmart($interaction): string
    {
        $positiveWords = ['merci', 'excellent', 'parfait', 'super', 'génial'];
        $negativeWords = ['problème', 'erreur', 'difficile', 'frustrant'];

        $text = strtolower($interaction->user_input ?? '');

        foreach ($positiveWords as $word) {
            if (strpos($text, $word) !== false) return 'positive';
        }
        foreach ($negativeWords as $word) {
            if (strpos($text, $word) !== false) return 'negative';
        }

        return 'neutral';
    }

    protected function findUnresolvedQuestionsSmart(): array
    {
        // Analyser les questions sans réponse satisfaisante
        return []; // Implémentation future
    }

    protected function analyzeMoodFromMessagesSmart($interactions): array
    {
        $positiveWords = ['merci', 'excellent', 'parfait', 'super', 'génial', 'top', 'formidable'];
        $negativeWords = ['problème', 'erreur', 'bug', 'difficile', 'frustrant', 'nul', 'mauvais'];

        $score = 0;
        $indicators = [];

        foreach ($interactions as $interaction) {
            $text = strtolower($interaction->user_input ?? '');
            $satisfaction = $interaction->user_satisfaction_rating ?? 3;

            // Analyser les mots
            foreach ($positiveWords as $word) {
                if (strpos($text, $word) !== false) {
                    $score += 1;
                    $indicators[] = "Expression positive: $word";
                }
            }
            foreach ($negativeWords as $word) {
                if (strpos($text, $word) !== false) {
                    $score -= 1;
                    $indicators[] = "Expression négative: $word";
                }
            }

            // Analyser la satisfaction
            if ($satisfaction >= 4) $score += 0.5;
            if ($satisfaction <= 2) $score -= 0.5;
        }

        $confidence = min(0.9, max(0.3, abs($score) / ($interactions->count() + 1)));

        if ($score > 0) {
            return [
                'dominant_mood' => 'positive',
                'confidence' => $confidence,
                'indicators' => $indicators,
                'trend' => 'stable',
                'emotional_intensity' => min(1.0, $score / 3)
            ];
        }

        if ($score < 0) {
            return [
                'dominant_mood' => 'negative',
                'confidence' => $confidence,
                'indicators' => $indicators,
                'trend' => 'stable',
                'emotional_intensity' => min(1.0, abs($score) / 3)
            ];
        }

        return [
            'dominant_mood' => 'neutral',
            'confidence' => 0.5,
            'indicators' => $indicators,
            'trend' => 'stable',
            'emotional_intensity' => 0.2
        ];
    }

    // Méthodes intelligentes pour profil personnalité
    protected function calculateInteractionFrequencySmart($interactions): string
    {
        $days = $interactions->filter(fn($i) => $i->created_at !== null)
                            ->groupBy(fn($i) => $i->created_at->format('Y-m-d'))
                            ->count();
        $avgPerDay = $interactions->count() / max(1, $days);

        if ($avgPerDay > 10) return 'very_high';
        if ($avgPerDay > 5) return 'high';
        if ($avgPerDay > 2) return 'regular';
        if ($avgPerDay > 0.5) return 'occasional';
        return 'rare';
    }

    protected function analyzeQuestionTypesSmart($interactions): array
    {
        $types = [];
        foreach ($interactions as $interaction) {
            $text = strtolower($interaction->user_input ?? '');
            if (strpos($text, 'comment') !== false) $types[] = 'how_to';
            if (strpos($text, 'pourquoi') !== false) $types[] = 'explanation';
            if (strpos($text, 'analyse') !== false) $types[] = 'analysis';
            if (str_contains($text, '?')) $types[] = 'question';
        }
        return array_unique($types);
    }

    protected function calculateResponseSatisfactionSmart($interactions): float
    {
        $satisfactionScores = $interactions->pluck('user_satisfaction_rating')->filter();
        return $satisfactionScores->isEmpty() ? 0.75 : $satisfactionScores->avg();
    }

    protected function identifyBusinessFocusSmart($interactions): array
    {
        $focuses = [];
        foreach ($interactions as $interaction) {
            $category = $interaction->category ?? 'general';
            if (!in_array($category, $focuses)) {
                $focuses[] = $category;
            }
        }
        return array_slice($focuses, 0, 3);
    }

    protected function identifyLearningStyleSmart($interactions): string
    {
        $avgLength = $interactions->avg(fn($i) => strlen($i->user_input ?? ''));
        $questionRatio = $interactions->filter(fn($i) => str_contains($i->user_input ?? '', '?'))->count() / max(1, $interactions->count());

        if ($questionRatio > 0.7) return 'inquisitive';
        if ($avgLength > 150) return 'analytical';
        if ($avgLength < 50) return 'practical';
        return 'adaptive';
    }

    protected function analyzeDecisionMakingStyleSmart($interactions): string
    {
        $analyticalWords = ['analyse', 'comparaison', 'données', 'statistique'];
        $quickWords = ['rapide', 'maintenant', 'urgent', 'vite'];

        $analyticalCount = 0;
        $quickCount = 0;

        foreach ($interactions as $interaction) {
            $text = strtolower($interaction->user_input ?? '');
            foreach ($analyticalWords as $word) {
                if (strpos($text, $word) !== false) $analyticalCount++;
            }
            foreach ($quickWords as $word) {
                if (strpos($text, $word) !== false) $quickCount++;
            }
        }

        if ($analyticalCount > $quickCount) return 'analytical';
        if ($quickCount > $analyticalCount) return 'intuitive';
        return 'balanced';
    }

    // Méthodes intelligentes pour patterns conversationnels
    protected function findCommonGreetingsSmart($interactions): array
    {
        $greetings = [];
        foreach ($interactions as $interaction) {
            $text = trim(strtolower($interaction->user_input ?? ''));
            $firstWords = explode(' ', $text);
            $firstWord = $firstWords[0] ?? '';

            if (in_array($firstWord, ['bonjour', 'salut', 'hello', 'bonsoir', 'hey'])) {
                if (!in_array($firstWord, $greetings)) {
                    $greetings[] = $firstWord;
                }
            }
        }
        return $greetings;
    }

    protected function calculateTypicalSessionLengthSmart($interactions): string
    {
        $sessions = $this->groupInteractionsBySessionsSmart($interactions);
        $avgLength = $sessions->avg();

        if ($avgLength > 10) return '10+ minutes';
        if ($avgLength > 5) return '5-10 minutes';
        if ($avgLength > 2) return '2-5 minutes';
        return '< 2 minutes';
    }

    protected function findPeakInteractionTimesSmart($interactions): array
    {
        $hourCounts = $interactions->filter(fn($i) => $i->created_at !== null)->groupBy(fn($i) => $i->created_at->hour)
            ->map->count()
            ->sortDesc()
            ->take(3);

        return $hourCounts->keys()->map(fn($hour) => sprintf('%02d:00-%02d:00', $hour, $hour + 1))->toArray();
    }

    protected function analyzeQuestionProgressionSmart($interactions): array
    {
        // Analyser la complexité croissante des questions
        return ['simple', 'intermediate', 'complex']; // Implémentation simplifiée
    }

    protected function analyzeFollowUpPatternsSmart($interactions): array
    {
        $patterns = [];
        $followUpWords = ['aussi', 'également', 'en plus', 'autre', 'et si'];

        foreach ($interactions as $interaction) {
            $text = strtolower($interaction->user_input ?? '');
            foreach ($followUpWords as $word) {
                if (strpos($text, $word) !== false) {
                    $patterns[] = 'elaboration';
                    break;
                }
            }
        }

        return array_unique($patterns);
    }

    protected function groupInteractionsBySessionsSmart($interactions): \Illuminate\Support\Collection
    {
        $sessions = [];
        $currentSession = [];
        $lastTime = null;

        foreach ($interactions as $interaction) {
            if ($lastTime && $interaction->created_at && $interaction->created_at->diffInMinutes($lastTime) > 30) {
                if (!empty($currentSession)) {
                    $sessions[] = count($currentSession);
                    $currentSession = [];
                }
            }
            $currentSession[] = $interaction;
            $lastTime = $interaction->created_at ?: $lastTime;
        }

        if (!empty($currentSession)) {
            $sessions[] = count($currentSession);
        }

        return collect($sessions);
    }
}