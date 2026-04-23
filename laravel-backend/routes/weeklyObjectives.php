<?php

// laravel-backend/routes/weeklyObjectives.php
// ✅ ROUTES COMPLÈTES POUR LE SYSTÈME D'OBJECTIFS HEBDOMADAIRES

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\WeeklyObjectivesController;

/*
|--------------------------------------------------------------------------
| Weekly Content Objectives Routes
|--------------------------------------------------------------------------
|
| Routes pour le système de gestion des objectifs hebdomadaires de contenu
| Préfixe automatique : /api/weekly-objectives/
| Middleware : auth:sanctum (appliqué dans api.php)
|
| 🎯 FONCTIONNALITÉS :
| - Génération d'objectifs hebdomadaires pour blog et réseaux sociaux
| - Génération de contenu basé sur ces objectifs
| - Historique et gestion des objectifs par semaine
| - Statistiques et monitoring
|
*/

// ===== 📋 GESTION DES OBJECTIFS =====

/**
 * Récupérer objectifs de la semaine courante
 * GET /api/weekly-objectives/current
 * Paramètres optionnels: ?type=blog|social_media|both
 * Retourne: { week_identifier, objectives: { blog, social_media }, current_day }
 */
Route::get('/current', [WeeklyObjectivesController::class, 'getCurrentWeekObjectives'])
     ->name('weekly-objectives.current');

/**
 * Générer objectifs pour une semaine spécifique
 * POST /api/weekly-objectives/generate
 * Body: { week_identifier?: "2024-W01", force_regenerate?: boolean }
 * Retourne: { blog_objectives, social_objectives, regenerated }
 */
Route::post('/generate', [WeeklyObjectivesController::class, 'generateWeeklyObjectives'])
     ->middleware('ai.plan')
     ->name('weekly-objectives.generate');

/**
 * Historique des objectifs par semaine
 * GET /api/weekly-objectives/history
 * Paramètres optionnels: ?limit=5
 * Retourne: { history: [...], total_weeks }
 */
Route::get('/history', [WeeklyObjectivesController::class, 'getObjectivesHistory'])
     ->name('weekly-objectives.history');

/**
 * Supprimer objectifs d'une semaine spécifique
 * DELETE /api/weekly-objectives/week
 * Body: { week_identifier: "2024-W01" }
 * Retourne: { deleted_count }
 */
Route::delete('/week', [WeeklyObjectivesController::class, 'deleteWeekObjectives'])
     ->name('weekly-objectives.delete-week');

/**
 * Statistiques des objectifs
 * GET /api/weekly-objectives/stats
 * Retourne: { total_weeks_generated, current_week_generated, last_generation }
 */
Route::get('/stats', [WeeklyObjectivesController::class, 'getObjectivesStats'])
     ->name('weekly-objectives.stats');

// ===== 🚀 GÉNÉRATION DE CONTENU BASÉE SUR OBJECTIFS =====

/**
 * Générer contenu basé sur objectifs hebdomadaires
 * POST /api/weekly-objectives/generate-content
 * Body: { content_type: "blog|social_media", platform?: "facebook|instagram|twitter|linkedin" }
 * Retourne: { data: { title, content, generation_context } }
 *
 * 🎯 LOGIQUE :
 * - Utilise l'objectif du jour de la semaine courante
 * - Pour social_media, platform est obligatoire
 * - Génère du contenu adapté à l'objectif prédéfini
 */
Route::post('/generate-content', [WeeklyObjectivesController::class, 'generateContentFromObjectives'])
     ->middleware('ai.plan')
     ->name('weekly-objectives.generate-content');

/*
|--------------------------------------------------------------------------
| Notes d'implémentation - Objectifs Hebdomadaires
|--------------------------------------------------------------------------
|
| 🎯 PRINCIPE :
| 1. Chaque semaine = 7 objectifs blog + 7 objectifs réseaux sociaux
| 2. Objectifs générés à partir du business plan du projet actif
| 3. Contenu généré en utilisant l'objectif du jour (lundi=jour 1, dimanche=jour 7)
| 4. Intégration avec le système de génération existant
|
| 📅 CYCLE HEBDOMADAIRE :
| - Format semaine : "2024-W01" (année-semaine ISO)
| - Jour 1 (lundi) à Jour 7 (dimanche)
| - Un objectif par jour avec titre, mots-clés, focus SEO
|
| 💾 STOCKAGE :
| - Table: weekly_content_objectives
| - Colonnes: project_id, week_identifier, content_type, objectives (JSON)
| - Index: project_id + week_identifier + content_type (unique)
|
| 🔄 INTÉGRATION :
| - WeeklyObjectivesService : génération des objectifs
| - ContentGenerationService : nouvelles méthodes generateXXXFromObjectives()
| - BlogContentGenerator/SocialContentGenerator : nouvelles méthodes generateContentFromObjective()
|
| ⚡ PERFORMANCE :
| - Cache des objectifs par semaine
| - Génération à la demande ou programmée
| - Réutilisation des objectifs existants
| - Logs détaillés pour monitoring
|
*/
