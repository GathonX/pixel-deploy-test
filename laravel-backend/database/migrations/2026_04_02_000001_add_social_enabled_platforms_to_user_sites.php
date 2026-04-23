<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_sites', function (Blueprint $table) {
            $table->json('social_enabled_platforms')->nullable()->after('seo_config');
        });
    }

    public function down(): void
    {
        Schema::table('user_sites', function (Blueprint $table) {
            $table->dropColumn('social_enabled_platforms');
        });
    }
};
