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
        Schema::table('students', function (Blueprint $table) {
            // Nouveaux champs pour la gestion moderne des élèves
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->date('date_of_birth')->nullable()->after('last_name');
            $table->string('place_of_birth')->nullable()->after('date_of_birth');
            $table->enum('gender', ['M', 'F'])->nullable()->after('place_of_birth');
            $table->string('parent_name')->nullable()->after('gender');
            $table->string('parent_phone', 20)->nullable()->after('parent_name');
            $table->string('parent_email')->nullable()->after('parent_phone');
            $table->text('address')->nullable()->after('parent_email');
            $table->foreignId('school_year_id')->nullable()->constrained()->after('address');
            $table->string('student_number')->unique()->nullable()->after('school_year_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropForeign(['school_year_id']);
            $table->dropColumn([
                'first_name',
                'last_name', 
                'date_of_birth',
                'place_of_birth',
                'gender',
                'parent_name',
                'parent_phone',
                'parent_email',
                'address',
                'school_year_id',
                'student_number'
            ]);
        });
    }
};
