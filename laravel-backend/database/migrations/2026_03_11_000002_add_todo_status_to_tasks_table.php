<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE tasks MODIFY COLUMN status ENUM('pending','todo','in-progress','completed') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        // Revert 'todo' tasks to 'pending' before removing the enum value
        DB::statement("UPDATE tasks SET status = 'pending' WHERE status = 'todo'");
        DB::statement("ALTER TABLE tasks MODIFY COLUMN status ENUM('pending','in-progress','completed') NOT NULL DEFAULT 'pending'");
    }
};
