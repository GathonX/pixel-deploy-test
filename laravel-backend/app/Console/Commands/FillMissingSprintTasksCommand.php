<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Sprint;
use App\Jobs\GenerateRemainingDaysJob;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class FillMissingSprintTasksCommand extends Command
{
    protected $signature = 'sprints:fill-missing-tasks
                            {--user= : ID utilisateur spécifique}
                            {--force : Forcer même si déjà complet}';

    protected $description = 'Rattrapage automatique des tâches sprint manquantes (comme système blog/social)';

    public function handle(): int
    {
        $this->info('🔄 Démarrage rattrapage tâches sprint manquantes');

        $now = Carbon::now();
        $weekNumber = $now->weekOfYear;
        $year = $now->year;
        $currentDay = $now->format('l');

        $this->info("📅 Semaine $weekNumber de $year - Jour: $currentDay");

        // Récupérer utilisateurs avec accès sprint actif
        $usersQuery = User::whereHas('featureAccess', function($query) {
            $query->whereHas('feature', function($q) {
                      $q->where('key', 'sprint_planning');
                  })
                  ->where('admin_enabled', true)
                  ->where('user_activated', true)
                  ->where('status', 'active')
                  ->where(function($q) {
                      $q->whereNull('expires_at')
                        ->orWhere('expires_at', '>', now());
                  });
        })->with('projects');

        if ($this->option('user')) {
            $usersQuery->where('id', $this->option('user'));
        }

        $users = $usersQuery->get();

        if ($users->isEmpty()) {
            $this->warn('⚠️ Aucun utilisateur éligible trouvé');
            return 0;
        }

        $this->info("👥 {$users->count()} utilisateurs éligibles");

        $jobsScheduled = 0;
        $sprintsChecked = 0;

        foreach ($users as $user) {
            // ✅ CORRECTION : Chercher TOUS les sprints de l'utilisateur pour cette semaine
            // (y compris ceux sans project_id)
            $userSprints = Sprint::where('user_id', $user->id)
                ->where('week_number', $weekNumber)
                ->where('year', $year)
                ->get();

            if ($userSprints->isEmpty()) {
                $this->line("  ⏭️ {$user->name}: Aucun sprint cette semaine");
                continue;
            }

            foreach ($userSprints as $sprint) {
                // Récupérer le projet associé (peut être null)
                $project = $sprint->project_id ? $user->projects->find($sprint->project_id) : $user->projects->first();
                $projectName = $project ? $project->name : 'Sans projet';

                // ✅ Si sprint n'a pas de project_id, l'associer au premier projet
                if (!$sprint->project_id && $project) {
                    $sprint->update(['project_id' => $project->id]);
                    $this->line("  🔧 Sprint {$sprint->id} associé au projet: {$project->name}");
                }

                $sprintsChecked++;

                // ✅ RATTRAPAGE : Vérifier tâches manquantes
                $missingDays = $this->checkMissingTasks($sprint, $now);

                if (empty($missingDays)) {
                    $this->line("  ✅ {$user->name} - {$projectName}: Complet");
                    continue;
                }

                $this->warn("  🔧 {$user->name} - {$projectName}: " . count($missingDays) . " jours manquants: " . implode(', ', $missingDays));

                // ✅ Si pas de projet, on ne peut pas dispatcher le job (il nécessite un Project)
                if (!$project) {
                    $this->error("  ❌ {$user->name}: Aucun projet disponible pour le rattrapage");
                    continue;
                }

                // Programmer job de rattrapage
                $weekInfo = [
                    'week_number' => $weekNumber,
                    'year' => $year,
                    'start_date' => $now->copy()->startOfWeek(),
                    'end_date' => $now->copy()->endOfWeek(),
                    'week_formatted' => $now->format('Y-W')
                ];

                GenerateRemainingDaysJob::dispatch($user, $project, $weekInfo, true)
                    ->onQueue('default');

                $jobsScheduled++;

                Log::info('🔧 [SPRINT-CATCHUP] Job rattrapage programmé', [
                    'user_id' => $user->id,
                    'project_id' => $project->id,
                    'sprint_id' => $sprint->id,
                    'missing_days' => $missingDays
                ]);
            }
        }

        $this->info("✅ Rattrapage terminé");
        $this->table(
            ['Métrique', 'Valeur'],
            [
                ['Sprints vérifiés', $sprintsChecked],
                ['Jobs programmés', $jobsScheduled],
            ]
        );

        return 0;
    }

    /**
     * Vérifier jours avec tâches manquantes (< 6 tâches)
     */
    private function checkMissingTasks(Sprint $sprint, Carbon $now): array
    {
        $daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $currentDayIndex = array_search($now->format('l'), $daysOfWeek);

        // ✅ Règles selon jour activation
        // Du jour actuel jusqu'à dimanche
        $daysToCheck = array_slice($daysOfWeek, $currentDayIndex);

        $missingDays = [];

        foreach ($daysToCheck as $dayName) {
            $dayDate = $this->calculateDateForDay($dayName, $now);

            $taskCount = $sprint->tasks()
                ->whereDate('scheduled_date', $dayDate->format('Y-m-d'))
                ->count();

            if ($taskCount < 6) {
                $missingDays[] = $dayName;
            }
        }

        return $missingDays;
    }

    /**
     * Calculer date pour un jour donné
     */
    private function calculateDateForDay(string $dayName, Carbon $now): Carbon
    {
        $daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        $targetDayIndex = array_search($dayName, $daysOfWeek);
        $currentDayIndex = array_search($now->format('l'), $daysOfWeek);

        if ($targetDayIndex >= $currentDayIndex) {
            $daysToAdd = $targetDayIndex - $currentDayIndex;
        } else {
            $daysToAdd = 7 - $currentDayIndex + $targetDayIndex;
        }

        return $now->copy()->addDays($daysToAdd);
    }
}
