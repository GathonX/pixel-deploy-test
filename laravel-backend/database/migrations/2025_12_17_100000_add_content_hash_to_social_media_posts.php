<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('social_media_posts', function (Blueprint $table) {
            // ✅ Ajouter colonne content_hash pour éviter contenus identiques
            $table->string('content_hash', 64)->nullable()->after('content');
            $table->index('content_hash');
        });

        Schema::table('blog_posts', function (Blueprint $table) {
            // ✅ Ajouter colonne content_hash pour éviter contenus identiques
            $table->string('content_hash', 64)->nullable()->after('content');
            $table->index('content_hash');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('social_media_posts', function (Blueprint $table) {
            $table->dropIndex(['content_hash']);
            $table->dropColumn('content_hash');
        });

        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropIndex(['content_hash']);
            $table->dropColumn('content_hash');
        });
    }
};
