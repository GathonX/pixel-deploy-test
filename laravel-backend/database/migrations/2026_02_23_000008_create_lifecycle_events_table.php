<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lifecycle_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('workspace_id');
            $table->string('site_id', 50)->nullable();
            $table->string('event_type', 80); // TRIAL_ENDED, REMINDER_SENT, SUSPENDED, DELETION_FINAL_NOTICE
            $table->dateTime('event_at');
            $table->json('payload_json')->nullable();
            $table->dateTime('created_at');

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('set null');
            $table->index('workspace_id');
            $table->index('event_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lifecycle_events');
    }
};
