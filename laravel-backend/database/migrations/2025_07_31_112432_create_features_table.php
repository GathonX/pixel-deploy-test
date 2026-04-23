<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('features', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique(); // business_plan, ai_content, social_media
            $table->string('name'); // Business Plan, Contenu IA, Réseaux Sociaux
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2); // Prix de la fonctionnalité
            $table->string('category')->default('premium'); // free, premium, enterprise
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('features');
    }
};
