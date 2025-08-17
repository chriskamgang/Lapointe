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
        Schema::create('teacher_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->foreignId('subject_id')->constrained('subjects')->onDelete('cascade');
            $table->foreignId('class_series_id')->constrained('class_series')->onDelete('cascade');
            $table->foreignId('school_year_id')->constrained('school_years')->onDelete('cascade');
            $table->boolean('is_active')->default(true); // Assignation active
            $table->timestamps();
            
            // Contrainte d'unicité : un enseignant ne peut enseigner qu'une fois la même matière dans la même série pour la même année
            $table->unique(['teacher_id', 'subject_id', 'class_series_id', 'school_year_id'], 'teacher_subject_series_year_unique');
            
            // Index pour optimiser les requêtes
            $table->index(['teacher_id', 'school_year_id']);
            $table->index(['class_series_id', 'school_year_id']);
            $table->index(['subject_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_subjects');
    }
};