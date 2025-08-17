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
        Schema::table('payments', function (Blueprint $table) {
            // Ajouter les nouvelles colonnes comme nullable d'abord
            $table->date('versement_date')->nullable()->after('payment_date')->comment('Date de versement (pour calcul des réductions)');
            $table->timestamp('validation_date')->nullable()->after('versement_date')->comment('Date de validation du paiement (automatique)');
        });
        
        // Migrer les données existantes
        $this->migrateExistingData();
        
        // Optionnel: Supprimer payment_date si on veut garder seulement les nouvelles colonnes
        // Schema::table('payments', function (Blueprint $table) {
        //     $table->dropColumn('payment_date');
        // });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['versement_date', 'validation_date']);
        });
    }
    
    /**
     * Migrer les données existantes
     */
    private function migrateExistingData(): void
    {
        // Copier payment_date vers versement_date et utiliser created_at comme validation_date
        // Gérer les cas où payment_date pourrait être null ou invalide
        DB::statement("
            UPDATE payments 
            SET versement_date = CASE 
                WHEN payment_date IS NOT NULL AND payment_date != '0000-00-00' THEN payment_date 
                ELSE DATE(created_at) 
            END,
            validation_date = created_at
        ");
    }
};