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
        Schema::create('sprints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('project_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('user_feature_access_id')->nullable()->constrained('user_feature_access')->onDelete('set null');
            $table->integer('week_number');
            $table->integer('year');
            $table->date('start_date');
            $table->date('end_date');
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['active', 'completed', 'archived'])->default('active');
            $table->timestamps();

            // Add a unique constraint to prevent duplicate sprints for the same week/year/user
            $table->unique(['user_id', 'week_number', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sprints');
    }
};