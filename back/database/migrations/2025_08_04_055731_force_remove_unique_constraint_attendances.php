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
        // Forcer la suppression de la contrainte unique en utilisant du SQL brut
        echo "Tentative de suppression de la contrainte unique...\n";
        
        try {
            // Méthode 1: DROP INDEX
            DB::statement('ALTER TABLE attendances DROP INDEX unique_student_daily_attendance');
            echo "✅ Contrainte supprimée avec DROP INDEX\n";
        } catch (\Exception $e1) {
            echo "❌ DROP INDEX échoué: " . $e1->getMessage() . "\n";
            
            try {
                // Méthode 2: DROP CONSTRAINT (au cas où c'est une contrainte)
                DB::statement('ALTER TABLE attendances DROP CONSTRAINT unique_student_daily_attendance');
                echo "✅ Contrainte supprimée avec DROP CONSTRAINT\n";
            } catch (\Exception $e2) {
                echo "❌ DROP CONSTRAINT échoué: " . $e2->getMessage() . "\n";
                
                try {
                    // Méthode 3: Recréer la table sans la contrainte
                    echo "🔄 Tentative de recréation de la table...\n";
                    
                    // Créer une table temporaire
                    DB::statement('CREATE TABLE attendances_temp LIKE attendances');
                    DB::statement('ALTER TABLE attendances_temp DROP INDEX unique_student_daily_attendance');
                    
                    // Copier les données
                    DB::statement('INSERT INTO attendances_temp SELECT * FROM attendances');
                    
                    // Remplacer la table
                    DB::statement('DROP TABLE attendances');
                    DB::statement('RENAME TABLE attendances_temp TO attendances');
                    
                    echo "✅ Table recréée sans contrainte unique\n";
                } catch (\Exception $e3) {
                    echo "❌ Recréation échouée: " . $e3->getMessage() . "\n";
                    throw new \Exception("Impossible de supprimer la contrainte unique après plusieurs tentatives");
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Ne pas remettre la contrainte car elle pose problème
        echo "Rollback: La contrainte unique ne sera pas restaurée car elle empêche les entrées/sorties multiples\n";
    }
};
