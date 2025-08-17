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
        Schema::table('class_series', function (Blueprint $table) {
            $table->foreignId('main_teacher_id')->nullable()->constrained('teachers')->onDelete('set null')->after('is_active');
            $table->foreignId('school_year_id')->nullable()->constrained('school_years')->onDelete('cascade')->after('main_teacher_id');
            
            // Index pour optimiser les requêtes
            $table->index(['main_teacher_id']);
            $table->index(['school_year_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class_series', function (Blueprint $table) {
            $table->dropForeign(['main_teacher_id']);
            $table->dropForeign(['school_year_id']);
            $table->dropColumn(['main_teacher_id', 'school_year_id']);
        });
    }
};