<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\School;
use App\Models\Level;
use App\Models\SchoolClass;
use App\Models\ClassSeries;
use App\Models\PaymentTranche;
use App\Models\ClassPaymentAmount;

class AddMissingESSITSpecialtiesSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Ajout des spécialités manquantes ESSIT...');

        $school = School::where('code', 'ESSIT')->first();
        
        if (!$school) {
            $this->command->error('École ESSIT non trouvée');
            return;
        }

        // Récupérer les niveaux BTS de ESSIT
        $btsLevels = Level::where('school_id', $school->id)
            ->where('level_type', 'BTS')
            ->get();

        if ($btsLevels->isEmpty()) {
            $this->command->error('Aucun niveau BTS trouvé pour ESSIT');
            return;
        }

        // Les spécialités à ajouter
        $specialties = [
            'Hôtelier et restauration',
            'Génie culinaire'
        ];

        foreach ($specialties as $specialty) {
            foreach ($btsLevels as $level) {
                // Créer la classe
                $class = SchoolClass::updateOrCreate(
                    ['name' => $specialty, 'level_id' => $level->id],
                    [
                        'description' => "$specialty - {$level->name}",
                        'speciality_code' => strtoupper(str_replace([' ', 'é', 'è', 'ê'], ['_', 'E', 'E', 'E'], $specialty)),
                        'category' => 'standard',
                        'is_active' => true
                    ]
                );

                $this->command->info("Classe créée: {$specialty} - {$level->name}");

                // Configurer les paiements
                $this->configurePayments($class);

                // Créer la série A si elle n'existe pas
                ClassSeries::firstOrCreate(
                    ['class_id' => $class->id, 'name' => 'A'],
                    ['capacity' => 40, 'is_active' => true]
                );

                $this->command->info("Série créée: {$specialty} - {$level->name} - Série A");
            }
        }

        $this->command->info('Spécialités ajoutées avec succès !');
        $this->command->info('Total: ' . count($specialties) . ' spécialités x ' . $btsLevels->count() . ' niveaux');
    }

    private function configurePayments($class)
    {
        $tranches = PaymentTranche::all()->keyBy('name');

        // Montants pour BTS ESSIT standard (150k / 100k / 50k)
        $amounts = [
            'Étude de dossier' => 10000,
            'Inscription' => 40000,
            'Polo' => 6500,
            'Rames de papier' => 22500,
            '1ère Tranche' => 150000,
            '2ème Tranche' => 100000,
            '3ème Tranche' => 50000
        ];

        foreach ($amounts as $trancheName => $amount) {
            if (isset($tranches[$trancheName]) && $amount > 0) {
                ClassPaymentAmount::updateOrCreate(
                    [
                        'class_id' => $class->id, 
                        'payment_tranche_id' => $tranches[$trancheName]->id
                    ],
                    [
                        'amount' => $amount, 
                        'is_required' => true
                    ]
                );
            }
        }
    }
}