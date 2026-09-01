<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\School;
use App\Models\Level;
use App\Models\SchoolClass;
use App\Models\PaymentTranche;
use App\Models\ClassPaymentAmount;

class IstpmPaymentFixSeeder extends Seeder
{
    /**
     * Correction des montants de paiement pour ISTPM selon le tableau fourni
     */
    public function run(): void
    {
        $this->command->info('🔧 Correction des montants ISTPM...');

        $school = School::where('code', 'ISTPM')->first();
        
        if (!$school) {
            $this->command->error('❌ École ISTPM introuvable!');
            return;
        }

        $tranches = PaymentTranche::all()->keyBy('name');

        // Configuration correcte selon l'image fournie
        $correctConfigurations = [
            // CQP Santé (1-2 ans)
            'CQP_SANTE' => [
                'specialties' => [
                    'Technicien Adjoint de Laboratoire/Aide Chimiste Biologiste',
                    'Auxiliaire de Puériculture',
                    'Délégué Médical',
                    'Vendeur en Pharmacie',
                    'Secrétariat Médical',
                    'Assistant en Cabinet Médical',
                    'Auxiliaire de Vie',
                    'Massothérapie'
                ],
                'payments' => [
                    'Inscription' => 20000,
                    '1ère Tranche' => 150000,
                    '2ème Tranche' => 60000,
                    '3ème Tranche' => 40000
                ]
            ],

            // CQP Informatique (1 an)
            'CQP_INFORMATIQUE' => [
                'specialties' => [
                    'Développement d\'Application',
                    'Maintenance Réseaux',
                    'Maintenance Informatique',
                    'Web Master',
                    'Graphisme de Production',
                    'Infographie'
                ],
                'payments' => [
                    'Inscription' => 20000,
                    '1ère Tranche' => 150000,
                    '2ème Tranche' => 100000,
                    '3ème Tranche' => 50000
                ]
            ],

            // CQP Gestion (1 an)
            'CQP_GESTION' => [
                'specialties' => [
                    'Comptabilité Informatisé et Gestion',
                    'Secrétariat Comptable',
                    'Secrétariat Bureautique',
                    'Douane et Transit',
                    'Déclarant en Douane',
                    'Marketing Digital'
                ],
                'payments' => [
                    'Inscription' => 20000,
                    '1ère Tranche' => 100000,
                    '2ème Tranche' => 50000,
                    '3ème Tranche' => 50000
                ]
            ],

            // DQP (1 an) - Toutes filières
            'DQP' => [
                'specialties' => [
                    'Délégué Médical',
                    'Vendeur en Pharmacie',
                    'Secrétariat Médical',
                    'Maintenance Réseaux'
                ],
                'payments' => [
                    'Inscription' => 20000,
                    '1ère Tranche' => 150000,
                    '2ème Tranche' => 100000,
                    '3ème Tranche' => 50000
                ]
            ]
        ];

        $this->applyCorrections($school, $correctConfigurations, $tranches);

        $this->command->info('✅ Correction des montants ISTPM terminée!');
        $this->displaySummary($school);
    }

    private function applyCorrections($school, $configurations, $tranches)
    {
        $cqpLevel = Level::where('school_id', $school->id)
            ->where('level_type', 'CQP')
            ->first();
            
        $dqpLevel = Level::where('school_id', $school->id)
            ->where('level_type', 'DQP')
            ->first();

        if (!$cqpLevel || !$dqpLevel) {
            $this->command->error('❌ Niveaux CQP ou DQP introuvables!');
            return;
        }

        // Correction CQP Santé
        $this->correctSpecialties(
            $cqpLevel,
            $configurations['CQP_SANTE']['specialties'],
            $configurations['CQP_SANTE']['payments'],
            $tranches,
            'santé'
        );

        // Correction CQP Informatique
        $this->correctSpecialties(
            $cqpLevel,
            $configurations['CQP_INFORMATIQUE']['specialties'],
            $configurations['CQP_INFORMATIQUE']['payments'],
            $tranches,
            'informatique'
        );

        // Correction CQP Gestion
        $this->correctSpecialties(
            $cqpLevel,
            $configurations['CQP_GESTION']['specialties'],
            $configurations['CQP_GESTION']['payments'],
            $tranches,
            'gestion'
        );

        // Correction DQP
        $this->correctDQPSpecialties(
            $dqpLevel,
            $configurations['DQP']['specialties'],
            $configurations['DQP']['payments'],
            $tranches
        );
    }

