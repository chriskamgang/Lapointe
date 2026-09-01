<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('student_scholarships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('school_year_id')->constrained()->onDelete('cascade');
            $table->foreignId('university_scholarship_id')->nullable()->constrained()->onDelete('set null');
            $table->decimal('scholarship_amount', 10, 2);
            $table->boolean('laptop_included')->default(false);
            $table->boolean('is_applied')->default(false);
            $table->date('applied_date')->nullable();
            $table->string('scholarship_type', 50); // 'automatic', 'merit_based', 'need_based'
            $table->json('eligibility_details')->nullable();
            $table->text('conditions')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['student_id', 'school_year_id'], 'unique_student_scholarship');
            $table->index(['scholarship_amount']);
            $table->index(['is_applied']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('student_scholarships');
    }
};
