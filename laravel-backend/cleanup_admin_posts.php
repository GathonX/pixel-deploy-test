<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use App\Models\BlogPost;
use App\Models\AdminWeeklyObjective;

echo "🔍 Recherche admin...\n";
$admin = User::where('is_admin', true)->first();

if (!$admin) {
    echo "❌ Aucun admin trouvé\n";
    exit(1);
}

echo "✅ Admin trouvé: {$admin->name} (ID: {$admin->id})\n\n";

// Compter les posts admin
$postsCount = BlogPost::where('user_id', $admin->id)
    ->whereNotNull('admin_weekly_objective_id')
    ->count();

echo "📊 Posts admin trouvés: {$postsCount}\n";

// Compter les objectifs
$objectivesCount = AdminWeeklyObjective::where('user_id', $admin->id)->count();
echo "📊 Objectifs hebdomadaires trouvés: {$objectivesCount}\n\n";

if ($postsCount > 0 || $objectivesCount > 0) {
    echo "🗑️  Suppression en cours...\n";
    
    // Supprimer les posts admin
    $deletedPosts = BlogPost::where('user_id', $admin->id)
        ->whereNotNull('admin_weekly_objective_id')
        ->delete();
    
    echo "✅ {$deletedPosts} posts admin supprimés\n";
    
    // Supprimer les objectifs
    $deletedObjectives = AdminWeeklyObjective::where('user_id', $admin->id)->delete();
    echo "✅ {$deletedObjectives} objectifs supprimés\n\n";
    
    echo "🎉 Nettoyage terminé ! Vous pouvez maintenant régénérer.\n";
} else {
    echo "ℹ️  Aucun post ou objectif à supprimer.\n";
}
