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
        Schema::create('teacher_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->onDelete('cascade');
            $table->foreignId('supervisor_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('school_year_id')->constrained('school_years')->onDelete('cascade');
            $table->date('attendance_date');
            $table->timestamp('scanned_at');
            $table->boolean('is_present')->default(true);
            $table->enum('event_type', ['entry', 'exit'])->default('entry');
            $table->decimal('work_hours', 4, 2)->nullable();
            $table->integer('late_minutes')->default(0);
            $table->integer('early_departure_minutes')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            // Index pour les requêtes fréquentes
            $table->index(['teacher_id', 'attendance_date'], 'idx_teacher_date');
            $table->index(['supervisor_id', 'attendance_date'], 'idx_supervisor_date');
            $table->index(['school_year_id', 'attendance_date'], 'idx_year_date');
            $table->index(['attendance_date', 'event_type'], 'idx_date_event');
            $table->index(['teacher_id', 'school_year_id'], 'idx_teacher_year');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_attendances');
    }
};