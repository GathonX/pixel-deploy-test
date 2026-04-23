<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Task;
use App\Models\Sprint;
use Carbon\Carbon;

$userId = 4;

$sprint = Sprint::where('user_id', $userId)->orderBy('id', 'DESC')->first();
$mondayDate = Carbon::parse($sprint->start_date);

$deleted = Task::where('sprint_id', $sprint->id)
    ->where('user_id', $userId)
    ->whereDate('scheduled_date', $mondayDate)
    ->delete();

echo "✅ Supprimé: $deleted tâches du lundi\n";
