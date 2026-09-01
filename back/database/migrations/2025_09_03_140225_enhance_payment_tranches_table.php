<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        Schema::table('payment_tranches', function (Blueprint $table) {
            //$table->boolean('is_equipment')->default(false)->after('is_active');
            //$table->enum('equipment_type', ['polo', 'blouse', 'laptop', 'rame', 'concours'])->nullable()->after('is_equipment');
            //$table->boolean('requires_physical_item')->default(false)->after('equipment_type');
            $table->boolean('allows_physical_substitute')->default(false)->after('requires_physical_item');
            //$table->decimal('default_amount', 10, 2)->nullable()->after('allows_physical_substitute');
            $table->json('school_specific_amounts')->nullable()->after('default_amount');
        });

        // Insérer les tranches spécialisées (VERSION CORRIGÉE)
        DB::table('payment_tranches')->insertOrIgnore([
            [
                'name' => 'Étude de dossier',
                'description' => 'Frais d\'étude de dossier',
                'order' => 1,
                'is_equipment' => false,
                'equipment_type' => null,
                'requires_physical_item' => null,
                'default_amount' => 10000,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Blouse',
                'description' => 'Blouse médicale',
                'order' => 3,
                'is_equipment' => true,
                'equipment_type' => 'blouse',
                'requires_physical_item' => true,
                'default_amount' => 7500,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Polo',
                'description' => 'Polo école avec logo',
                'order' => 3,
                'is_equipment' => true,
                'equipment_type' => 'polo',
                'requires_physical_item' => true,
                'default_amount' => 6500,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Frais de tutelle académique',
                'description' => 'Frais de tutelle universitaire',
                'order' => 7,
                'is_equipment' => false,
                'equipment_type' => null,
                'requires_physical_item' => null,
                'default_amount' => 50000,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Frais d\'établissement de diplôme',
                'description' => 'Frais pour l\'établissement du diplôme',
                'order' => 8,
                'is_equipment' => false,
                'equipment_type' => null,
                'requires_physical_item' => null,
                'default_amount' => 15000, // Corrigé: 15000 au lieu de 25000 selon INSSAS
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'name' => 'Frais de concours',
                'description' => 'Frais de concours d\'admission',
                'order' => 1,
                'is_equipment' => false, // Corrigé: ce n'est pas un équipement
                'equipment_type' => null, // Corrigé: pas de type d'équipement
                'requires_physical_item' => null, // Corrigé: pas d'objet physique
                'default_amount' => 25000,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);

        // Mettre à jour les tranches existantes
        DB::statement("UPDATE payment_tranches SET is_equipment = true, equipment_type = 'rame', requires_physical_item = true, allows_physical_substitute = true WHERE name = 'Rames de papier' OR name LIKE '%Rame%'");
    }

    public function down()
    {
        Schema::table('payment_tranches', function (Blueprint $table) {
            $table->dropColumn(['is_equipment', 'equipment_type', 'requires_physical_item', 'allows_physical_substitute', 'default_amount', 'school_specific_amounts']);
        });
    }
};
