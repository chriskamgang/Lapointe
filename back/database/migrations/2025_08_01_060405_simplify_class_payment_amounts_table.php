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
        Schema::table('class_payment_amounts', function (Blueprint $table) {
            // Ajouter la nouvelle colonne amount
            $table->decimal('amount', 10, 2)->after('payment_tranche_id');
            
            // Migrer les données existantes (prendre le montant des nouveaux étudiants)
            // Cette migration sera appliquée après
        });
        
        // Migrer les données existantes
        $this->migrateExistingData();
        
        Schema::table('class_payment_amounts', function (Blueprint $table) {
            // Supprimer les anciennes colonnes
            $table->dropColumn(['amount_new_students', 'amount_old_students']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('class_payment_amounts', function (Blueprint $table) {
            // Restaurer les anciennes colonnes
            $table->decimal('amount_new_students', 10, 2)->after('payment_tranche_id');
            $table->decimal('amount_old_students', 10, 2)->after('amount_new_students');
            
            // Migrer les données de retour
            DB::statement('UPDATE class_payment_amounts SET amount_new_students = amount, amount_old_students = amount * 0.9');
            
            // Supprimer la nouvelle colonne
            $table->dropColumn('amount');
        });
    }
    
    /**
     * Migrer les données existantes
     */
    private function migrateExistingData(): void
    {
        // Utiliser le montant des nouveaux étudiants comme montant unique
        DB::statement('UPDATE class_payment_amounts SET amount = amount_new_students');
    }
};