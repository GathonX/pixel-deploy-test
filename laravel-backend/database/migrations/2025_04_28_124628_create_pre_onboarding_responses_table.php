<?php

// database/migrations/2025_04_28_000000_create_pre_onboarding_responses_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePreOnboardingResponsesTable extends Migration
{
    public function up()
    {
        Schema::create('pre_onboarding_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->json('responses');
            $table->string('status')->default('pending');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('pre_onboarding_responses');
    }
}
