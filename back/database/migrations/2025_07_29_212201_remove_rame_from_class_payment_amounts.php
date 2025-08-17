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
        // Supprimer tous les montants de classe pour la tranche RAME
        // car elle utilise maintenant un montant par défaut
        $rameTrancheId = DB::table('payment_tranches')
            ->where('name', 'RAME')
            ->value('id');

        if ($rameTrancheId) {
            DB::table('class_payment_amounts')
                ->where('payment_tranche_id', $rameTrancheId)
                ->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recréer les montants de classe pour la tranche RAME si nécessaire
        $rameTrancheId = DB::table('payment_tranches')
            ->where('name', 'RAME')
            ->value('id');

        if ($rameTrancheId) {
            $classes = DB::table('school_classes')
                ->where('is_active', true)
                ->get();

            foreach ($classes as $class) {
                DB::table('class_payment_amounts')->insert([
                    'class_id' => $class->id,
                    'payment_tranche_id' => $rameTrancheId,
                    'amount_new_students' => 5000,
                    'amount_old_students' => 5000,
                    'is_required' => true,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }
        }
    }
};
