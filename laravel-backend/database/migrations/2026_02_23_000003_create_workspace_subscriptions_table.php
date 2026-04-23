<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('workspace_id');
            $table->string('plan_key', 50)->nullable(); // starter, pro, premium
            $table->enum('status', [
                'trial_active',
                'active',
                'grace',
                'expired',
                'suspended',
                'canceled',
            ])->default('trial_active');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->nullable();
            $table->dateTime('grace_ends_at')->nullable();
            $table->dateTime('canceled_at')->nullable();
            $table->enum('source', ['manual', 'paypal'])->default('manual');
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->index('workspace_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_subscriptions');
    }
};
