<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // blog_posts
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->string('site_id', 20)->nullable()->after('user_id')->index('idx_bp_site');
        });

        // social_media_posts
        Schema::table('social_media_posts', function (Blueprint $table) {
            $table->string('site_id', 20)->nullable()->after('user_id')->index('idx_sm_site');
        });

        // tasks
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('site_id', 20)->nullable()->after('user_id')->index('idx_tasks_site');
        });

        // reservations
        Schema::table('reservations', function (Blueprint $table) {
            $table->string('site_id', 20)->nullable()->index('idx_res_site');
        });
    }

    public function down(): void
    {
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropIndex('idx_bp_site');
            $table->dropColumn('site_id');
        });
        Schema::table('social_media_posts', function (Blueprint $table) {
            $table->dropIndex('idx_sm_site');
            $table->dropColumn('site_id');
        });
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('idx_tasks_site');
            $table->dropColumn('site_id');
        });
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropIndex('idx_res_site');
            $table->dropColumn('site_id');
        });
    }
};
