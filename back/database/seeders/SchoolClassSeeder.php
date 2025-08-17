<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\SchoolClass;
use App\Models\ClassSeries;
use App\Models\ClassPaymentAmount;
use App\Models\Level;
use App\Models\PaymentTranche;

class SchoolClassSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $levels = Level::all();
        $tranches = PaymentTranche::all();

        foreach ($levels as $level) {
            // Créer une classe de base pour chaque niveau
            $schoolClass = SchoolClass::create([
                'name' => $level->name,
                'level_id' => $level->id,
                'description' => "Classe de {$level->name}",
                'is_active' => true
            ]);

            // Créer des séries pour certaines classes
            $series = $this->getSeriesForLevel($level->name);
            foreach ($series as $seriesName) {
                ClassSeries::create([
                    'class_id' => $schoolClass->id,
                    'name' => $seriesName,
                    'capacity' => 40,
                    'is_active' => true
                ]);
            }

            // Configurer les montants de paiement
            $this->configurePaymentsForClass($schoolClass, $tranches, $level);
        }
    }

    private function getSeriesForLevel($levelName)
    {
        switch ($levelName) {
            case 'Petite Section':
            case 'Moyenne Section':
            case 'Grande Section':
            case 'CP':
            case 'CE1':
            case 'CE2':
                return ['A'];
            case 'CM1':
            case 'CM2':
            case '6ème':
            case '5ème':
                return ['A', 'B'];
            case '4ème':
            case '3ème':
            case '2nde':
                return ['A', 'B', 'C'];
            case '1ère':
                return ['A', 'C', 'D']; // Séries littéraires et scientifiques
            case 'Terminale':
                return ['A', 'C', 'D'];
            default:
                return ['A'];
        }
    }

    private function configurePaymentsForClass($schoolClass, $tranches, $level)
    {
        foreach ($tranches as $tranche) {
            // Définir les montants selon le niveau (montant unique)
            $amounts = $this->getAmountsForLevel($level->name, $tranche->name);
            
            ClassPaymentAmount::create([
                'class_id' => $schoolClass->id,
                'payment_tranche_id' => $tranche->id,
                'amount' => $amounts['amount'],
                'is_required' => $amounts['required']
            ]);
        }
    }

    private function getAmountsForLevel($levelName, $trancheName)
    {
        // Montants de base selon le niveau
        $baseAmounts = [
            'Petite Section' => ['inscription' => 15000, 'tranche' => 35000],
            'Moyenne Section' => ['inscription' => 15000, 'tranche' => 35000],
            'Grande Section' => ['inscription' => 18000, 'tranche' => 40000],
            'CP' => ['inscription' => 20000, 'tranche' => 45000],
            'CE1' => ['inscription' => 20000, 'tranche' => 45000],
            'CE2' => ['inscription' => 20000, 'tranche' => 45000],
            'CM1' => ['inscription' => 22000, 'tranche' => 50000],
            'CM2' => ['inscription' => 22000, 'tranche' => 50000],
            '6ème' => ['inscription' => 25000, 'tranche' => 55000],
            '5ème' => ['inscription' => 25000, 'tranche' => 55000],
            '4ème' => ['inscription' => 28000, 'tranche' => 60000],
            '3ème' => ['inscription' => 28000, 'tranche' => 60000],
            '2nde' => ['inscription' => 30000, 'tranche' => 65000],
            '1ère' => ['inscription' => 32000, 'tranche' => 70000],
            'Terminale' => ['inscription' => 35000, 'tranche' => 75000],
        ];

        $levelAmounts = $baseAmounts[$levelName] ?? ['inscription' => 20000, 'tranche' => 45000];

        switch ($trancheName) {
            case 'Inscription':
                return [
                    'amount' => $levelAmounts['inscription'],
                    'required' => true
                ];
            case '1ère Tranche':
            case '2ème Tranche':
            case '3ème Tranche':
                return [
                    'amount' => $levelAmounts['tranche'],
                    'required' => true
                ];
            case 'Examen':
                return [
                    'amount' => 15000,
                    'required' => false // Optionnel
                ];
            default:
                return [
                    'amount' => 25000,
                    'required' => true
                ];
        }
    }
}