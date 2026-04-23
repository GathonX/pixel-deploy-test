<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE tasks MODIFY COLUMN type ENUM('mission','vision','objective','action','reservation') NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE tasks MODIFY COLUMN type ENUM('mission','vision','objective','action') NULL");
    }
};
