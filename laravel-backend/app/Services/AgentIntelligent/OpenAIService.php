<?php

namespace App\Services\AgentIntelligent;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class OpenAIService
{
    protected string $apiKey;
    protected string $baseUrl = 'https://api.openai.com/v1';

    public function __construct()
    {
        $this->apiKey = env('OPENAI_API_KEY');

        if (!$this->apiKey) {
            throw new Exception('Clé API OpenAI manquante dans .env');
        }
    }

    /**
     * ✅ GÉNÉRER RÉPONSE INTELLIGENTE AVEC CONTEXTE COMPLET
     */
    public function generateIntelligentResponse(
        string $userMessage,
        array $context,
        string $domain = 'general',
        string $userTier = 'free'
    ): array {

        $systemPrompt = $this->buildSystemPrompt($domain, $userTier, $context);
        $userPrompt = $this->buildUserPrompt($userMessage, $context);

        Log::info("🤖 Tentative appel OpenAI", [
            'domain' => $domain,
            'tier' => $userTier,
            'message_length' => strlen($userMessage),
            'has_api_key' => !empty($this->apiKey)
        ]);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])
            ->timeout(30)
            ->post($this->baseUrl . '/chat/completions', [
                'model' => $this->selectModel($userTier),
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $systemPrompt
                    ],
                    [
                        'role' => 'user',
                        'content' => $userPrompt
                    ]
                ],
                'max_tokens' => $this->getMaxTokens($userTier),
                'temperature' => $this->getTemperature($domain),
                'presence_penalty' => 0.1,
                'frequency_penalty' => 0.1,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                Log::info("✅ OpenAI réponse reçue", [
                    'domain' => $domain,
                    'model' => $data['model'] ?? '',
                    'tokens_used' => $data['usage']['total_tokens'] ?? 0
                ]);

                return [
                    'success' => true,
                    'response' => $data['choices'][0]['message']['content'],
                    'usage' => $data['usage'] ?? [],
                    'model' => $data['model'] ?? '',
                    'domain' => $domain,
                    'tier' => $userTier
                ];
            }

            Log::error('❌ Erreur OpenAI API', [
                'status' => $response->status(),
                'body' => $response->body(),
                'domain' => $domain
            ]);

            return $this->getFallbackResponse($userMessage, $domain);

        } catch (Exception $e) {
            Log::error('❌ Exception OpenAI Service', [
                'message' => $e->getMessage(),
                'user_message' => $userMessage,
                'domain' => $domain,
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);

            return $this->getFallbackResponse($userMessage, $domain);
        }
    }

    /**
     * ✅ CONSTRUIRE PROMPT SYSTÈME AVEC CONTEXTE BUSINESS
     */
    protected function buildSystemPrompt(string $domain, string $userTier, array $context): string
    {
        $userName = $context['user_profile']['name'] ?? 'l\'utilisateur';

        // ── IDENTITÉ ──────────────────────────────────────────────────────────
        $p  = "Tu es PIXEL, l'assistant intelligent de la plateforme Pixel Rise.\n";
        $p .= "Tu aides les gestionnaires d'hôtels, de lodges et de sites touristiques à gérer leur activité au quotidien.\n";
        $p .= "Tu es proactif, précis, chaleureux et tu anticipes les besoins avant même qu'on te le demande.\n";
        $p .= "Tu connais parfaitement la situation actuelle de l'utilisateur grâce aux données réelles ci-dessous.\n\n";

        $p .= "⚠️ RÈGLE ABSOLUE : Tu réponds TOUJOURS en FRANÇAIS.\n\n";

        // ── STYLE ─────────────────────────────────────────────────────────────
        $p .= "📝 STYLE:\n";
        $p .= "- Emojis pertinents (✅ 📊 🏨 🛎️ 📅 ⚠️ 💡 🚪 etc.)\n";
        $p .= "- Paragraphes aérés, **gras** pour les points clés\n";
        $p .= "- Listes à puces pour les énumérations, numérotées pour les étapes\n";
        $p .= "- Si tu détectes une urgence ou anomalie, commence par ⚠️ et explique clairement\n";
        $p .= "- Quand tu proposes une action cliquable, insère un bloc ACTION sur sa propre ligne:\n";
        $p .= "  [ACTION: confirm:ID|Confirmer]   → confirme la réservation ID\n";
        $p .= "  [ACTION: cancel:ID|Annuler]      → annule la réservation ID\n";
        $p .= "  [ACTION: checkin:ID|Check-in]    → fait le check-in de la réservation ID\n";
        $p .= "  [ACTION: checkout:ID|Check-out]  → fait le check-out de la réservation ID\n";
        $p .= "  [ACTION: navigate:/chemin|Ouvrir] → redirige vers une page de l'app\n";
        $p .= "- N'utilise les blocs ACTION que lorsqu'une action réelle est pertinente (ex: réservation en attente).\n";
        $p .= "- Tu peux aussi insérer des liens markdown internes cliquables pour guider l'utilisateur:\n";
        $p .= "  [Voir mes réservations](/dashboard/site/SITE_ID/reservations)\n";
        $p .= "  [Aller au planning](/dashboard/site/SITE_ID/calendar)\n";
        $p .= "  [Mon site web](/site-builder/editor/SITE_ID)\n";
        $p .= "  [Studio domaine](/studio-domaine)\n";
        $p .= "  [Facturation](/billing)\n";
        $p .= "  Ces liens s'ouvrent directement dans l'application (pas de rechargement de page).\n\n";

        // ── PLAN UTILISATEUR ──────────────────────────────────────────────────
        $tierLabel = match($userTier) {
            'premium'    => 'Entreprise',
            'enterprise' => 'Entreprise',
            'free'       => 'Gratuit',
            'starter'    => 'Starter',
            default      => ucfirst($userTier),
        };
        $p .= "👤 UTILISATEUR: **{$userName}** — Plan **{$tierLabel}**\n";

        // ── MÉMOIRE CONVERSATIONNELLE ─────────────────────────────────────────
        if (!empty($context['conversational_memory'])) {
            $memory = $context['conversational_memory'];
            if (!empty($memory['recent_history'])) {
                $p .= "\n🧠 HISTORIQUE RÉCENT (dernières 24h):\n";
                foreach (array_slice($memory['recent_history'], -5) as $h) {
                    $role = ($h['role'] ?? '') === 'user' ? 'Utilisateur' : 'Toi';
                    $msg  = substr($h['content'] ?? '', 0, 200);
                    $p .= "- {$role}: {$msg}\n";
                }
            }
            if (!empty($memory['emotional_state']['mood']) && $memory['emotional_state']['mood'] === 'negative') {
                $p .= "⚠️ L'utilisateur semble frustré — sois particulièrement attentif et rassurant.\n";
            }
        }

        // ── DOMAINE DE QUESTION ───────────────────────────────────────────────
        $domainInstructions = match($domain) {
            'booking', 'reservation', 'hébergement' =>
                "Tu es en mode **Gestion des réservations** : check-ins, check-outs, disponibilités, tarifs, clients.",
            'planning' =>
                "Tu es en mode **Planning** : vision calendaire, occupation, anticipation des arrivées/départs.",
            'analytics' =>
                "Tu es en mode **Analyse** : KPIs, taux d'occupation, revenus, tendances, comparaisons.",
            'site', 'website' =>
                "Tu es en mode **Site Web** : éditeur Pixel Rise, sections, design, publication, SEO.",
            'technical' =>
                "Tu es en mode **Support technique** : résolution de problèmes sur la plateforme.",
            default =>
                "Tu es en mode **Général** : réponds à toute question sur la gestion de l'activité.",
        };
        $p .= "\n🎯 DOMAINE ACTIF: {$domainInstructions}\n";

        // ── CONTEXTE BOOKING RÉEL ─────────────────────────────────────────────
        if (!empty($context['booking_context']) && ($context['booking_context']['has_booking'] ?? false)) {
            $bk = $context['booking_context'];
            $p .= "\n🏨 DONNÉES BOOKING EN TEMPS RÉEL:\n";
            $p .= "- Réservations actives: {$bk['active_reservations']} / {$bk['total_reservations']} au total\n";
            $p .= "- Revenus ce mois: {$bk['monthly_revenue']} MGA\n";

            if ($bk['checkins_today'] > 0) {
                $p .= "- ⚠️ CHECK-INS AUJOURD'HUI: {$bk['checkins_today']} arrivée(s) prévue(s)\n";
                foreach ($bk['checkins_today_list'] as $c) {
                    $p .= "  → Client: {$c['client']} (statut: {$c['status']})\n";
                }
            }

            if ($bk['checkouts_today'] > 0) {
                $p .= "- ⚠️ CHECK-OUTS AUJOURD'HUI: {$bk['checkouts_today']} départ(s) prévu(s)\n";
                foreach ($bk['checkouts_today_list'] as $c) {
                    $p .= "  → Client: {$c['client']}\n";
                }
            }

            if ($bk['pending_confirmations'] > 0) {
                $p .= "- 🔔 EN ATTENTE DE CONFIRMATION: {$bk['pending_confirmations']} réservation(s)\n";
                foreach ($bk['pending_list'] as $r) {
                    $p .= "  → {$r['client']} (arrivée: {$r['start_date']}) — ID:{$r['id']}\n";
                }
            }

            if ($bk['overdue_checkouts'] > 0) {
                $p .= "- 🚨 SÉJOURS DÉPASSÉS NON CLÔTURÉS: {$bk['overdue_checkouts']} cas\n";
                foreach ($bk['overdue_list'] as $r) {
                    $p .= "  → {$r['client']} (devait partir le {$r['end_date']}) — ID:{$r['id']}\n";
                }
            }

            $p .= "- Arrivées dans 7 jours: {$bk['upcoming_7days']}\n";
        }

        // ── CONTEXTE SITE BUILDER RÉEL ────────────────────────────────────────
        if (!empty($context['site_builder_context']) && ($context['site_builder_context']['has_sites'] ?? false)) {
            $sb = $context['site_builder_context'];
            $p .= "\n🌐 SITES WEB:\n";
            $p .= "- {$sb['total_sites']} site(s) : {$sb['published']} publié(s), {$sb['draft']} brouillon(s)\n";
            foreach ($sb['sites_list'] as $s) {
                $p .= "  → \"{$s['name']}\" — statut: {$s['status']}, plan: {$s['plan']}, ID: {$s['id']}\n";
                $p .= "     Liens directs: [Réservations](/dashboard/site/{$s['id']}/reservations) | [Éditeur](/site-builder/editor/{$s['id']}) | [Planning](/dashboard/site/{$s['id']}/calendar)\n";
            }
        }

        // ── WORKSPACE ────────────────────────────────────────────────────────
        if (!empty($context['workspace_context']) && ($context['workspace_context']['has_workspace'] ?? false)) {
            $ws = $context['workspace_context'];
            $tierLabel = $ws['plan'] === 'premium' ? 'Entreprise' : ucfirst($ws['plan'] ?? 'Free');
            $p .= "\n🏢 WORKSPACE: \"{$ws['workspace_name']}\" — Plan: {$tierLabel} — {$ws['members_count']} membre(s)\n";
        }

        // ── DOMAINES ─────────────────────────────────────────────────────────
        if (!empty($context['domain_context'])) {
            $dm = $context['domain_context'];
            if ($dm['has_domains'] ?? false) {
                $p .= "\n🌍 DOMAINES: {$dm['total_domains']} domaine(s), {$dm['active_domains']} actif(s)\n";
            }
            if (($dm['pending_studio_requests'] ?? 0) > 0) {
                $p .= "  → {$dm['pending_studio_requests']} demande(s) Studio en attente\n";
            }
        }

        // ── MARKETPLACE ───────────────────────────────────────────────────────
        if (!empty($context['marketplace_context']) && ($context['marketplace_context']['has_marketplace'] ?? false)) {
            $mk = $context['marketplace_context'];
            $p .= "\n🛒 MARKETPLACE: {$mk['total_products']} produit(s) ({$mk['active_products']} actifs), {$mk['pending_orders']} commande(s) en attente, revenus mois: {$mk['monthly_revenue']}\n";
        }

        // ── CRÉDITS ───────────────────────────────────────────────────────────
        if (!empty($context['credits_context'])) {
            $cr = $context['credits_context'];
            $p .= "\n💳 CRÉDITS: solde = {$cr['balance']}\n";
        }

        // ── DOCUMENTS PARTAGÉS ────────────────────────────────────────────────
        if (!empty($context['shared_documents_context']['is_active'])
            && !empty($context['shared_documents_context']['shared_content'])) {
            $docs = $context['shared_documents_context'];
            $p .= "\n📄 DOCUMENTS ANALYSÉS ({$docs['total_shared_documents']}):\n";
            $p .= substr($docs['shared_content'], 0, 2000) . "\n";
        }

        // ── RÈGLES FINALES ────────────────────────────────────────────────────────
        $p .= "\n🚨 RÈGLES:\n";
        $p .= "- Utilise les données réelles ci-dessus. JAMAIS 'je n'ai pas accès'.\n";
        $p .= "- Si données vides : dis-le clairement et propose la prochaine étape.\n";
        $p .= "- Pour les actions possibles, termine par un bloc [ACTION: type:id].\n";
        $p .= "- Pas de salutation si la conversation est déjà en cours.\n";

        return $p;
    }

    private function _DEPRECATED_all_database_block_DO_NOT_USE(): void
    {
        // Code conservé temporairement pour référence — ne pas utiliser
        if (!empty($context['all_database_data'])) {
            $allData = $context['all_database_data'];
            $basePrompt .= "\n\n🚀 DONNÉES RÉELLES DE L'UTILISATEUR {$context['user_name']}:\n";

            // Compter et détailler les données disponibles
            $totalData = 0;
            $dataDetails = [];

            foreach ($allData as $table => $data) {
                if (!empty($data) && count($data) > 0) {
                    $totalData += count($data);
                    $dataDetails[] = "- {$table}: " . count($data) . " entrée(s)";

                    // Ajouter des détails spécifiques pour les tables importantes
                    if ($table === 'projects' && count($data) > 0) {
                        // Convertir Collection en array et filtrer projets actifs
                        $projectsArray = collect($data)->toArray();
                        $activeProjects = count(array_filter($projectsArray, function($p) {
                            // Gérer à la fois les objets et les arrays
                            $status = is_object($p) ? ($p->status ?? '') : ($p['status'] ?? '');
                            return $status === 'active';
                        }));
                        $dataDetails[] = "  → Projets actifs: {$activeProjects}";
                    }

                    if ($table === 'tickets' && count($data) > 0) {
                        // Analyser les tickets par statut
                        $ticketsArray = collect($data)->toArray();
                        $openTickets = count(array_filter($ticketsArray, function($t) {
                            $status = is_object($t) ? ($t->status ?? '') : ($t['status'] ?? '');
                            return in_array($status, ['open', 'pending', 'new', 'unread']);
                        }));
                        $dataDetails[] = "  → Tickets ouverts/non lus: {$openTickets}";
                    }

                    if ($table === 'ticket_messages' && count($data) > 0) {
                        $dataDetails[] = "  → Messages de support disponibles";
                    }
                }
            }

            if ($totalData > 0) {
                $basePrompt .= implode("\n", $dataDetails) . "\n";
                $basePrompt .= "\nTOTAL: {$totalData} entrées de données RÉELLES analysées.\n";

                // 🚨 FORCER **TOUS** LES DÉTAILS COMPLETS DANS LE PROMPT
                $basePrompt .= "\n🔥 **PROFIL COMPLET CLIENT** - TOUTES SES DONNÉES:\n";

                // 📋 PROJETS COMPLETS
                if (!empty($allData['projects'])) {
                    $projects = collect($allData['projects'])->take(5);
                    $basePrompt .= "\n📋 PROJETS DU CLIENT:\n";
                    foreach ($projects as $project) {
                        $name = is_object($project) ? ($project->name ?? 'Sans nom') : ($project['name'] ?? 'Sans nom');
                        $description = is_object($project) ? ($project->description ?? '') : ($project['description'] ?? '');
                        $status = is_object($project) ? ($project->status ?? '') : ($project['status'] ?? '');
                        $budget = is_object($project) ? ($project->budget ?? '') : ($project['budget'] ?? '');
                        $deadline = is_object($project) ? ($project->deadline ?? '') : ($project['deadline'] ?? '');
                        $basePrompt .= "• Projet: \"{$name}\" - Status: {$status}";
                        if ($budget) $basePrompt .= " - Budget: {$budget}";
                        if ($deadline) $basePrompt .= " - Échéance: {$deadline}";
                        $basePrompt .= "\n";
                        if ($description) $basePrompt .= "  Description: " . substr($description, 0, 300) . "\n";
                    }
                }

                // 💼 BUSINESS PLANS COMPLETS
                if (!empty($allData['business_plans'])) {
                    $businessPlans = collect($allData['business_plans'])->take(5);
                    $basePrompt .= "\n💼 BUSINESS PLANS DU CLIENT:\n";
                    foreach ($businessPlans as $plan) {
                        $id = is_object($plan) ? ($plan->id ?? '') : ($plan['id'] ?? '');
                        $executiveSummary = is_object($plan) ? ($plan->executive_summary ?? '') : ($plan['executive_summary'] ?? '');
                        $marketAnalysis = is_object($plan) ? ($plan->market_analysis ?? '') : ($plan['market_analysis'] ?? '');
                        $businessModel = is_object($plan) ? ($plan->business_model ?? '') : ($plan['business_model'] ?? '');
                        $financialProjections = is_object($plan) ? ($plan->financial_projections ?? '') : ($plan['financial_projections'] ?? '');
                        $status = is_object($plan) ? ($plan->status ?? '') : ($plan['status'] ?? '');

                        $basePrompt .= "• Business Plan ID: {$id} - Status: {$status}\n";
                        if ($executiveSummary) $basePrompt .= "  Résumé exécutif: " . substr($executiveSummary, 0, 200) . "\n";
                        if ($marketAnalysis) $basePrompt .= "  Analyse marché: " . substr($marketAnalysis, 0, 150) . "\n";
                        if ($businessModel) $basePrompt .= "  Modèle business: " . substr($businessModel, 0, 150) . "\n";
                        if ($financialProjections) $basePrompt .= "  Projections financières: " . substr($financialProjections, 0, 150) . "\n";
                    }
                }

                // 📝 CONTENU COMPLET (Blog + Social)
                if (!empty($allData['blog_posts'])) {
                    $posts = collect($allData['blog_posts'])->take(5);
                    $basePrompt .= "\n📝 ARTICLES BLOG DU CLIENT:\n";
                    foreach ($posts as $post) {
                        $title = is_object($post) ? ($post->title ?? 'Sans titre') : ($post['title'] ?? 'Sans titre');
                        $content = is_object($post) ? ($post->content ?? '') : ($post['content'] ?? '');
                        $status = is_object($post) ? ($post->status ?? '') : ($post['status'] ?? '');
                        $views = is_object($post) ? ($post->views ?? 0) : ($post['views'] ?? 0);
                        $basePrompt .= "• Article: \"{$title}\" - Status: {$status} - Vues: {$views}\n";
                        if ($content) $basePrompt .= "  Extrait: " . substr($content, 0, 200) . "...\n";
                    }
                }

                if (!empty($allData['social_media_posts'])) {
                    $socialPosts = collect($allData['social_media_posts'])->take(5);
                    $basePrompt .= "\n📱 POSTS RÉSEAUX SOCIAUX DU CLIENT:\n";
                    foreach ($socialPosts as $post) {
                        $content = is_object($post) ? ($post->content ?? 'Sans contenu') : ($post['content'] ?? 'Sans contenu');
                        $platform = is_object($post) ? ($post->platform ?? '') : ($post['platform'] ?? '');
                        $likes = is_object($post) ? ($post->likes ?? 0) : ($post['likes'] ?? 0);
                        $shares = is_object($post) ? ($post->shares ?? 0) : ($post['shares'] ?? 0);
                        $basePrompt .= "• Post {$platform}: \"" . substr($content, 0, 100) . "\" - Likes: {$likes}, Partages: {$shares}\n";
                    }
                }

                // 👥 CLIENTS COMPLETS
                if (!empty($allData['customers'])) {
                    $customers = collect($allData['customers'])->take(5);
                    $basePrompt .= "\n👥 CLIENTS DU BUSINESS:\n";
                    foreach ($customers as $customer) {
                        $name = is_object($customer) ? ($customer->name ?? 'Sans nom') : ($customer['name'] ?? 'Sans nom');
                        $email = is_object($customer) ? ($customer->email ?? '') : ($customer['email'] ?? '');
                        $phone = is_object($customer) ? ($customer->phone ?? '') : ($customer['phone'] ?? '');
                        $status = is_object($customer) ? ($customer->status ?? '') : ($customer['status'] ?? '');
                        $basePrompt .= "• Client: \"{$name}\"";
                        if ($email) $basePrompt .= " - Email: {$email}";
                        if ($phone) $basePrompt .= " - Tél: {$phone}";
                        if ($status) $basePrompt .= " - Status: {$status}";
                        $basePrompt .= "\n";
                    }
                }

                // 💰 COMMANDES COMPLÈTES
                if (!empty($allData['orders'])) {
                    $orders = collect($allData['orders'])->take(5);
                    $basePrompt .= "\n💰 COMMANDES DU CLIENT:\n";
                    foreach ($orders as $order) {
                        $id = is_object($order) ? ($order->id ?? '') : ($order['id'] ?? '');
                        $total = is_object($order) ? ($order->total ?? 0) : ($order['total'] ?? 0);
                        $status = is_object($order) ? ($order->status ?? '') : ($order['status'] ?? '');
                        $product = is_object($order) ? ($order->product_name ?? '') : ($order['product_name'] ?? '');
                        $date = is_object($order) ? ($order->created_at ?? '') : ($order['created_at'] ?? '');
                        $basePrompt .= "• Commande #{$id}: {$total}€ - Status: {$status}";
                        if ($product) $basePrompt .= " - Produit: {$product}";
                        if ($date) $basePrompt .= " - Date: " . substr($date, 0, 10);
                        $basePrompt .= "\n";
                    }
                }

                // 🎫 TICKETS & SUPPORT COMPLETS
                if (!empty($allData['tickets'])) {
                    $tickets = collect($allData['tickets'])->take(5);
                    $basePrompt .= "\n🎫 HISTORIQUE SUPPORT CLIENT:\n";
                    foreach ($tickets as $ticket) {
                        $subject = is_object($ticket) ? ($ticket->subject ?? 'Sans sujet') : ($ticket['subject'] ?? 'Sans sujet');
                        $status = is_object($ticket) ? ($ticket->status ?? '') : ($ticket['status'] ?? '');
                        $priority = is_object($ticket) ? ($ticket->priority ?? '') : ($ticket['priority'] ?? '');
                        $created = is_object($ticket) ? ($ticket->created_at ?? '') : ($ticket['created_at'] ?? '');
                        $basePrompt .= "• Ticket: \"{$subject}\" - Status: {$status}";
                        if ($priority) $basePrompt .= " - Priorité: {$priority}";
                        if ($created) $basePrompt .= " - Créé: " . substr($created, 0, 10);
                        $basePrompt .= "\n";
                    }
                }

                // 📊 ACTIVITÉ & SESSIONS
                if (!empty($allData['user_agents'])) {
                    $recentActivity = collect($allData['user_agents'])->take(5);
                    $basePrompt .= "\n📊 ACTIVITÉ RÉCENTE CLIENT:\n";
                    foreach ($recentActivity as $activity) {
                        $page = is_object($activity) ? ($activity->page ?? '') : ($activity['page'] ?? '');
                        $action = is_object($activity) ? ($activity->action ?? '') : ($activity['action'] ?? '');
                        $device = is_object($activity) ? ($activity->device ?? '') : ($activity['device'] ?? '');
                        $date = is_object($activity) ? ($activity->created_at ?? '') : ($activity['created_at'] ?? '');
                        $basePrompt .= "• Action: \"{$action}\" sur {$page} - Device: {$device}";
                        if ($date) $basePrompt .= " - " . substr($date, 0, 16);
                        $basePrompt .= "\n";
                    }
                }

                $basePrompt .= "\n🚨 DONNÉES RÉELLES À UTILISER OBLIGATOIREMENT !\n";
                $basePrompt .= "• CES DONNÉES CI-DESSUS SONT LES VRAIES INFORMATIONS DU CLIENT\n";
                $basePrompt .= "• CITEZ LES NOMS EXACTS, DESCRIPTIONS EXACTES, DÉTAILS EXACTS\n";
                $basePrompt .= "• JAMAIS 'je n'ai pas accès' - VOUS AVEZ TOUT CI-DESSUS !\n";
                $basePrompt .= "• JAMAIS de réponse générique - UTILISEZ SES VRAIES DONNÉES !\n";
            } else {
                $basePrompt .= "AUCUNE DONNÉE TROUVÉE - L'utilisateur n'a pas encore de données dans le système.\n";
            }
        }

        // 🎯 ANALYSE UNIVERSELLE : Utiliser les insights générés
        if (!empty($context['universal_analysis'])) {
            $analysis = $context['universal_analysis'];
            if ($analysis['status'] === 'analyzed' && !empty($analysis['insights'])) {
                $basePrompt .= "\n📊 ANALYSE INTELLIGENTE DES DONNÉES:\n";

                foreach ($analysis['insights'] as $domain => $insights) {
                    $basePrompt .= "• " . strtoupper($domain) . ": ";
                    if (is_array($insights)) {
                        $key_insights = [];
                        foreach ($insights as $key => $value) {
                            if (is_numeric($value)) {
                                $key_insights[] = "{$key}: {$value}";
                            }
                        }
                        $basePrompt .= implode(", ", array_slice($key_insights, 0, 3)) . "\n";
                    }
                }

                if (!empty($analysis['recommendations'])) {
                    $basePrompt .= "\n💡 RECOMMANDATIONS BASÉES SUR SES DONNÉES:\n";
                    foreach (array_slice($analysis['recommendations'], 0, 3) as $rec) {
                        $basePrompt .= "• {$rec}\n";
                    }
                }
            }
        }

        // 🧠 MÉMOIRE CONVERSATIONNELLE : Éviter les répétitions
        if (!empty($context['conversational_memory'])) {
            $memory = $context['conversational_memory'];
            $basePrompt .= "\n🧠 MÉMOIRE CONVERSATIONNELLE:\n";
            $basePrompt .= "Vous avez déjà eu " . count($memory) . " échange(s) avec cet utilisateur.\n";

            if (count($memory) > 0) {
                $basePrompt .= "Messages récents:\n";
                foreach (array_slice($memory, -3) as $msg) {
                    $basePrompt .= "- Utilisateur: " . substr($msg['user_message'] ?? '', 0, 50) . "...\n";
                    $basePrompt .= "- Vous: " . substr($msg['assistant_response'] ?? '', 0, 50) . "...\n";
                }
                $basePrompt .= "IMPORTANT: C'est une CONVERSATION CONTINUE, ne dites plus 'Bonjour' ! Construisez sur le contexte.\n";
            }
        }

        $basePrompt .= "\n\n🚨 RÈGLES STRICTES - OBÉISSANCE OBLIGATOIRE :\n";
        $basePrompt .= "1. ❌ INTERDICTION TOTALE de dire 'Bonjour', 'Salut', ou toute forme de salutation\n";
        $basePrompt .= "2. ❌ INTERDICTION de dire 'je n'ai pas accès', 'informations générales', ou 'je ne dispose pas'\n";
        // Fin du bloc déprécié — ne pas utiliser
    }

    /**
     * ✅ CONSTRUIRE PROMPT UTILISATEUR AVEC CONTEXTE
     */
    protected function buildUserPrompt(string $userMessage, array $context): string
    {
        // Si c'est un prompt personnalisé avec mémoire, l'utiliser directement
        if (strpos($userMessage, 'MÉMOIRE CONVERSATIONNELLE') !== false) {
            return $userMessage;
        }

        $prompt = "MESSAGE UTILISATEUR: " . $userMessage;

        // Ajouter contexte de page si disponible
        if (!empty($context['current_page'])) {
            $prompt .= "\n\nCONTEXTE PAGE: L'utilisateur est actuellement sur la page '{$context['current_page']}'.";
        }

        // 📊 AJOUTER DONNÉES DE PERFORMANCE DÉTAILLÉES
        if (!empty($context['sales_funnel'])) {
            $funnel = $context['sales_funnel'];
            $prompt .= "\nDONNÉES FUNNEL DE VENTE:";
            if (isset($funnel['conversion_rates'])) {
                foreach ($funnel['conversion_rates'] as $stage => $rate) {
                    $prompt .= "\n• {$stage}: {$rate}% de conversion";
                }
            }
            if (isset($funnel['total_leads'])) {
                $prompt .= "\n• Total leads: {$funnel['total_leads']}";
            }
        }

        // 💰 DONNÉES FINANCIÈRES DÉTAILLÉES
        if (!empty($context['revenue_analytics'])) {
            $revenue = $context['revenue_analytics'];
            $prompt .= "\nANALYTICS REVENUS:";
            if (isset($revenue['monthly_revenue'])) {
                $prompt .= "\n• Revenus mensuels: {$revenue['monthly_revenue']}€";
            }
            if (isset($revenue['avg_order_value'])) {
                $prompt .= "\n• Panier moyen: {$revenue['avg_order_value']}€";
            }
            if (isset($revenue['customer_lifetime_value'])) {
                $prompt .= "\n• Valeur vie client: {$revenue['customer_lifetime_value']}€";
            }
        }

        // 📈 PERFORMANCE CONTENU
        if (!empty($context['content_performance'])) {
            $content = $context['content_performance'];
            $prompt .= "\nPERFORMANCE CONTENU:";
            if (isset($content['top_performing_posts'])) {
                $prompt .= "\n• Meilleurs posts: " . implode(', ', array_slice($content['top_performing_posts'], 0, 3));
            }
            if (isset($content['engagement_trends'])) {
                $prompt .= "\n• Tendance engagement: {$content['engagement_trends']}";
            }
        }

        // 🎯 OBJECTIFS ET PROJETS
        if (!empty($context['projects'])) {
            $projects = $context['projects'];
            $prompt .= "\nPROJETS ACTUELS:";
            if (isset($projects['active_projects'])) {
                $prompt .= "\n• Projets actifs: {$projects['active_projects']}";
            }
            if (isset($projects['completion_rate'])) {
                $prompt .= "\n• Taux complétion: {$projects['completion_rate']}%";
            }
        }

        return $prompt;
    }

    /**
     * ✅ SÉLECTIONNER MODÈLE SELON LE TIER
     */
    protected function selectModel(string $tier): string
    {
        return match ($tier) {
            'enterprise' => 'gpt-4-turbo-preview',
            'premium' => 'gpt-4',
            default => 'gpt-3.5-turbo'
        };
    }

    /**
     * ✅ LIMITES DE TOKENS SELON TIER
     */
    protected function getMaxTokens(string $tier): int
    {
        return match ($tier) {
            'enterprise' => 2000,
            'premium' => 1500,
            default => 1000
        };
    }

    /**
     * ✅ TEMPÉRATURE SELON DOMAINE
     */
    protected function getTemperature(string $domain): float
    {
        return match ($domain) {
            'analytics' => 0.3,  // Plus factuel
            'business' => 0.7,   // Créatif pour stratégies
            'technical' => 0.2,  // Très factuel
            default => 0.5
        };
    }

    /**
     * ✅ RÉPONSE DE FALLBACK EN CAS D'ERREUR
     */
    protected function getFallbackResponse(string $userMessage, string $domain): array
    {
        $responses = [
            'business' => "Je comprends votre question business. Pour une réponse détaillée, veuillez réessayer dans quelques instants. En attendant, consultez vos données dans le dashboard analytics.",
            'technical' => "Je peux vous aider avec ce problème technique. Veuillez vérifier votre connexion et réessayer. Consultez aussi notre section d'aide.",
            'analytics' => "Je peux analyser vos données. Actuellement, je ne peux pas accéder aux services d'analyse. Consultez vos rapports dans le dashboard.",
            'default' => "Je suis là pour vous aider. Service temporairement indisponible, veuillez réessayer."
        ];

        return [
            'success' => false,
            'response' => $responses[$domain] ?? $responses['default'],
            'fallback' => true,
            'domain' => $domain
        ];
    }

    /**
     * ✅ GÉNÉRER INSIGHTS PRÉDICTIFS AVEC IA
     */
    public function generatePredictiveInsights(array $businessData, string $userTier = 'free'): array
    {
        $prompt = "Analyse ces données business et génère des insights prédictifs:\n\n";
        $prompt .= "DONNÉES:\n";
        $prompt .= json_encode($businessData, JSON_PRETTY_PRINT);
        $prompt .= "\n\nGénère 3-5 insights prédictifs avec recommandations d'actions concrètes.";

        $response = $this->generateIntelligentResponse(
            $prompt,
            ['business_data' => $businessData],
            'analytics',
            $userTier
        );

        return $response;
    }

    /**
     * ✅ OPTIMISER STRATÉGIE CONTENU AVEC IA
     */
    public function optimizeContentStrategy(array $contentData, string $userTier = 'free'): array
    {
        $prompt = "Optimise la stratégie de contenu basée sur ces données:\n\n";
        $prompt .= json_encode($contentData, JSON_PRETTY_PRINT);
        $prompt .= "\n\nFournis des recommandations pour améliorer l'engagement et la performance.";

        $response = $this->generateIntelligentResponse(
            $prompt,
            ['content_data' => $contentData],
            'business',
            $userTier
        );

        return $response;
    }
}