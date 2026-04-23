<?php

namespace App\Http\Controllers\API\SiteBuilder;

use App\Http\Controllers\Controller;
use App\Models\UserSite;
use Illuminate\Http\JsonResponse;

class PreviewController extends Controller
{
    /**
     * Récupère les données d'un site pour preview public (via token)
     */
    public function show(string $token): JsonResponse
    {
        $site = UserSite::with(['template', 'pages.sections.sectionType', 'domains'])
            ->where('preview_token', $token)
            ->first();

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $site->id,
                'name' => $site->name,
                'status' => $site->status,
                'globalStyles' => $site->global_styles,
                'seoConfig' => $site->seo_config,
                'template' => $site->template ? [
                    'id' => $site->template->id,
                    'name' => $site->template->name,
                ] : null,
                'pages' => $site->pages->map(function ($page) {
                    return [
                        'id' => $page->id,
                        'name' => $page->name,
                        'slug' => $page->slug,
                        'order' => $page->order,
                        'sections' => $page->sections->map(function ($section) {
                            return [
                                'id' => $section->id,
                                'sectionTypeId' => $section->section_type_id,
                                'order' => $section->order,
                                'content' => $section->content,
                                'styles' => $section->styles,
                                'translations' => $section->translations ?? [],
                                'sectionType' => $section->sectionType ? [
                                    'id' => $section->sectionType->id,
                                    'name' => $section->sectionType->name,
                                ] : null,
                            ];
                        }),
                    ];
                }),
            ]
        ]);
    }

    /**
     * Récupère les données d'un site publié via son domaine
     */
    public function showByDomain(string $domain): JsonResponse
    {
        $site = UserSite::with(['template', 'pages.sections.sectionType', 'globalSections.sectionType'])
            ->whereHas('domains', function ($query) use ($domain) {
                $query->where('domain', $domain)
                    ->whereIn('status', ['verified', 'active']);
            })
            ->where('status', 'published')
            ->first();

        if (!$site) {
            return response()->json([
                'success' => false,
                'message' => 'Site non trouvé'
            ], 404);
        }

        $langs = $site->languages()->orderBy('is_default', 'desc')->get()->map(fn($l) => [
            'code'       => $l->language_code,
            'is_default' => (bool) $l->is_default,
        ])->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $site->id,
                'name' => $site->name,
                'globalStyles' => $site->global_styles,
                'seoConfig' => $site->seo_config,
                'languages' => $langs,
                'globalSections' => $site->globalSections->map(function ($gs) {
                    return [
                        'id' => $gs->id,
                        'position' => $gs->position,
                        'sectionTypeId' => $gs->section_type_id,
                        'content' => $gs->content,
                        'styles' => $gs->styles,
                        'translations' => $gs->translations ?? [],
                    ];
                }),
                'pages' => $site->pages->where('is_published', true)->map(function ($page) {
                    return [
                        'id' => $page->id,
                        'name' => $page->name,
                        'slug' => $page->slug,
                        'order' => $page->order,
                        'sections' => $page->sections->sortBy('order')->map(function ($section) {
                            return [
                                'id' => $section->id,
                                'sectionTypeId' => $section->section_type_id,
                                'order' => $section->order,
                                'content' => $section->content,
                                'styles' => $section->styles,
                                'translations' => $section->translations ?? [],
                            ];
                        })->values(),
                    ];
                })->sortBy('order')->values(),
            ]
        ]);
    }
}
