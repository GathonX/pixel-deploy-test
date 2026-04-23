<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_plan_assignments', function (Blueprint $table) {
            $table->id();
            $table->string('site_id', 50);
            $table->unsignedBigInteger('workspace_subscription_id')->nullable();
            $table->unsignedBigInteger('dedicated_subscription_id')->nullable();
            $table->string('effective_plan_key', 50); // starter, pro, premium
            $table->enum('billing_mode', ['included_in_workspace', 'dedicated_site_plan']);
            $table->enum('status', ['active', 'payment_due', 'expired', 'blocked'])->default('active');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->nullable();
            $table->timestamps();

            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('cascade');
            $table->foreign('workspace_subscription_id')->references('id')->on('workspace_subscriptions')->onDelete('set null');
            $table->foreign('dedicated_subscription_id')->references('id')->on('workspace_subscriptions')->onDelete('set null');
            $table->index('site_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_plan_assignments');
    }
};
