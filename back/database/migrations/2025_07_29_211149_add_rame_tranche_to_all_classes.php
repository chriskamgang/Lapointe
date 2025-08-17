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
        // Ajouter la tranche RAME si elle n'existe pas déjà
        $rameTrancheExists = DB::table('payment_tranches')
            ->where('name', 'RAME')
            ->exists();

        if (!$rameTrancheExists) {
            // Créer la tranche RAME
            $rameTrancheId = DB::table('payment_tranches')->insertGetId([
                'name' => 'RAME',
                'description' => 'Frais de rame scolaire - peut être payé en espèces ou fourni physiquement',
                'order' => 999, // Placer en dernier
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Récupérer toutes les classes actives
            $classes = DB::table('school_classes')
                ->where('is_active', true)
                ->get();

            // Ajouter la tranche RAME à toutes les classes avec un montant par défaut
            foreach ($classes as $class) {
                DB::table('class_payment_amounts')->insert([
                    'class_id' => $class->id,
                    'payment_tranche_id' => $rameTrancheId,
                    'amount_new_students' => 5000, // Montant par défaut 5000 FCFA
                    'amount_old_students' => 5000, // Même montant pour anciens étudiants
                    'is_required' => true,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Supprimer tous les montants de classe pour la tranche RAME
        $rameTrancheId = DB::table('payment_tranches')
            ->where('name', 'RAME')
            ->value('id');

        if ($rameTrancheId) {
            DB::table('class_payment_amounts')
                ->where('payment_tranche_id', $rameTrancheId)
                ->delete();

            // Supprimer la tranche RAME
            DB::table('payment_tranches')
                ->where('id', $rameTrancheId)
                ->delete();
        }
    }
};
