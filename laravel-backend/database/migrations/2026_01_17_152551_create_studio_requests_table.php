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
        Schema::create('studio_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('template_id')->nullable()->constrained('studio_templates')->onDelete('set null');
            $table->string('domain'); // Nom de domaine demandé
            $table->string('client_name');
            $table->string('client_email');
            $table->string('client_phone')->nullable();
            $table->string('company_name')->nullable();
            $table->text('description')->nullable(); // Description du projet
            $table->text('notes')->nullable(); // Notes additionnelles
            $table->enum('status', ['pending', 'in_progress', 'active', 'rejected', 'cancelled'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->onDelete('set null'); // Admin qui a traité
            $table->timestamps();

            $table->index('user_id');
            $table->index('status');
            $table->index('domain');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('studio_requests');
    }
};
