<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\PaymentTranche;
use App\Models\ClassPaymentAmount;

class FixMissingISTPMPaymentAmountsSeeder extends Seeder
{
    /**
     * Fix missing payment amounts for ISTPM classes based on the correct configuration
     */
    public function run(): void
    {
        $this->command->info('🔧 Correction des montants de paiement manquants pour ISTPM...');

        $school = School::where('code', 'ISTPM')->first();
        
        if (!$school) {
            $this->command->error('❌ École ISTPM introuvable!');
            return;
        }

        $tranches = PaymentTranche::all()->keyBy('name');

        // Configuration correcte selon l'image fournie dans IstpmPaymentFixSeeder
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

        // Other tranches that are common to all
        $commonPayments = [
            'Étude de dossier' => 25000,
            'Blouse' => 15000,
            'Polo' => 10000,
            'Frais de tutelle académique' => 15000,
            'Frais d\'établissement de diplôme' => 10000,
            'Frais de concours' => 50000,
            'Rames de papier' => 2500  // Assuming a reasonable amount
        ];

        $totalCreated = 0;
        $totalUpdated = 0;

        foreach ($correctConfigurations as $configKey => $config) {
            foreach ($config['specialties'] as $specialty) {
                $class = SchoolClass::where('name', $specialty)
                    ->whereHas('level', function($q) use ($school) {
                        $q->where('school_id', $school->id);
                    })
                    ->first();

                if (!$class) {
                    $this->command->warn("⚠️  Spécialité non trouvée: {$specialty}");
                    continue;
                }

                // Create payments for this specialty based on its category
                foreach ($config['payments'] as $trancheName => $amount) {
                    $tranche = $tranches[$trancheName] ?? null;
                    if (!$tranche) {
                        $this->command->warn("⚠️  Tranche non trouvée: {$trancheName}");
                        continue;
                    }

                    $existing = ClassPaymentAmount::where('class_id', $class->id)
                        ->where('payment_tranche_id', $tranche->id)
                        ->first();

                    if ($existing) {
                        $this->command->info("⚠️  Montant existant pour {$class->name} - {$trancheName}: {$existing->amount}, devrait être: {$amount}");
                        // Optionally update if needed to match the correct config
                        if ($existing->amount != $amount) {
                            $existing->update(['amount' => $amount]);
                            $this->command->info("✓ Montant mis à jour pour {$class->name} - {$trancheName}: {$amount}");
                            $totalUpdated++;
                        }
                    } else {
                        ClassPaymentAmount::create([
                            'class_id' => $class->id,
                            'payment_tranche_id' => $tranche->id,
                            'amount' => $amount,
                            'is_required' => true
                        ]);
                        $this->command->info("✓ Montant créé pour {$class->name} - {$trancheName}: {$amount}");
                        $totalCreated++;
                    }
                }

                // Create common payments for this class
                foreach ($commonPayments as $trancheName => $amount) {
                    $tranche = $tranches[$trancheName] ?? null;
                    if (!$tranche) {
                        $this->command->warn("⚠️  Tranche non trouvée: {$trancheName}");
                        continue;
                    }

                    $existing = ClassPaymentAmount::where('class_id', $class->id)
                        ->where('payment_tranche_id', $tranche->id)
                        ->first();

                    if (!$existing) {
                        ClassPaymentAmount::create([
                            'class_id' => $class->id,
                            'payment_tranche_id' => $tranche->id,
                            'amount' => $amount,
                            'is_required' => true
                        ]);
                        $this->command->info("✓ Montant créé pour {$class->name} - {$trancheName}: {$amount}");
                        $totalCreated++;
                    }
                }
            }
        }

        $this->command->info('✅ Correction des montants de paiement ISTPM terminée!');
        $this->command->info("📊 Résumé: {$totalCreated} montants créés, {$totalUpdated} montants mis à jour");
    }
}