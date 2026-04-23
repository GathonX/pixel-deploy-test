<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // La colonne source était ENUM('manual','paypal') — trop restrictive.
        // On la passe en VARCHAR(120) pour accepter aussi 'purchase:{orderId}'.
        DB::statement("ALTER TABLE workspace_subscriptions MODIFY COLUMN source VARCHAR(120) NOT NULL DEFAULT 'manual'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE workspace_subscriptions MODIFY COLUMN source ENUM('manual','paypal') NOT NULL DEFAULT 'manual'");
    }
};
