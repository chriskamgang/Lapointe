<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->enum('student_status', ['new', 'old'])->default('new')->after('email')
                ->comment('Statut de l\'étudiant: nouveau ou ancien');
        });

        // Marquer tous les étudiants existants comme nouveaux par défaut
        DB::table('students')->update(['student_status' => 'new']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('student_status');
        });
    }
};
