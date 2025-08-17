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
        // Approche en plusieurs étapes pour éviter les conflits de contraintes
        
        // Étape 1: Ajouter le champ event_type s'il n'existe pas
        if (!Schema::hasColumn('attendances', 'event_type')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->enum('event_type', ['entry', 'exit'])->default('entry')->after('is_present');
            });
        }
        
        // Étape 2: Mettre à jour les données existantes pour avoir event_type = 'entry'
        DB::statement("UPDATE attendances SET event_type = 'entry' WHERE event_type IS NULL OR event_type = ''");
        
        // Étape 3: Supprimer la contrainte unique en utilisant du SQL brut
        try {
            DB::statement('ALTER TABLE attendances DROP INDEX unique_student_daily_attendance');
        } catch (\Exception $e) {
            // Si la contrainte n'existe pas ou ne peut pas être supprimée, continuer
            \Log::info('Contrainte unique_student_daily_attendance déjà supprimée ou inexistante: ' . $e->getMessage());
        }
        
        // Étape 4: Ajouter un index pour optimiser les requêtes
        Schema::table('attendances', function (Blueprint $table) {
            // Vérifier si l'index n'existe pas déjà
            $indexes = DB::select("SHOW INDEX FROM attendances WHERE Key_name = 'idx_student_date_event'");
            if (empty($indexes)) {
                $table->index(['student_id', 'attendance_date', 'event_type'], 'idx_student_date_event');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            // Remettre la contrainte d'unicité (attention: cela peut échouer s'il y a des données dupliquées)
            $table->unique(['student_id', 'attendance_date'], 'unique_student_daily_attendance');
            
            // Supprimer l'index ajouté
            $table->dropIndex('idx_student_date_event');
            
            // Supprimer le champ event_type s'il a été ajouté
            if (Schema::hasColumn('attendances', 'event_type')) {
                $table->dropColumn('event_type');
            }
        });
    }
};
