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
        Schema::table('projects', function (Blueprint $table) {
            // Informations business plan étendues
            $table->string('sector')->nullable();
            $table->string('location')->nullable();
            $table->integer('founded_year')->nullable();
            $table->string('legal_form')->nullable();
            $table->string('website')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->integer('employees')->nullable();
            $table->text('mission')->nullable();
            $table->text('vision')->nullable();
            $table->json('values')->nullable();
            $table->json('short_term_goals')->nullable();
            $table->json('long_term_goals')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn([
                'sector',
                'location',
                'founded_year',
                'legal_form',
                'website',
                'email',
                'phone',
                'employees',
                'mission',
                'vision',
                'values',
                'short_term_goals',
                'long_term_goals'
            ]);
        });
    }
};
