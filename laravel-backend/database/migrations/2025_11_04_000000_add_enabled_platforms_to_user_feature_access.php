<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_feature_access', function (Blueprint $table) {
            // Plateformes sociales activées (JSON: ['facebook', 'instagram', 'linkedin', 'twitter'])
            $table->json('enabled_platforms')->nullable()->after('user_activated');
        });
    }

    public function down(): void
    {
        Schema::table('user_feature_access', function (Blueprint $table) {
            $table->dropColumn('enabled_platforms');
        });
    }
};
