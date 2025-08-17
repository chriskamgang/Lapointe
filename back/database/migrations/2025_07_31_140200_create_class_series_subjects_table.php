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
        Schema::create('class_series_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_series_id')->constrained('class_series')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->decimal('coefficient', 5, 2)->default(1.00); // Coefficient de la matière dans cette série
            $table->boolean('is_active')->default(true); // Matière active dans cette série
            $table->timestamps();
            
            // Contrainte d'unicité : une matière ne peut être qu'une fois par série
            $table->unique(['class_series_id', 'subject_id']);
            
            // Index pour optimiser les requêtes
            $table->index(['class_series_id', 'is_active']);
            $table->index(['subject_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_series_subjects');
    }
};