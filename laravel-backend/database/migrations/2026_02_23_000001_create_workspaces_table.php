<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspaces', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('owner_user_id');
            $table->string('name', 150);
            $table->enum('status', [
                'trial_active',
                'active',
                'grace',
                'suspended',
                'pending_deletion',
                'deleted',
            ])->default('trial_active');
            $table->dateTime('trial_starts_at')->nullable();
            $table->dateTime('trial_ends_at')->nullable();
            $table->dateTime('suspended_at')->nullable();
            $table->dateTime('deleted_at')->nullable();
            $table->timestamps();

            $table->foreign('owner_user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('owner_user_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspaces');
    }
};