    private function correctSpecialties($level, $specialties, $payments, $tranches, $category)
    {
        foreach ($specialties as $specialty) {
            $class = SchoolClass::where('level_id', $level->id)
                ->where('name', $specialty)
                ->first();

            if (!$class) {
                $this->command->warn("⚠️  Spécialité non trouvée: {$specialty}");
                continue;
            }

            // Supprimer tous les anciens montants
            ClassPaymentAmount::where('class_id', $class->id)->delete();

            // Ajouter les nouveaux montants corrects
            foreach ($payments as $trancheName => $amount) {
                if (!isset($tranches[$trancheName])) {
                    continue;
                }



                if ($amount > 0) {
                    ClassPaymentAmount::create([
                        'class_id' => $class->id,
                        'payment_tranche_id' => $tranches[$trancheName]->id,
                        'amount' => $amount,
                        'is_required' => true
                    ]);
                }
            }

            $this->command->info("✓ Corrigé: {$specialty}");
        }
    }

    private function correctDQPSpecialties($level, $specialties, $payments, $tranches)
    {
        foreach ($specialties as $specialty) {
            $class = SchoolClass::where('level_id', $level->id)
                ->where('name', $specialty)
                ->first();

            if (!$class) {
                $this->command->warn("⚠️  Spécialité DQP non trouvée: {$specialty}");
                continue;
            }

            // Supprimer tous les anciens montants
            ClassPaymentAmount::where('class_id', $class->id)->delete();

            // Ajouter les nouveaux montants corrects
            foreach ($payments as $trancheName => $amount) {
                if (!isset($tranches[$trancheName])) {
                    continue;
                }

                if ($amount > 0) {
                    ClassPaymentAmount::create([
                        'class_id' => $class->id,
                        'payment_tranche_id' => $tranches[$trancheName]->id,
                        'amount' => $amount,
                        'is_required' => true
                    ]);
                }
            }

            $this->command->info("✓ Corrigé DQP: {$specialty}");
        }
    }

    private function displaySummary($school)
    {
        $this->command->info('');
        $this->command->info('📊 RÉSUMÉ DES CORRECTIONS ISTPM');
        $this->command->info('==========================================');

        $cqpClasses = SchoolClass::whereHas('level', function($q) use ($school) {
            $q->where('school_id', $school->id)->where('level_type', 'CQP');
        })->count();

        $dqpClasses = SchoolClass::whereHas('level', function($q) use ($school) {
            $q->where('school_id', $school->id)->where('level_type', 'DQP');
        })->count();

        $this->command->info("• CQP Spécialités corrigées: {$cqpClasses}");
        $this->command->info("• DQP Spécialités corrigées: {$dqpClasses}");
        
        $this->command->info('');
        $this->command->info('💰 MONTANTS APPLIQUÉS:');
        $this->command->info('CQP Santé (1-2 ans):');
        $this->command->info('  - Inscription: 20,000 FCFA');
        $this->command->info('  - 1ère Tranche: 150,000 FCFA');
        $this->command->info('  - 2ème Tranche: 60,000 FCFA');
        $this->command->info('  - 3ème Tranche: 40,000 FCFA');
        $this->command->info('  - Total: 270,000 FCFA');
        
        $this->command->info('');
        $this->command->info('CQP Informatique (1 an):');
        $this->command->info('  - Inscription: 20,000 FCFA');
        $this->command->info('  - 1ère Tranche: 150,000 FCFA');
        $this->command->info('  - 2ème Tranche: 100,000 FCFA');
        $this->command->info('  - 3ème Tranche: 50,000 FCFA');
        $this->command->info('  - Total: 320,000 FCFA');
        
        $this->command->info('');
        $this->command->info('CQP Gestion (1 an):');
        $this->command->info('  - Inscription: 20,000 FCFA');
        $this->command->info('  - 1ère Tranche: 100,000 FCFA');
        $this->command->info('  - 2ème Tranche: 50,000 FCFA');
        $this->command->info('  - 3ème Tranche: 50,000 FCFA');
        $this->command->info('  - Total: 220,000 FCFA');
        
        $this->command->info('');
        $this->command->info('DQP (1 an):');
        $this->command->info('  - Inscription: 20,000 FCFA');
        $this->command->info('  - 1ère Tranche: 150,000 FCFA');
        $this->command->info('  - 2ème Tranche: 100,000 FCFA');
        $this->command->info('  - 3ème Tranche: 50,000 FCFA');
        $this->command->info('  - Total: 320,000 FCFA');
        
        $this->command->info('==========================================');
    }
}
