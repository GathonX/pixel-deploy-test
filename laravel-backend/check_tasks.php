<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Task;
use App\Models\Sprint;
use Carbon\Carbon;

$userId = 4;

echo "=== ANALYSE DES TÂCHES POUR USER_ID: $userId ===\n\n";

// Récupérer le sprint actuel
$currentSprint = Sprint::where('user_id', $userId)
    ->orderBy('id', 'DESC')
    ->first();

if (!$currentSprint) {
    echo "❌ Aucun sprint trouvé pour cet utilisateur\n";
    exit(1);
}

echo "📋 Sprint actuel: #{$currentSprint->id}\n";
echo "   - Semaine: {$currentSprint->week_number}/{$currentSprint->year}\n";
echo "   - Début: {$currentSprint->start_date}\n";
echo "   - Fin: {$currentSprint->end_date}\n\n";

// Compter les tâches par jour
$daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
$dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

echo "📊 RÉPARTITION DES TÂCHES PAR JOUR:\n\n";

$totalTasks = 0;

foreach ($daysOfWeek as $index => $day) {
    $dayDate = Carbon::parse($currentSprint->start_date)->addDays($index);

    $count = Task::where('sprint_id', $currentSprint->id)
        ->where('user_id', $userId)
        ->whereDate('scheduled_date', $dayDate->format('Y-m-d'))
        ->count();

    $totalTasks += $count;

    $status = $count === 6 ? "✅" : ($count > 6 ? "⚠️ TROP" : "❌ PAS ASSEZ");

    echo "  {$dayNames[$index]} ({$dayDate->format('Y-m-d')}): {$count} tâches $status\n";
}

echo "\n📈 TOTAL: $totalTasks tâches\n";
echo "📈 ATTENDU: " . (7 * 6) . " tâches (7 jours × 6 tâches/jour)\n\n";

// Afficher le détail pour Mercredi
echo "🔍 DÉTAIL DES TÂCHES DU MERCREDI:\n\n";
$wednesdayDate = Carbon::parse($currentSprint->start_date)->addDays(2);
$wednesdayTasks = Task::where('sprint_id', $currentSprint->id)
    ->where('user_id', $userId)
    ->whereDate('scheduled_date', $wednesdayDate->format('Y-m-d'))
    ->get();

foreach ($wednesdayTasks as $task) {
    echo "  - ID:{$task->id} | {$task->title} | Type:{$task->type} | Ordre:{$task->order}\n";
}

echo "\n";

// Afficher le détail pour Lundi
echo "🔍 DÉTAIL DES TÂCHES DU LUNDI:\n\n";
$mondayDate = Carbon::parse($currentSprint->start_date);
$mondayTasks = Task::where('sprint_id', $currentSprint->id)
    ->where('user_id', $userId)
    ->whereDate('scheduled_date', $mondayDate->format('Y-m-d'))
    ->get();

if ($mondayTasks->count() === 0) {
    echo "  ❌ AUCUNE TÂCHE POUR LE LUNDI!\n";
} else {
    foreach ($mondayTasks as $task) {
        echo "  - ID:{$task->id} | {$task->title} | Type:{$task->type} | Ordre:{$task->order}\n";
    }
}

echo "\n";
