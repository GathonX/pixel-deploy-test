<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use Carbon\Carbon;

class UpdatePostScheduleCommand extends Command
{
    protected $signature = 'posts:update-schedule {--hours=06:00,10:00 : Heures de publication séparées par virgule}';
    protected $description = 'Modifier les heures de publication des posts programmés';

    public function handle()
    {
        $this->info('🕐 Modification des heures de publication...');

        $hoursOption = $this->option('hours');
        $hours = explode(',', $hoursOption);

        $this->info("Nouvelles heures: " . implode(', ', $hours));

        // Récupérer tous les posts programmés
        $blogPosts = BlogPost::where('status', 'scheduled')->get();
        $socialPosts = SocialMediaPost::where('status', 'scheduled')->get();

        $this->info("Posts blog trouvés: {$blogPosts->count()}");
        $this->info("Posts sociaux trouvés: {$socialPosts->count()}");

        $updated = 0;

        // Mettre à jour les posts blog
        foreach($blogPosts as $index => $post) {
            $hourIndex = $index % count($hours);
            $newHour = trim($hours[$hourIndex]);

            $currentDate = $post->published_at;

            // ✅ Créer la date en heure locale Madagascar puis convertir en UTC
            $localDateTime = $currentDate->format('Y-m-d') . ' ' . $newHour . ':00';
            $madagascarTime = Carbon::parse($localDateTime, 'Indian/Antananarivo');
            $utcTime = $madagascarTime->utc();

            $this->line("Post ID {$post->id}: {$currentDate->format('Y-m-d H:i')} → {$newHour} Madagascar ({$utcTime->format('H:i')} UTC)");

            $post->update([
                'published_at' => $utcTime
            ]);

            $updated++;
        }

        // Mettre à jour les posts sociaux
        foreach($socialPosts as $index => $post) {
            $hourIndex = $index % count($hours);
            $newHour = trim($hours[$hourIndex]);

            $currentDate = $post->published_at;

            // ✅ Créer la date en heure locale Madagascar puis convertir en UTC
            $localDateTime = $currentDate->format('Y-m-d') . ' ' . $newHour . ':00';
            $madagascarTime = Carbon::parse($localDateTime, 'Indian/Antananarivo');
            $utcTime = $madagascarTime->utc();

            $this->line("Post social ID {$post->id}: {$currentDate->format('Y-m-d H:i')} → {$newHour} Madagascar ({$utcTime->format('H:i')} UTC)");

            $post->update([
                'published_at' => $utcTime
            ]);

            $updated++;
        }

        $this->info("✅ {$updated} posts mis à jour avec les nouvelles heures !");

        return Command::SUCCESS;
    }
}
