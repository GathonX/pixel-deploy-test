<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE workspace_invitations MODIFY COLUMN status ENUM('pending','accepted','expired','awaiting_payment') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        // Remettre l'ENUM original (les lignes 'awaiting_payment' devront être nettoyées manuellement)
        DB::statement("ALTER TABLE workspace_invitations MODIFY COLUMN status ENUM('pending','accepted','expired') NOT NULL DEFAULT 'pending'");
    }
};
