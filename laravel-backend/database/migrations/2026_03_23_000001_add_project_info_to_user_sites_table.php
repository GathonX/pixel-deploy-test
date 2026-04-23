<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_sites', function (Blueprint $table) {
            $table->text('description')->nullable()->after('name');
            $table->string('lieu', 255)->nullable()->after('description');
            $table->text('objectif')->nullable()->after('lieu');
            $table->text('probleme')->nullable()->after('objectif');
        });
    }

    public function down(): void
    {
        Schema::table('user_sites', function (Blueprint $table) {
            $table->dropColumn(['description', 'lieu', 'objectif', 'probleme']);
        });
    }
};
