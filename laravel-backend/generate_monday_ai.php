<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Sprint;
use App\Services\OpenAI\SprintGenerationService;
use App\Models\Task;
use Carbon\Carbon;

$userId = 4;

echo "🤖 GÉNÉRATION LUNDI VIA IA - USER_ID: $userId\n";
echo str_repeat("=", 70) . "\n\n";

$sprint = Sprint::where('user_id', $userId)->orderBy('id', 'DESC')->first();

if (!$sprint) {
    echo "❌ Aucun sprint trouvé\n";
    exit(1);
}

echo "📋 Sprint: #{$sprint->id}\n";
echo "🔄 Appel du service IA pour générer 6 tâches pour Monday...\n\n";

try {
    $sprintService = new SprintGenerationService($userId);
    $result = $sprintService->generateDailyTasks($sprint->id, 'Monday', 6);

    if (!$result['success']) {
        echo "❌ Erreur: {$result['error']}\n";
        exit(1);
    }

    $mondayDate = Carbon::parse($sprint->start_date);

    echo "✅ IA a généré " . count($result['tasks']) . " tâches\n\n";

    $createdTasks = [];
    foreach ($result['tasks'] as $index => $taskData) {
        $task = Task::create([
            'user_id' => $userId,
            'sprint_id' => $sprint->id,
            'title' => $taskData['title'],
            'description' => $taskData['description'],
            'type' => $taskData['type'] ?? 'action',
            'priority' => $taskData['priority'] ?? 'normal',
            'status' => 'pending',
            'scheduled_date' => $mondayDate,
            'order' => $index
        ]);

        echo "  ✅ {$task->title} (Type: {$task->type}, Priorité: {$task->priority})\n";
        $createdTasks[] = $task;
    }

    echo "\n📊 RÉSULTAT:\n";
    echo "   - Tâches créées par IA: " . count($createdTasks) . "\n";
    echo "\n✅ Génération IA terminée!\n";

} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
    exit(1);
}
