<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        Schema::create('speciality_presets', function (Blueprint $table) {
            $table->id();
            $table->string('school_code', 10);
            $table->string('level_type', 50);
            $table->string('speciality_name');
            $table->string('speciality_code', 100);
            $table->string('category', 50);
            $table->text('description')->nullable();
            $table->json('characteristics')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['school_code', 'level_type']);
        });

        // Insérer les presets de spécialités
        $this->insertSpecialityPresets();
    }

    public function down()
    {
        Schema::dropIfExists('speciality_presets');
    }

    private function insertSpecialityPresets()
    {
        $inssasPresets = [
            // BTS générales
            ['school_code' => 'INSSAS', 'level_type' => 'BTS', 'speciality_name' => 'Sciences Infirmières', 'speciality_code' => 'SCIENCES_INFIRMIERES', 'category' => 'generale'],
            ['school_code' => 'INSSAS', 'level_type' => 'BTS', 'speciality_name' => 'Sage-Femme/Maïeuticien', 'speciality_code' => 'SAGE_FEMME_MAIEUTICIEN', 'category' => 'generale'],
            ['school_code' => 'INSSAS', 'level_type' => 'BTS', 'speciality_name' => 'Nursing', 'speciality_code' => 'NURSING', 'category' => 'generale'],
            ['school_code' => 'INSSAS', 'level_type' => 'BTS', 'speciality_name' => 'Midwifery', 'speciality_code' => 'MIDWIFERY', 'category' => 'generale'],
            
            // BTS spécialisées
            ['school_code' => 'INSSAS', 'level_type' => 'BTS', 'speciality_name' => 'Techniques de Laboratoire d\'Analyses Médicales', 'speciality_code' => 'TECHNIQUES_LABORATOIRE_AM', 'category' => 'specialisee'],
            ['school_code' => 'INSSAS', 'level_type' => 'BTS', 'speciality_name' => 'Kinésithérapie', 'speciality_code' => 'KINESITHERAPIE', 'category' => 'specialisee'],
            ['school_code' => 'INSSAS', 'level_type' => 'BTS', 'speciality_name' => 'Sciences et Techniques Pharmaceutiques', 'speciality_code' => 'SCIENCES_TECHNIQUES_PHARMA', 'category' => 'specialisee'],
            ['school_code' => 'INSSAS', 'level_type' => 'BTS', 'speciality_name' => 'Imagerie Médicale et Radiologie', 'speciality_code' => 'IMAGERIE_MEDICALE_RADIO', 'category' => 'specialisee'],
            ['school_code' => 'INSSAS', 'level_type' => 'BTS', 'speciality_name' => 'Odontostomatologie', 'speciality_code' => 'ODONTOSTOMATOLOGIE', 'category' => 'specialisee'],
            ['school_code' => 'INSSAS', 'level_type' => 'BTS', 'speciality_name' => 'Opticien-Lunetier', 'speciality_code' => 'OPTICIEN_LUNETIER', 'category' => 'specialisee'],
        ];

        $esgitPresets = [
            ['school_code' => 'ESGIT', 'level_type' => 'BTS', 'speciality_name' => 'Génie Logiciel', 'speciality_code' => 'GENIE_LOGICIEL', 'category' => 'informatique'],
            ['school_code' => 'ESGIT', 'level_type' => 'BTS', 'speciality_name' => 'Infographie et Web Design', 'speciality_code' => 'INFOGRAPHIE_WEB_DESIGN', 'category' => 'informatique'],
            ['school_code' => 'ESGIT', 'level_type' => 'BTS', 'speciality_name' => 'E-Commerce et Marketing Numérique', 'speciality_code' => 'ECOMMERCE_MARKETING_NUMERIQUE', 'category' => 'ecommerce'],
            ['school_code' => 'ESGIT', 'level_type' => 'BTS', 'speciality_name' => 'Réseaux et Sécurité', 'speciality_code' => 'RESEAUX_SECURITE', 'category' => 'informatique'],
        ];

        foreach (array_merge($inssasPresets, $esgitPresets) as $preset) {
            DB::table('speciality_presets')->insert(array_merge($preset, [
                'created_at' => now(),
                'updated_at' => now(),
                'is_active' => true
            ]));
        }
    }
};
