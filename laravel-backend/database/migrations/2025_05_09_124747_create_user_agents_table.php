<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_agents', function (Blueprint $table) {
            $table->id();
            $table->string('agent', 1000);
            $table->string('page')->nullable();
            $table->string('language')->nullable();
            $table->string('timezone')->nullable();
            $table->string('device')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->string('action')->nullable();
    $table->string('status')->default('Succès'); // ou 'Échec'
            $table->string('user_type')->default('user');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_agents');
    }
};
