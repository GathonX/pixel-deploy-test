<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_invitations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('workspace_id');
            $table->string('site_id', 20)->nullable();             // site spécifique (nullable = accès workspace global, string car UserSite->id = Str::random(10))
            $table->string('token', 64)->unique();               // token UUID slugifié
            $table->string('email');
            $table->string('name');
            $table->enum('role', ['admin', 'member'])->default('member');
            $table->enum('status', ['pending', 'accepted', 'expired'])->default('pending');
            $table->unsignedBigInteger('invited_by');            // user_id de l'invitant
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();

            $table->foreign('workspace_id')->references('id')->on('workspaces')->onDelete('cascade');
            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('set null');
            $table->foreign('invited_by')->references('id')->on('users')->onDelete('cascade');

            $table->index(['token', 'status']);
            $table->index(['workspace_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_invitations');
    }
};
