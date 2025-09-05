<?php
// Créer cette migration avec: php artisan make:migration add_is_working_year_to_school_years_table

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        Schema::table('school_years', function (Blueprint $table) {
            $table->boolean('is_working_year')->default(false)->after('is_current');
        });
        
        // Définir l'année courante comme année de travail par défaut
        DB::statement('UPDATE school_years SET is_working_year = is_current');
    }

    public function down()
    {
        Schema::table('school_years', function (Blueprint $table) {
            $table->dropColumn('is_working_year');
        });
    }
};