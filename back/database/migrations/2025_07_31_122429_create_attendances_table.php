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
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
            $table->foreignId('supervisor_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('school_class_id')->constrained('school_classes')->onDelete('cascade');
            $table->foreignId('school_year_id')->constrained('school_years')->onDelete('cascade');
            $table->date('attendance_date');
            $table->time('scanned_at');
            $table->boolean('is_present')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            // Un élève ne peut être marqué présent qu'une fois par jour
            $table->unique(['student_id', 'attendance_date'], 'unique_student_daily_attendance');
            
            // Index pour les requêtes fréquentes
            $table->index(['school_class_id', 'attendance_date'], 'idx_class_date');
            $table->index(['supervisor_id', 'attendance_date'], 'idx_supervisor_date');
            $table->index(['school_year_id', 'attendance_date'], 'idx_year_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
