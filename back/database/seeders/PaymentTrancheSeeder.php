<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\PaymentTranche;

class PaymentTrancheSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tranches = [
            [
                'name' => 'Inscription',
                'description' => 'Frais d\'inscription annuelle',
                'order' => 1,
                'is_active' => true
            ],
            [
                'name' => '1ère Tranche',
                'description' => 'Première tranche de scolarité',
                'order' => 2,
                'is_active' => true
            ],
            [
                'name' => '2ème Tranche',
                'description' => 'Deuxième tranche de scolarité',
                'order' => 3,
                'is_active' => true
            ],
            [
                'name' => '3ème Tranche',
                'description' => 'Troisième tranche de scolarité',
                'order' => 4,
                'is_active' => true
            ],
            [
                'name' => 'Examen',
                'description' => 'Frais d\'examen',
                'order' => 5,
                'is_active' => true
            ]
        ];

        foreach ($tranches as $tranche) {
            PaymentTranche::create($tranche);
        }
    }
}