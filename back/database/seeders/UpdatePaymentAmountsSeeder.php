<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SchoolClass;
use App\Models\PaymentTranche;
use App\Models\ClassPaymentAmount;

class UpdatePaymentAmountsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Configuration des montants de paiement pour les classes existantes...');
        
        // Supprimer les anciennes configurations
        ClassPaymentAmount::truncate();
        
        $tranches = PaymentTranche::all();
        $classes = SchoolClass::with('level')->get();
        
        foreach ($classes as $class) {
            $this->command->info("Configuration classe: {$class->name}");
            
            // Déterminer les montants selon le niveau
            $levelName = $class->level->name ?? 'CP';
            $amounts = $this->getAmountsForLevel($levelName);
            
            foreach ($tranches as $tranche) {
                $config = $this->getConfigForTranche($tranche->name, $amounts);
                
                ClassPaymentAmount::create([
                    'class_id' => $class->id,
                    'payment_tranche_id' => $tranche->id,
                    'amount' => $config['amount'],
                    'is_required' => $config['required']
                ]);
            }
        }
        
        $total = ClassPaymentAmount::count();
        $this->command->info("✅ Configuration terminée! {$total} configurations créées");
    }
    
    private function getAmountsForLevel($levelName)
    {
        $baseAmounts = [
            'Niveau 1' => ['inscription' => 20000, 'tranche' => 45000],
            'Niveau 2' => ['inscription' => 20000, 'tranche' => 45000],
            'CP' => ['inscription' => 20000, 'tranche' => 45000],
            'CE1' => ['inscription' => 20000, 'tranche' => 45000],
            'CE2' => ['inscription' => 20000, 'tranche' => 45000],
            'CM1' => ['inscription' => 22000, 'tranche' => 50000],
            'CM2' => ['inscription' => 22000, 'tranche' => 50000],
        ];
        
        return $baseAmounts[$levelName] ?? ['inscription' => 20000, 'tranche' => 45000];
    }
    
    private function getConfigForTranche($trancheName, $amounts)
    {
        switch ($trancheName) {
            case 'Inscription':
                return ['amount' => $amounts['inscription'], 'required' => true];
            case '1ère Tranche':
            case '2ème Tranche':
            case '3ème Tranche':
                return ['amount' => $amounts['tranche'], 'required' => true];
            case 'Examen':
            case 'Frais d\'examen':
                return ['amount' => 15000, 'required' => false];
            case 'RAME':
                return ['amount' => 5000, 'required' => false];
            default:
                return ['amount' => 25000, 'required' => true];
        }
    }
}