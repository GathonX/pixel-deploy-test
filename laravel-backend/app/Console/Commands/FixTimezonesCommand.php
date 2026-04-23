<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixTimezonesCommand extends Command
{
    protected $signature = 'timezones:fix';
    protected $description = 'Corriger les timezones invalides en base de données';

    public function handle()
    {
        $this->info('🔧 Correction des timezones...');

        // Corriger NULL et Africa/Antananarivo vers Indian/Antananarivo
        $updated = DB::table('users')
            ->whereNull('timezone')
            ->orWhere('timezone', 'Africa/Antananarivo')
            ->update(['timezone' => 'Indian/Antananarivo']);

        $this->info("✅ {$updated} utilisateurs mis à jour avec Indian/Antananarivo");

        // Afficher les timezones actuels
        $timezones = DB::table('users')
            ->select('timezone', DB::raw('COUNT(*) as count'))
            ->groupBy('timezone')
            ->get();

        $this->info('📊 Timezones actuels :');
        foreach($timezones as $tz) {
            $this->line("  • {$tz->timezone}: {$tz->count} utilisateurs");
        }

        return Command::SUCCESS;
    }
}
