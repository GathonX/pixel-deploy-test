<?php

use App\Models\User;
use App\Models\UserSite;
use App\Models\Workspace;
use App\Models\WorkspaceSubscription;
use App\Models\SitePlanAssignment;
use App\Models\SiteLanguage;
use App\Services\PlanResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

// Disable FK checks for MySQL test env (source_template_id FK)
beforeEach(function () {
    DB::statement('SET FOREIGN_KEY_CHECKS=0');
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeWorkspace(string $status = 'active', ?string $trialEndsAt = null): Workspace
{
    $user = User::factory()->create();

    return Workspace::create([
        'owner_user_id' => $user->id,
        'name'          => 'Test Workspace',
        'status'        => $status,
        'trial_starts_at' => $trialEndsAt ? now()->subDays(14) : null,
        'trial_ends_at'   => $trialEndsAt,
    ]);
}

function makeSubscription(Workspace $workspace, string $planKey, string $status = 'active'): WorkspaceSubscription
{
    return WorkspaceSubscription::create([
        'workspace_id' => $workspace->id,
        'plan_key'     => $planKey,
        'status'       => $status,
        'starts_at'    => now()->subDay(),
        'ends_at'      => now()->addMonth(),
        'source'       => 'manual',
    ]);
}

function makeSite(Workspace $workspace, string $status = 'draft'): UserSite
{
    return UserSite::create([
        'user_id'            => $workspace->owner_user_id,
        'workspace_id'       => $workspace->id,
        'name'               => 'Site ' . uniqid(),
        'status'             => $status,
        'source_template_id' => 'test-template',
    ]);
}

// ─── 1. Trial expiré → bloque la publication ────────────────────────────────

test('trial expiré bloque la publication', function () {
    $workspace = makeWorkspace('trial_active', now()->subDay()->toDateTimeString());

    WorkspaceSubscription::create([
        'workspace_id' => $workspace->id,
        'plan_key'     => 'starter',
        'status'       => 'trial_active',
        'starts_at'    => now()->subDays(15),
        'ends_at'      => now()->subDay(),
        'source'       => 'manual',
    ]);

    $site = makeSite($workspace);
    $result = (new PlanResolver())->canPublishSite($site, $workspace);

    expect($result['allowed'])->toBeFalse();
    expect($result['reason_code'])->toBe('TRIAL_EXPIRED');
});

test('trial encore valide autorise la publication', function () {
    $workspace = makeWorkspace('trial_active', now()->addDays(5)->toDateTimeString());

    WorkspaceSubscription::create([
        'workspace_id' => $workspace->id,
        'plan_key'     => 'starter',
        'status'       => 'trial_active',
        'starts_at'    => now()->subDays(9),
        'ends_at'      => now()->addDays(5),
        'source'       => 'manual',
    ]);

    $site = makeSite($workspace);
    $result = (new PlanResolver())->canPublishSite($site, $workspace);

    expect($result['allowed'])->toBeTrue();
});

test('workspace sans souscription active bloque la publication', function () {
    $workspace = makeWorkspace('suspended');
    $site = makeSite($workspace);

    $result = (new PlanResolver())->canPublishSite($site, $workspace);

    expect($result['allowed'])->toBeFalse();
    expect($result['reason_code'])->toBe('TRIAL_EXPIRED');
});

// ─── 2. Premium >5 sites → plan dédié requis ────────────────────────────────

test('premium peut publier jusqu\'à 5 sites', function () {
    $workspace = makeWorkspace();
    makeSubscription($workspace, 'premium');

    // 4 sites déjà publiés
    for ($i = 0; $i < 4; $i++) {
        makeSite($workspace, 'published');
    }

    $site5 = makeSite($workspace);
    $result = (new PlanResolver())->canPublishSite($site5, $workspace);

    expect($result['allowed'])->toBeTrue();
});

test('premium bloque le 6ème site sans plan dédié', function () {
    $workspace = makeWorkspace();
    makeSubscription($workspace, 'premium');

    // 5 sites déjà publiés
    for ($i = 0; $i < 5; $i++) {
        makeSite($workspace, 'published');
    }

    $site6 = makeSite($workspace);
    $result = (new PlanResolver())->canPublishSite($site6, $workspace);

    expect($result['allowed'])->toBeFalse();
    expect($result['reason_code'])->toBe('PLAN_REQUIRED');
});

test('premium autorise le 6ème site avec plan dédié actif', function () {
    $workspace = makeWorkspace();
    $sub = makeSubscription($workspace, 'premium');

    // 5 sites déjà publiés
    for ($i = 0; $i < 5; $i++) {
        makeSite($workspace, 'published');
    }

    $site6 = makeSite($workspace);

    SitePlanAssignment::create([
        'site_id'                    => $site6->id,
        'workspace_subscription_id'  => $sub->id,
        'dedicated_subscription_id'  => null,
        'effective_plan_key'         => 'premium',
        'billing_mode'               => 'dedicated_site_plan',
        'status'                     => 'active',
        'starts_at'                  => now()->subDay(),
    ]);

    $result = (new PlanResolver())->canPublishSite($site6, $workspace);

    expect($result['allowed'])->toBeTrue();
});

// ─── 3. Downgrade → désactive les capacités hors plan ───────────────────────

test('starter ne peut pas utiliser l\'IA', function () {
    $workspace = makeWorkspace();
    makeSubscription($workspace, 'starter');

    $canAi = (new PlanResolver())->canUseAi($workspace);

    expect($canAi)->toBeFalse();
});

test('pro peut utiliser l\'IA', function () {
    $workspace = makeWorkspace();
    makeSubscription($workspace, 'pro');

    $canAi = (new PlanResolver())->canUseAi($workspace);

    expect($canAi)->toBeTrue();
});

test('après downgrade de pro à starter, l\'IA est bloquée', function () {
    $workspace = makeWorkspace();

    // Ancienne souscription pro expirée
    WorkspaceSubscription::create([
        'workspace_id' => $workspace->id,
        'plan_key'     => 'pro',
        'status'       => 'expired',
        'starts_at'    => now()->subMonths(2),
        'ends_at'      => now()->subDay(),
        'source'       => 'manual',
    ]);

    // Nouvelle souscription starter active
    makeSubscription($workspace, 'starter');

    $canAi = (new PlanResolver())->canUseAi($workspace);

    expect($canAi)->toBeFalse();
});

test('starter bloque un 2ème site (quota 1)', function () {
    $workspace = makeWorkspace();
    makeSubscription($workspace, 'starter');

    makeSite($workspace, 'published'); // 1 site déjà publié

    $site2 = makeSite($workspace);
    $result = (new PlanResolver())->canPublishSite($site2, $workspace);

    expect($result['allowed'])->toBeFalse();
    expect($result['reason_code'])->toBe('PLAN_QUOTA_EXCEEDED');
});

// ─── 4. Langues excédentaires → quota respecté ──────────────────────────────

test('starter autorise 1 langue par site', function () {
    $workspace = makeWorkspace();
    makeSubscription($workspace, 'starter');
    $site = makeSite($workspace, 'published');

    // Aucune langue active → peut en ajouter une
    $result = (new PlanResolver())->canAddLanguage($site, $workspace);

    expect($result['allowed'])->toBeTrue();
});

test('starter bloque une 2ème langue', function () {
    $workspace = makeWorkspace();
    makeSubscription($workspace, 'starter');
    $site = makeSite($workspace, 'published');

    SiteLanguage::create([
        'site_id'       => $site->id,
        'language_code' => 'fr',
        'status'        => 'active',
        'is_default'    => true,
        'is_paid_extra' => false,
    ]);

    $result = (new PlanResolver())->canAddLanguage($site, $workspace);

    expect($result['allowed'])->toBeFalse();
    expect($result['reason_code'])->toBe('LANGUAGE_QUOTA_EXCEEDED');
});

test('pro autorise 2 langues par site', function () {
    $workspace = makeWorkspace();
    makeSubscription($workspace, 'pro');
    $site = makeSite($workspace, 'published');

    SiteLanguage::create([
        'site_id'       => $site->id,
        'language_code' => 'fr',
        'status'        => 'active',
        'is_default'    => true,
        'is_paid_extra' => false,
    ]);

    $result = (new PlanResolver())->canAddLanguage($site, $workspace);

    expect($result['allowed'])->toBeTrue();
});

test('pro bloque une 3ème langue', function () {
    $workspace = makeWorkspace();
    makeSubscription($workspace, 'pro');
    $site = makeSite($workspace, 'published');

    foreach (['fr', 'en'] as $lang) {
        SiteLanguage::create([
            'site_id'       => $site->id,
            'language_code' => $lang,
            'status'        => 'active',
            'is_default'    => $lang === 'fr',
            'is_paid_extra' => false,
        ]);
    }

    $result = (new PlanResolver())->canAddLanguage($site, $workspace);

    expect($result['allowed'])->toBeFalse();
    expect($result['reason_code'])->toBe('LANGUAGE_QUOTA_EXCEEDED');
});

test('langue inactive ne compte pas dans le quota', function () {
    $workspace = makeWorkspace();
    makeSubscription($workspace, 'starter');
    $site = makeSite($workspace, 'published');

    SiteLanguage::create([
        'site_id'       => $site->id,
        'language_code' => 'fr',
        'status'        => 'inactive', // désactivée
        'is_default'    => false,
        'is_paid_extra' => false,
    ]);

    // Quota = 1, inactive ne compte pas → peut encore ajouter
    $result = (new PlanResolver())->canAddLanguage($site, $workspace);

    expect($result['allowed'])->toBeTrue();
});
