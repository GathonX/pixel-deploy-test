<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deletion_queue', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('workspace_id');
            $table->dateTime('scheduled_delete_at');
            $table->enum('status', ['pending', 'canceled', 'executed'])->default('pending');
            $table->dateTime('last_notice_sent_at')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->index('scheduled_delete_at');
            // Un seul pending par workspace
            $table->unique(['workspace_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deletion_queue');
    }
};
