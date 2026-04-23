<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUser;
use App\Models\WorkspaceSubscription;
use App\Models\UserSite;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class WorkspaceMigrationSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Migration des utilisateurs vers la structure Workspace...');

        $users = User::all();
        $created = 0;
        $skipped = 0;

        foreach ($users as $user) {
            // Ne pas recréer si un workspace owner existe déjà pour cet user
            if (Workspace::where('owner_user_id', $user->id)->exists()) {
                $skipped++;
                continue;
            }

            DB::transaction(function () use ($user, &$created) {
                // 1. Créer le Workspace
                $workspace = Workspace::create([
                    'owner_user_id' => $user->id,
                    'name'          => $user->name . ' Workspace',
                    'status'        => 'active',
                    'trial_starts_at' => null,
                    'trial_ends_at'   => null,
                ]);

                // 2. Créer WorkspaceUser (owner)
                WorkspaceUser::create([
                    'workspace_id' => $workspace->id,
                    'user_id'      => $user->id,
                    'role'         => 'owner',
                    'joined_at'    => $user->created_at ?? now(),
                ]);

                // 3. Créer WorkspaceSubscription selon le plan actuel de l'user
                $planKey = $this->resolvePlanKey($user->plan ?? null);
                WorkspaceSubscription::create([
                    'workspace_id' => $workspace->id,
                    'plan_key'     => $planKey,
                    'status'       => 'active',
                    'starts_at'    => $user->created_at ?? now(),
                    'ends_at'      => null,
                    'source'       => 'manual',
                ]);

                // 4. Lier tous les sites de cet user au workspace
                UserSite::where('user_id', $user->id)
                    ->whereNull('workspace_id')
                    ->update(['workspace_id' => $workspace->id]);

                $created++;
            });
        }

        $this->command->info("Terminé. Workspaces créés : {$created} | Ignorés (déjà existants) : {$skipped}");
    }

    private function resolvePlanKey(?string $userPlan): string
    {
        return match (strtolower($userPlan ?? '')) {
            'pro', 'professional' => 'pro',
            'premium', 'business' => 'premium',
            default               => 'starter',
        };
    }
}
