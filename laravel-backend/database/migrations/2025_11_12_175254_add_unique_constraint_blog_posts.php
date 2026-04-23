<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            // Ajouter une colonne générée pour la date seule (sans l'heure)
            DB::statement('ALTER TABLE blog_posts ADD COLUMN published_date DATE GENERATED ALWAYS AS (DATE(published_at)) STORED');
            
            // Supprimer les doublons existants
            DB::statement('
                DELETE t1 FROM blog_posts t1
                INNER JOIN blog_posts t2 
                WHERE t1.id < t2.id 
                AND t1.user_id = t2.user_id 
                AND t1.published_date = t2.published_date
            ');
            
            // Ajouter l'index unique
            $table->unique(['user_id', 'published_date'], 'unique_user_post_per_day');
        });
    }

    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropUnique('unique_user_post_per_day');
            $table->dropColumn('published_date');
        });
    }
};
