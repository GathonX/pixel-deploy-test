<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_languages', function (Blueprint $table) {
            $table->id();
            $table->string('site_id', 50);
            $table->string('language_code', 10); // fr, en, mg
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->boolean('is_default')->default(false);
            $table->boolean('is_paid_extra')->default(false);
            $table->timestamps();

            $table->foreign('site_id')->references('id')->on('user_sites')->onDelete('cascade');
            $table->unique(['site_id', 'language_code']);
            $table->index('site_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_languages');
    }
};
