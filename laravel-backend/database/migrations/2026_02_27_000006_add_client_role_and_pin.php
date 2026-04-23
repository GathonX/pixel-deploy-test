<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Ajouter 'client' au rôle de workspace_invitations
        DB::statement("ALTER TABLE workspace_invitations MODIFY COLUMN role ENUM('admin','member','client') NOT NULL DEFAULT 'member'");

        // Ajouter 'client' au rôle de workspace_users
        DB::statement("ALTER TABLE workspace_users MODIFY COLUMN role ENUM('owner','admin','member','client') NOT NULL DEFAULT 'member'");

        // PIN de protection des données client (bcrypt hash)
        Schema::table('workspace_users', function (Blueprint $table) {
            $table->string('client_data_pin')->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('workspace_users', function (Blueprint $table) {
            $table->dropColumn('client_data_pin');
        });

        DB::statement("ALTER TABLE workspace_users MODIFY COLUMN role ENUM('owner','admin','member') NOT NULL DEFAULT 'member'");
        DB::statement("ALTER TABLE workspace_invitations MODIFY COLUMN role ENUM('admin','member') NOT NULL DEFAULT 'member'");
    }
};
