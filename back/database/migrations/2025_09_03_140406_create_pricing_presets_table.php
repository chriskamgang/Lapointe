<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        Schema::create('pricing_presets', function (Blueprint $table) {
            $table->id();
            $table->string('school_code', 10);
            $table->string('level_type', 50);
            $table->string('category', 50);
            $table->string('speciality_name')->nullable();
            $table->json('pricing_structure');
            $table->json('equipment_requirements');
            $table->json('scholarship_config');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['school_code', 'level_type', 'category'], 'unique_pricing_preset');
            $table->index(['school_code', 'is_active']);
        });

        // Insérer les presets de base
        $this->insertPricingPresets();
    }

    public function down()
    {
        Schema::dropIfExists('pricing_presets');
    }

    private function insertPricingPresets()
    {
        $presets = [
            [
                'school_code' => 'INSSAS',
                'level_type' => 'BTS',
                'category' => 'generale',
                'pricing_structure' => json_encode([
                    'Étude de dossier' => 10000,
                    'Inscription' => 40000,
                    'Blouse' => 7500,
                    'Rames de papier' => 22500,
                    '1ère Tranche' => 200000,
                    '2ème Tranche' => 150000,
                    '3ème Tranche' => 150000
                ]),
                'equipment_requirements' => json_encode([
                    'polo' => false, 'blouse' => true, 'laptop' => false, 'rame' => true
                ]),
                'scholarship_config' => json_encode([
                    'eligible' => true, 'level_1_amount' => 50000, 'level_2_plus_amount' => 100000
                ])
            ],
            [
                'school_code' => 'INSSAS',
                'level_type' => 'BTS',
                'category' => 'specialisee',
                'pricing_structure' => json_encode([
                    'Étude de dossier' => 10000,
                    'Inscription' => 40000,
                    'Blouse' => 7500,
                    'Rames de papier' => 22500,
                    '1ère Tranche' => 250000,
                    '2ème Tranche' => 150000,
                    '3ème Tranche' => 150000
                ]),
                'equipment_requirements' => json_encode([
                    'polo' => false, 'blouse' => true, 'laptop' => false, 'rame' => true
                ]),
                'scholarship_config' => json_encode([
                    'eligible' => true, 'level_1_amount' => 50000, 'level_2_plus_amount' => 100000
                ])
            ],
            [
                'school_code' => 'ESGIT',
                'level_type' => 'BTS',
                'category' => 'informatique',
                'pricing_structure' => json_encode([
                    'Étude de dossier' => 10000,
                    'Inscription' => 40000,
                    'Polo' => 6500,
                    'Rames de papier' => 22500,
                    '1ère Tranche' => 150000,
                    '2ème Tranche' => 100000,
                    '3ème Tranche' => 50000
                ]),
                'equipment_requirements' => json_encode([
                    'polo' => true, 'blouse' => false, 'laptop' => true, 'rame' => true
                ]),
                'scholarship_config' => json_encode([
                    'eligible' => false
                ])
            ],
            [
                'school_code' => 'ESGIT',
                'level_type' => 'LICENCE_PRO',
                'category' => 'default',
                'pricing_structure' => json_encode([
                    'Étude de dossier' => 10000,
                    'Inscription' => 50000,
                    'Polo' => 6500,
                    'Rames de papier' => 15000,
                    'Frais de tutelle académique' => 50000,
                    'Frais d\'établissement de diplôme' => 15000,
                    '1ère Tranche' => 250000,
                    '2ème Tranche' => 150000,
                    '3ème Tranche' => 100000
                ]),
                'equipment_requirements' => json_encode([
                    'polo' => true, 'blouse' => false, 'laptop' => true, 'rame' => true
                ]),
                'scholarship_config' => json_encode([
                    'eligible' => true, 'type' => 'merit_based', 'depends_on' => 'bts_mention'
                ])
            ]
        ];

        foreach ($presets as $preset) {
            DB::table('pricing_presets')->insert(array_merge($preset, [
                'created_at' => now(),
                'updated_at' => now()
            ]));
        }
    }
};
