<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Modifier l'ENUM pour ajouter dns_verified et active
        DB::statement("ALTER TABLE site_domains MODIFY COLUMN status ENUM('pending', 'verified', 'dns_verified', 'active', 'error') DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE site_domains MODIFY COLUMN status ENUM('pending', 'verified', 'error') DEFAULT 'pending'");
    }
};
