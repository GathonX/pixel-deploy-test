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
        Schema::create('account_deletion_feedbacks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('user_email');
            $table->string('user_name');
            $table->enum('reason', [
                'too_expensive',
                'not_useful',
                'lack_features',
                'poor_support',
                'technical_issues',
                'switching_competitor',
                'temporary_break',
                'other'
            ]);
            $table->text('detailed_reason')->nullable();
            $table->integer('satisfaction_rating')->nullable(); // 1-5
            $table->text('suggestions')->nullable();
            $table->boolean('would_recommend')->nullable();
            $table->json('additional_data')->nullable(); // Pour stocker des données supplémentaires
            $table->timestamp('account_deleted_at');
            $table->timestamps();
            
            $table->index(['reason']);
            $table->index(['satisfaction_rating']);
            $table->index(['account_deleted_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account_deletion_feedbacks');
    }
};
