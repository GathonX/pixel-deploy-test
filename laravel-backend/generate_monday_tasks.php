<?php

/**
 * Script pour générer les 6 tâches manquantes du lundi
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Task;
use App\Models\Sprint;
use Carbon\Carbon;

$userId = 4; // User ID

echo "🚀 GÉNÉRATION DES TÂCHES POUR LE LUNDI - USER_ID: $userId\n";
echo str_repeat("=", 70) . "\n\n";

// Récupérer le sprint actuel
$currentSprint = Sprint::where('user_id', $userId)
    ->orderBy('id', 'DESC')
    ->first();

if (!$currentSprint) {
    echo "❌ Aucun sprint trouvé\n";
    exit(1);
}

echo "📋 Sprint: #{$currentSprint->id} - Semaine {$currentSprint->week_number}/{$currentSprint->year}\n\n";

// Date du lundi (premier jour du sprint)
$mondayDate = Carbon::parse($currentSprint->start_date);

// Vérifier combien de tâches existent déjà
$existingTasks = Task::where('sprint_id', $currentSprint->id)
    ->where('user_id', $userId)
    ->whereDate('scheduled_date', $mondayDate->format('Y-m-d'))
    ->count();

echo "📊 Tâches existantes pour le lundi ({$mondayDate->format('Y-m-d')}): $existingTasks\n";

if ($existingTasks >= 6) {
    echo "✅ Le lundi a déjà 6 tâches ou plus. Rien à faire.\n";
    exit(0);
}

$tasksToCreate = 6 - $existingTasks;
echo "🔧 Création de $tasksToCreate tâche(s)...\n\n";

// Tâches par défaut pour le lundi
// TYPES VALIDES: mission, vision, objective, action
$defaultTasks = [
    [
        'title' => 'Planification de la semaine',
        'description' => 'Organiser les priorités et objectifs pour la semaine',
        'type' => 'objective',
        'priority' => 'high'
    ],
    [
        'title' => 'Révision des objectifs hebdomadaires',
        'description' => 'Passer en revue les objectifs fixés pour cette semaine',
        'type' => 'objective',
        'priority' => 'high'
    ],
    [
        'title' => 'Préparation réunion équipe',
        'description' => 'Préparer l\'ordre du jour et les points à discuter',
        'type' => 'action',
        'priority' => 'medium'
    ],
    [
        'title' => 'Analyse des métriques de performance',
        'description' => 'Examiner les KPIs et ajuster la stratégie si nécessaire',
        'type' => 'action',
        'priority' => 'medium'
    ],
    [
        'title' => 'Développement fonctionnalité prioritaire',
        'description' => 'Avancer sur la fonctionnalité la plus importante',
        'type' => 'action',
        'priority' => 'high'
    ],
    [
        'title' => 'Communication avec les parties prenantes',
        'description' => 'Envoyer les updates et recueillir les feedbacks',
        'type' => 'action',
        'priority' => 'normal'
    ]
];

// Créer les tâches manquantes
$createdCount = 0;
$maxOrder = Task::where('sprint_id', $currentSprint->id)
    ->whereDate('scheduled_date', $mondayDate)
    ->max('order') ?? -1;

for ($i = 0; $i < $tasksToCreate; $i++) {
    $taskData = $defaultTasks[$i];

    $task = Task::create([
        'user_id' => $userId,
        'sprint_id' => $currentSprint->id,
        'title' => $taskData['title'],
        'description' => $taskData['description'],
        'type' => $taskData['type'],
        'priority' => $taskData['priority'],
        'status' => 'pending',
        'scheduled_date' => $mondayDate,
        'order' => $maxOrder + $i + 1
    ]);

    echo "  ✅ Créé: {$task->title} (ID:{$task->id})\n";
    $createdCount++;
}

echo "\n📊 RÉSULTAT:\n";
echo "   - Tâches créées: $createdCount\n";
echo "   - Total lundi: " . ($existingTasks + $createdCount) . "/6\n";
echo "\n✅ Génération terminée!\n";
