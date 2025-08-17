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
        Schema::create('supervisor_class_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supervisor_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('school_class_id')->constrained('school_classes')->onDelete('cascade');
            $table->foreignId('school_year_id')->constrained('school_years')->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Un surveillant ne peut être affecté qu'une fois par classe et année scolaire
            $table->unique(['supervisor_id', 'school_class_id', 'school_year_id'], 'unique_supervisor_class_year');
            
            // Index pour les requêtes fréquentes
            $table->index(['supervisor_id', 'school_year_id'], 'idx_supervisor_year');
            $table->index(['school_class_id', 'school_year_id'], 'idx_class_year');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supervisor_class_assignments');
    }
};