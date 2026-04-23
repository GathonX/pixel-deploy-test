<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CleanOldNotificationsCommand extends Command
{
    protected $signature = 'notifications:cleanup';

    protected $description = 'Nettoie les anciennes notifications (> 30 jours)';

    public function handle()
    {
        $this->info('🧹 Nettoyage notifications anciennes...');

        try {
            $deleted = DB::table('notifications')
                ->where('created_at', '<', now()->subDays(30))
                ->where('read_at', '!=', null)
                ->delete();

            $this->info("🗑️  {$deleted} notifications supprimées");

            Log::info("🧹 Notifications anciennes supprimées", [
                'deleted_count' => $deleted,
                'cutoff_date' => now()->subDays(30)->toDateString()
            ]);

            $this->info('✅ Nettoyage terminé');
            return 0;

        } catch (\Exception $e) {
            $this->error("❌ Erreur: {$e->getMessage()}");

            Log::error("❌ Erreur nettoyage notifications", [
                'error' => $e->getMessage()
            ]);

            return 1;
        }
    }
}
