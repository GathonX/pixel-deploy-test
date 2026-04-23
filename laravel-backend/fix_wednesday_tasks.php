<?php

/**
 * Script pour nettoyer les tâches excédentaires du mercredi (et autres jours)
 * RÈGLE: Maximum 6 tâches par jour
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Task;
use App\Models\Sprint;
use Carbon\Carbon;

$userId = 4; // User ID à nettoyer

echo "🔧 NETTOYAGE DES TÂCHES EXCÉDENTAIRES POUR USER_ID: $userId\n";
echo str_repeat("=", 70) . "\n\n";

// Récupérer le sprint actuel
$currentSprint = Sprint::where('user_id', $userId)
    ->orderBy('id', 'DESC')
    ->first();

if (!$currentSprint) {
    echo "❌ Aucun sprint trouvé pour cet utilisateur\n";
    exit(1);
}

echo "📋 Sprint: #{$currentSprint->id} - Semaine {$currentSprint->week_number}/{$currentSprint->year}\n";
echo "   Début: {$currentSprint->start_date}\n\n";

$daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
$dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
$maxTasksPerDay = 6;
$totalDeleted = 0;

echo "🧹 ANALYSE ET NETTOYAGE PAR JOUR:\n";
echo str_repeat("-", 70) . "\n";

foreach ($daysOfWeek as $index => $day) {
    $dayDate = Carbon::parse($currentSprint->start_date)->addDays($index);

    // Récupérer toutes les tâches de ce jour
    $tasks = Task::where('sprint_id', $currentSprint->id)
        ->where('user_id', $userId)
        ->whereDate('scheduled_date', $dayDate->format('Y-m-d'))
        ->orderBy('order', 'asc')
        ->orderBy('id', 'asc')
        ->get();

    $count = $tasks->count();

    echo sprintf(
        "%-12s (%s): %2d tâches",
        $dayNames[$index],
        $dayDate->format('Y-m-d'),
        $count
    );

    if ($count > $maxTasksPerDay) {
        // ❌ TROP DE TÂCHES - Supprimer l'excédent
        $excess = $count - $maxTasksPerDay;
        echo " ⚠️  EXCÈS: $excess tâche(s) à supprimer\n";

        // Garder les 6 premières, supprimer le reste
        $tasksToDelete = $tasks->slice($maxTasksPerDay);

        echo "   Suppression de:\n";
        foreach ($tasksToDelete as $task) {
            echo "     - ID:{$task->id} | {$task->title} | Type:{$task->type}\n";
            $task->delete();
            $totalDeleted++;
        }

    } elseif ($count < $maxTasksPerDay) {
        // ⚠️ PAS ASSEZ
        echo " ⚠️  MANQUE: " . ($maxTasksPerDay - $count) . " tâche(s)\n";
    } else {
        // ✅ PARFAIT
        echo " ✅ OK\n";
    }
}

echo str_repeat("-", 70) . "\n";
echo "\n📊 RÉSULTAT:\n";
echo "   - Total tâches supprimées: $totalDeleted\n";
echo "   - Sprint nettoyé avec succès!\n\n";

// Vérification finale
echo "🔍 VÉRIFICATION FINALE:\n";
echo str_repeat("-", 70) . "\n";

foreach ($daysOfWeek as $index => $day) {
    $dayDate = Carbon::parse($currentSprint->start_date)->addDays($index);

    $count = Task::where('sprint_id', $currentSprint->id)
        ->where('user_id', $userId)
        ->whereDate('scheduled_date', $dayDate->format('Y-m-d'))
        ->count();

    $status = $count === 6 ? "✅" : ($count > 6 ? "❌" : "⚠️");

    echo sprintf(
        "%-12s: %d tâches %s\n",
        $dayNames[$index],
        $count,
        $status
    );
}

echo "\n✅ Script terminé!\n";
