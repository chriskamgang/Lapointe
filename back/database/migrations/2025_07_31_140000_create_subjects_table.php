<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Nom de la matière (ex: Mathématiques, Français)
            $table->string('code', 10)->unique(); // Code unique (ex: MATH, FR)
            $table->text('description')->nullable(); // Description optionnelle
            $table->boolean('is_active')->default(true); // Matière active/inactive
            $table->timestamps();
            
            // Index pour optimiser les requêtes
            $table->index(['is_active']);
            $table->index(['code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subjects');
    }
};