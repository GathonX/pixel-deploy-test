<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_publications', function (Blueprint $table) {
            $table->id();
            $table->string('site_id', 50);
            $table->enum('action', [
                'publish_request',
                'publish_success',
                'publish_blocked',
                'unpublish',
                'republish',
            ]);
            $table->string('reason_code', 80)->nullable(); // PLAN_REQUIRED, TRIAL_EXPIRED, DOMAIN_NOT_READY
            $table->unsignedBigInteger('actor_user_id')->nullable();
            $table->json('meta_json')->nullable();
            $table->dateTime('created_at');

            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('cascade');
            $table->foreign('actor_user_id')->references('id')->on('users')->onDelete('set null');
            $table->index('site_id');
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_publications');
    }
};
