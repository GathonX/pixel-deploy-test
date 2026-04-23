<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Ajouter la colonne status à projects si elle n'existe pas
        if (!Schema::hasColumn('projects', 'status')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->enum('status', ['draft', 'active', 'completed', 'archived'])
                    ->default('active')
                    ->after('name');
            });
        }

        // Ajouter la colonne subject à tickets si elle n'existe pas
        if (!Schema::hasColumn('tickets', 'subject')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->string('subject')->nullable()->after('id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('projects', 'status')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }

        if (Schema::hasColumn('tickets', 'subject')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropColumn('subject');
            });
        }
    }
};
