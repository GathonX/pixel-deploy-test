<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_domains', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            $table->string('site_id', 50);
            $table->string('domain', 255);
            $table->enum('type', ['subdomain', 'custom'])->default('subdomain');
            $table->enum('status', ['pending', 'verified', 'error'])->default('pending');
            $table->timestamps();

            $table->foreign('site_id')
                ->references('id')
                ->on('user_sites')
                ->onDelete('cascade');

            $table->unique('domain');
            $table->index(['site_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_domains');
    }
};
