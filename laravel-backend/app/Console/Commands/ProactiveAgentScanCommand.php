<?php

namespace App\Console\Commands;

use App\Models\BookingReservation;
use App\Models\UserSite;
use App\Models\Workspace;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Scan proactif — détecte les situations critiques pour chaque utilisateur
 * et stocke des alertes en cache que le frontend peut consommer.
 *
 * Situations détectées :
 *   - Check-ins du jour non effectués
 *   - Check-outs du jour non effectués
 *   - Réservations en attente de confirmation (> 30 min)
 *   - Séjours dépassés non clôturés
 *   - Faible disponibilité sur un produit (occupation > 80 %)
 */
class ProactiveAgentScanCommand extends Command
{
    protected $signature   = 'agent:proactive-scan';
    protected $description = 'Scan proactif : détecte les alertes booking pour chaque utilisateur';

    public function handle(): int
    {
        $this->info('[ProactiveAgentScan] Démarrage...');

        $workspaces = Workspace::all();
        $scanned    = 0;
        $alerts     = 0;

        foreach ($workspaces as $workspace) {
            $userId  = $workspace->owner_user_id;
            $siteIds = UserSite::where('workspace_id', $workspace->id)->pluck('id');

            if ($siteIds->isEmpty()) continue;

            $userAlerts = $this->buildAlertsForSites($siteIds->toArray());

            if (!empty($userAlerts)) {
                // Stocke en cache 60 minutes — le frontend lit via /api/intelligent-agent/proactive-alerts
                Cache::put("agent_proactive_alerts_{$userId}", $userAlerts, now()->addMinutes(60));
                $alerts += count($userAlerts);
            }

            $scanned++;
        }

        $this->info("[ProactiveAgentScan] {$scanned} workspace(s) scannés, {$alerts} alerte(s) générées.");
        Log::info("[ProactiveAgentScan] {$scanned} workspaces, {$alerts} alertes");

        return self::SUCCESS;
    }

    private function buildAlertsForSites(array $siteIds): array
    {
        $alerts  = [];
        $today   = Carbon::today()->toDateString();
        $all     = BookingReservation::whereIn('site_id', $siteIds)->get();

        // ── CHECK-INS DU JOUR ────────────────────────────────────────────────
        $checkinsToday = $all->where('start_date', $today)
            ->whereIn('status', ['confirmed', 'pending']);

        foreach ($checkinsToday as $r) {
            $alerts[] = [
                'id'         => 'checkin_' . $r->id,
                'type'       => 'checkin',
                'level'      => 'info',
                'title'      => '🛎️ Check-in prévu aujourd\'hui',
                'message'    => "**{$r->client_name}** doit arriver aujourd'hui. Statut actuel : {$r->status}.",
                'reservation_id' => $r->id,
                'client'     => $r->client_name,
                'actions'    => [
                    ['label' => 'Faire le check-in', 'action' => 'checkin', 'id' => $r->id],
                ],
            ];
        }

        // ── CHECK-OUTS DU JOUR ───────────────────────────────────────────────
        $checkoutsToday = $all->where('end_date', $today)
            ->where('status', 'checked_in');

        foreach ($checkoutsToday as $r) {
            $alerts[] = [
                'id'         => 'checkout_' . $r->id,
                'type'       => 'checkout',
                'level'      => 'info',
                'title'      => '🚪 Check-out prévu aujourd\'hui',
                'message'    => "**{$r->client_name}** doit partir aujourd'hui.",
                'reservation_id' => $r->id,
                'client'     => $r->client_name,
                'actions'    => [
                    ['label' => 'Faire le check-out', 'action' => 'checkout', 'id' => $r->id],
                ],
            ];
        }

        // ── EN ATTENTE DE CONFIRMATION (> 30 min) ───────────────────────────
        $pending = $all->where('status', 'pending')
            ->filter(fn($r) => Carbon::parse($r->created_at)->lt(now()->subMinutes(30)));

        foreach ($pending as $r) {
            $since   = Carbon::parse($r->created_at)->diffForHumans();
            $alerts[] = [
                'id'         => 'pending_' . $r->id,
                'type'       => 'pending',
                'level'      => 'warning',
                'title'      => '🔔 Réservation en attente de confirmation',
                'message'    => "**{$r->client_name}** attend une confirmation depuis {$since} (arrivée : {$r->start_date}).",
                'reservation_id' => $r->id,
                'client'     => $r->client_name,
                'actions'    => [
                    ['label' => 'Confirmer',  'action' => 'confirm',  'id' => $r->id],
                    ['label' => 'Annuler',    'action' => 'cancel',   'id' => $r->id],
                ],
            ];
        }

        // ── SÉJOURS DÉPASSÉS NON CLÔTURÉS ───────────────────────────────────
        $overdue = $all->where('status', 'checked_in')
            ->filter(fn($r) => $r->end_date < $today);

        foreach ($overdue as $r) {
            $days    = Carbon::parse($r->end_date)->diffInDays(Carbon::today());
            $alerts[] = [
                'id'         => 'overdue_' . $r->id,
                'type'       => 'overdue',
                'level'      => 'urgent',
                'title'      => '🚨 Séjour dépassé non clôturé',
                'message'    => "**{$r->client_name}** aurait dû partir le {$r->end_date} (il y a {$days} jour(s)).",
                'reservation_id' => $r->id,
                'client'     => $r->client_name,
                'actions'    => [
                    ['label' => 'Faire le check-out', 'action' => 'checkout', 'id' => $r->id],
                ],
            ];
        }

        return $alerts;
    }
}
