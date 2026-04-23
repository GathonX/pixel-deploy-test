<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\UserSite;
use App\Models\SitePage;
use App\Models\SiteSection;
use App\Models\SiteGlobalSection;
use App\Models\SiteDomain;
use App\Models\SiteTemplate;
use App\Models\SectionType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Jobs\VerifyDomainJob;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Models\SitePlanAssignment;
use App\Services\PlanResolver;

class SiteController extends Controller
{
    /**
     * Liste les sites de l'utilisateur connecté
     */
    public function index(): JsonResponse
    {
        $sites = UserSite::forUser(Auth::id())
            ->with(['template', 'domains', 'pages.sections.sectionType', 'globalSections.sectionType', 'planAssignment', 'workspace'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Ajouter effective_plan_key à chaque site
        // Règle OFFER-3 : plan propre au site (starter/pro) indépendant du workspace (free/entreprise)
        $data = $sites->map(function (UserSite $site) {
            $attrs = $site->toArray();

            $assignment = $site->planAssignment; // active SitePlanAssignment
            if ($assignment) {
                $attrs['effective_plan_key'] = $assignment->effective_plan_key;
            } else {
                // OFFER.md : ENTREPRISE (premium) inclut des sites Starter → 'included'
                // Workspace 'pro' → le site hérite du Pro du workspace
                $workspacePlan = $site->workspace?->subscriptions()
                    ->whereIn('status', ['active', 'trial_active', 'grace'])
                    ->orderByDesc('starts_at')
                    ->value('plan_key');

                $attrs['effective_plan_key'] = match($workspacePlan) {
                    'pro'     => 'pro',
                    'premium' => 'included',
                    'starter' => 'starter',
                    default   => 'draft',
                };
            }

            return $attrs;
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Récupère un site avec ses pages et sections
     * Applique la même logique effective_plan_key que index() pour cohérence.
     */
    public function show(string $id): JsonResponse
    {
        $site = UserSite::with(['template', 'pages.sections.sectionType', 'domains', 'globalSections.sectionType', 'planAssignment', 'workspace'])
            ->forUser(Auth::id())
            ->find($id);

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        $data = $site->toArray();

        // Calcul effective_plan_key — même logique que index()
        $assignment = $site->planAssignment;
        if ($assignment) {
            $data['effective_plan_key'] = $assignment->effective_plan_key;
        } else {
            $workspacePlan = $site->workspace?->subscriptions()
                ->whereIn('status', ['active', 'trial_active', 'grace'])
                ->orderByDesc('starts_at')
                ->value('plan_key');

            $data['effective_plan_key'] = match($workspacePlan) {
                'pro'     => 'pro',
                'premium' => 'included',
                'starter' => 'starter',
                default   => 'draft',
            };
        }

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    /**
     * Créer un nouveau site à partir d'un template (instantiation)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_id' => 'required|string|exists:site_templates,id',
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'lieu'        => 'nullable|string|max:255',
            'objectif'    => 'nullable|string|max:1000',
            'probleme'    => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        // Try explicit workspace from X-Workspace-Id header first
        $workspace = null;
        $requestedId = $request->header('X-Workspace-Id');
        if ($requestedId) {
            $workspace = Workspace::where('id', $requestedId)
                ->where('owner_user_id', $user->id)
                ->whereNull('delivered_at')
                ->first();
            if (!$workspace) {
                $membership = \App\Models\WorkspaceUser::where('workspace_id', $requestedId)
                    ->where('user_id', $user->id)
                    ->first();
                if ($membership) {
                    $workspace = Workspace::find($requestedId);
                }
            }
        }

        // Fallback: first owned workspace
        if (!$workspace) {
            $workspace = Workspace::where('owner_user_id', $user->id)
                ->whereNull('delivered_at')
                ->orderBy('id')
                ->first();
            if (!$workspace) {
                $membership = \App\Models\WorkspaceUser::where('user_id', $user->id)->first();
                if ($membership) {
                    $workspace = Workspace::find($membership->workspace_id);
                }
            }
        }

        if (!$workspace) {
            return response()->json([
                'success'     => false,
                'message'     => 'Aucun workspace trouvé. Veuillez créer un workspace.',
                'reason_code' => 'NO_WORKSPACE',
            ], 403);
        }

        if (in_array($workspace->status, ['suspended', 'pending_deletion', 'deleted'])) {
            return response()->json([
                'success'     => false,
                'message'     => 'Votre workspace est inactif. Veuillez réactiver votre abonnement.',
                'reason_code' => 'WORKSPACE_INACTIVE',
            ], 403);
        }

        // ── Limite de création de sites selon plan workspace ──────────────────
        // FREE (starter) : max 3 sites au total (1 publié + 2 brouillons)
        // ENTREPRISE (premium) : pas de limite stricte à la création (quota sur publication)
        $planResolver    = app(\App\Services\PlanResolver::class);
        $activeSub       = $planResolver->activeSubscription($workspace);
        $workspacePlanKey = $activeSub?->plan_key ?? 'starter';

        if ($workspacePlanKey !== 'premium') {
            $totalSites = UserSite::where('workspace_id', $workspace->id)->count();
            if ($totalSites >= 3) {
                return response()->json([
                    'success'     => false,
                    'reason_code' => 'SITE_CREATION_LIMIT',
                    'message'     => 'Le plan Gratuit est limité à 3 sites (1 publié + 2 brouillons). Passez au plan Entreprise pour créer plus de sites.',
                    'upgrade_url' => '/workspace/billing',
                ], 403);
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        $template = SiteTemplate::with(['pages.sections.sectionType'])->find($validated['template_id']);

        if (!$template || $template->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Template non disponible'
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Créer le site (lié au workspace)
            $site = UserSite::create([
                'user_id'            => $user->id,
                'workspace_id'       => $workspace->id,
                'name'               => $validated['name'],
                'description'        => $validated['description'] ?? null,
                'lieu'               => $validated['lieu'] ?? null,
                'objectif'           => $validated['objectif'] ?? null,
                'probleme'           => $validated['probleme'] ?? null,
                'source_template_id' => $template->id,
                'status'             => 'draft',
                'global_styles'      => [],
            ]);

            // Sections globales (navbar et footer) - extraites de la première page
            // Supporte aussi les variantes premium (navbar-premium, footer-premium)
            $isGlobalSection = fn(string $typeId) => str_starts_with($typeId, 'navbar') || str_starts_with($typeId, 'footer');
            $globalSectionsCreated = [];

            // Chercher les sections navbar/footer dans la première page du template
            $firstPage = $template->pages->first();
            if ($firstPage) {
                foreach ($firstPage->sections as $templateSection) {
                    $sectionTypeId = $templateSection->section_type_id;
                    $position = str_starts_with($sectionTypeId, 'navbar') ? 'navbar' : 'footer';
                    if ($isGlobalSection($sectionTypeId) && !isset($globalSectionsCreated[$position])) {
                        $sectionType = $templateSection->sectionType;

                        SiteGlobalSection::create([
                            'site_id' => $site->id,
                            'section_type_id' => $sectionTypeId,
                            'position' => $position,
                            'content' => array_merge(
                                $sectionType->default_content ?? [],
                                $templateSection->default_content ?? []
                            ),
                            'styles' => array_merge(
                                $sectionType->default_styles ?? [],
                                $templateSection->default_styles ?? []
                            ),
                        ]);

                        $globalSectionsCreated[$position] = true;
                    }
                }
            }

            // Copier les pages du template (sans navbar/footer qui sont maintenant globaux)
            foreach ($template->pages as $templatePage) {
                $page = SitePage::create([
                    'site_id' => $site->id,
                    'name' => $templatePage->name,
                    'slug' => $templatePage->slug,
                    'order' => $templatePage->order,
                    'is_published' => false,
                ]);

                // Copier les sections de chaque page (exclure navbar et footer)
                $order = 0;
                foreach ($templatePage->sections as $templateSection) {
                    // Skip les sections globales (navbar/footer et variantes premium)
                    if ($isGlobalSection($templateSection->section_type_id)) {
                        continue;
                    }

                    $sectionType = $templateSection->sectionType;

                    SiteSection::create([
                        'page_id' => $page->id,
                        'section_type_id' => $templateSection->section_type_id,
                        'order' => $order++,
                        'content' => array_merge(
                            $sectionType->default_content ?? [],
                            $templateSection->default_content ?? []
                        ),
                        'styles' => array_merge(
                            $sectionType->default_styles ?? [],
                            $templateSection->default_styles ?? []
                        ),
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Site créé avec succès',
                'data' => $site->load(['template', 'pages.sections.sectionType', 'domains', 'globalSections.sectionType'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du site',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour un site (nom, styles globaux, SEO)
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($id);

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'global_styles' => 'nullable|array',
            'seo_config' => 'nullable|array',
        ]);

        $site->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Site mis à jour',
            'data' => $site
        ]);
    }

    /**
     * POST /api/site-builder/sites/{id}/upload-image
     * Upload une image pour les sections du site (stockage public, retourne l'URL complète).
     */
    public function uploadSectionImage(Request $request, string $id): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($id);
        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé'], 404);
        }

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:10240', // 10 Mo max
        ]);

        $image    = $request->file('image');
        $filename = 'site_' . $id . '_' . now()->format('Ymd_His') . '_' . Str::random(8)
                    . '.' . $image->getClientOriginalExtension();
        $path     = $image->storeAs('site-builder/' . $id, $filename, 'public');

        return response()->json([
            'success' => true,
            'data'    => [
                'url' => Storage::disk('public')->url($path),
            ],
        ]);
    }

    /**
     * Supprimer un site
     */
    public function destroy(string $id): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($id);

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        $site->delete();

        return response()->json([
            'success' => true,
            'message' => 'Site supprimé'
        ]);
    }

    /**
     * Publier un site
     */
    public function publish(Request $request, string $id): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($id);

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        // Gating plan : vérifier que le workspace peut publier
        $workspace = Workspace::where('owner_user_id', Auth::id())->first();
        if ($workspace) {
            $planResolver = app(PlanResolver::class);
            $check = $planResolver->canPublishSite($site, $workspace);
            if (!$check['allowed']) {
                $planResolver->logPublication($site, 'publish_blocked', $check['reason_code'], Auth::id());
                return response()->json([
                    'success'     => false,
                    'reason_code' => $check['reason_code'],
                    'message'     => $check['message'],
                ], 403);
            }
        }

        $validated = $request->validate([
            'subdomain' => 'required|string|max:50|alpha_dash|unique:user_sites,subdomain,' . $site->id,
        ]);

        try {
            DB::beginTransaction();

            // Mettre à jour le site
            $site->update([
                'status' => 'published',
                'subdomain' => $validated['subdomain'] . '.monsite.app',
                'published_at' => now(),
            ]);

            // Marquer toutes les pages comme publiées
            $site->pages()->update(['is_published' => true]);

            // Créer l'entrée domaine
            SiteDomain::create([
                'site_id' => $site->id,
                'domain' => $validated['subdomain'] . '.monsite.app',
                'type' => 'subdomain',
                'status' => 'verified',
            ]);

            DB::commit();

            // Log publication réussie
            if ($workspace) {
                app(PlanResolver::class)->logPublication($site, 'publish_success', null, Auth::id());
            }

            return response()->json([
                'success' => true,
                'message' => 'Site publié avec succès',
                'data' => $site->load('domains')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la publication',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Dépublier un site
     */
    public function unpublish(string $id): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($id);

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        try {
            DB::beginTransaction();

            // Mettre à jour le site
            $site->update([
                'status' => 'draft',
                'subdomain' => null,
                'published_at' => null,
            ]);

            // Marquer toutes les pages comme non publiées
            $site->pages()->update(['is_published' => false]);

            // Supprimer les domaines subdomain (garder les custom)
            $site->domains()->where('type', 'subdomain')->delete();

            DB::commit();

            // Log dépublication dans site_publications + lifecycle_events
            $workspace = Workspace::where('owner_user_id', Auth::id())->first();
            if (!$workspace) {
                $membership = \App\Models\WorkspaceUser::where('user_id', Auth::id())->first();
                if ($membership) $workspace = Workspace::find($membership->workspace_id);
            }
            $planResolver = app(PlanResolver::class);
            $planResolver->logPublication($site, 'unpublish', null, Auth::id());
            if ($workspace) {
                $planResolver->logLifecycle($workspace, 'site_unpublished', $site->id, [
                    'site_name' => $site->name,
                    'actor_id'  => Auth::id(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Site dépublié',
                'data' => $site->load('domains')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la dépublication',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ajouter un domaine personnalisé
     */
    public function addDomain(Request $request, string $id): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($id);

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        $validated = $request->validate([
            'domain' => 'required|string|max:255|unique:site_domains,domain',
        ]);

        $domain = SiteDomain::create([
            'site_id' => $site->id,
            'domain' => $validated['domain'],
            'type' => 'custom',
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Domaine ajouté (en attente de vérification)',
            'data' => $domain
        ], 201);
    }

    /**
     * Déclencher la vérification DNS d'un domaine
     */
    public function verifyDomain(Request $request, string $id, string $domainId): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($id);

        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé'], 404);
        }

        $domain = SiteDomain::where('id', $domainId)
            ->where('site_id', $site->id)
            ->first();

        if (!$domain) {
            return response()->json(['success' => false, 'message' => 'Domaine non trouvé'], 404);
        }

        if ($domain->status === 'active') {
            return response()->json([
                'success' => true,
                'message' => 'Domaine déjà actif',
                'data' => $domain
            ]);
        }

        $expectedIp = '194.163.134.150';
        $domainName = $domain->domain;

        // Vérification DNS synchrone via Google DNS-over-HTTPS
        $actualIp = null;
        try {
            $ctx = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]);
            $json = @file_get_contents(
                "https://dns.google/resolve?name={$domainName}&type=A",
                false, $ctx
            );
            if ($json) {
                $data = json_decode($json, true);
                // Status 0 = NOERROR, Answer array contains A records
                if (($data['Status'] ?? -1) === 0 && !empty($data['Answer'])) {
                    foreach ($data['Answer'] as $answer) {
                        if ($answer['type'] === 1) { // type 1 = A record
                            $actualIp = $answer['data'];
                            break;
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            // Si DoH échoue, on laisse actualIp = null et on dispatche quand même
        }

        // DNS non configuré ou mauvaise IP
        if ($actualIp !== $expectedIp) {
            $domain->update(['status' => 'pending']);
            $message = $actualIp
                ? "L'enregistrement A pointe vers {$actualIp} au lieu de {$expectedIp}."
                : "Aucun enregistrement A trouvé pour {$domainName}. Configurez DNS A @ {$expectedIp}.";

            return response()->json([
                'success' => false,
                'message' => $message,
                'data' => $domain->fresh(),
                'dns_check' => [
                    'expected' => $expectedIp,
                    'found'    => $actualIp,
                ]
            ], 422);
        }

        // DNS OK → marquer dns_verified, le cron host provisionne le SSL
        try {
            $domain->update(['status' => 'dns_verified']);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("verifyDomain update failed: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur interne lors de la mise à jour. Réessayez.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'DNS vérifié ! Le certificat SSL est en cours de génération (quelques minutes).',
            'data' => $domain->fresh()
        ]);
    }

    /**
     * Supprimer un domaine personnalisé
     */
    public function deleteDomain(Request $request, string $id, string $domainId): JsonResponse
    {
        $site = UserSite::forUser(Auth::id())->find($id);

        if (!$site) {
            return response()->json(['success' => false, 'message' => 'Site non trouvé'], 404);
        }

        $domain = SiteDomain::where('id', $domainId)
            ->where('site_id', $site->id)
            ->where('type', 'custom')
            ->first();

        if (!$domain) {
            return response()->json(['success' => false, 'message' => 'Domaine non trouvé'], 404);
        }

        $domainName = $domain->domain;
        $domain->delete();

        // Signal the host script to remove nginx conf + SSL
        $signalFile = '/tmp/pixelrise-remove-domain-' . preg_replace('/[^a-z0-9\-\.]/', '', $domainName);
        @file_put_contents($signalFile, $domainName);

        return response()->json([
            'success' => true,
            'message' => 'Domaine supprimé',
        ]);
    }
}
