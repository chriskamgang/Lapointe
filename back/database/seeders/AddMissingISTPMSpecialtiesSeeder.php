<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\School;
use App\Models\Level;
use App\Models\SchoolClass;
use App\Models\ClassSeries;

class AddMissingISTPMSpecialtiesSeeder extends Seeder
{
    /**
     * Add missing specializations for ISTPM that should exist in CQP santé but are missing
     */
    public function run(): void
    {
        $this->command->info('🔧 Ajout des spécialités ISTPM manquantes...');

        $school = School::where('code', 'ISTPM')->first();
        
        if (!$school) {
            $this->command->error('❌ École ISTPM introuvable!');
            return;
        }

        // Récupérer le niveau CQP
        $cqpLevel = Level::where('school_id', $school->id)
            ->where('level_type', 'CQP')
            ->first();

        if (!$cqpLevel) {
            $this->command->error('❌ Niveau CQP ISTPM introuvable!');
            return;
        }

        // Spécialités manquantes dans CQP santé
        $missingSpecialties = [
            'Délégué Médical',
            'Vendeur en Pharmacie', 
            'Secrétariat Médical'
        ];

        foreach ($missingSpecialties as $specialty) {
            $existingClass = SchoolClass::where('name', $specialty)
                ->where('level_id', $cqpLevel->id)
                ->first();

            if ($existingClass) {
                $this->command->info("⚠️  Spécialité déjà existante: {$specialty}");
                continue;
            }

            $class = SchoolClass::create([
                'name' => $specialty,
                'level_id' => $cqpLevel->id,
                'description' => "{$specialty} - CQP",
                'speciality_code' => strtoupper(str_replace([' ', '\'', '/'], '_', $specialty)),
                'category' => 'cqp_sante',
                'is_active' => true,
                'max_capacity' => 40
            ]);

            // Créer une série pour la classe
            ClassSeries::create([
                'class_id' => $class->id,
                'name' => 'A',
                'capacity' => 30,
                'is_active' => true
            ]);

            $this->command->info("✓ Ajouté: {$specialty} (CQP Santé)");
        }

        $this->command->info('✅ Ajout des spécialités ISTPM manquantes terminé!');
    }
}