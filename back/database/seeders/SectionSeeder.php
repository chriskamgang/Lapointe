<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Section;

class SectionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sections = [
            [
                'name' => 'Maternelle',
                'description' => 'Section pour les enfants de 3 à 6 ans',
                'is_active' => true,
                'order' => 1,
            ],
            [
                'name' => 'Primaire',
                'description' => 'Section pour les élèves du CP au CM2',
                'is_active' => true,
                'order' => 2,
            ],
            [
                'name' => 'Secondaire 1er Cycle',
                'description' => 'Section pour les élèves de la 6ème à la 3ème',
                'is_active' => true,
                'order' => 3,
            ],
            [
                'name' => 'Secondaire 2nd Cycle',
                'description' => 'Section pour les élèves de la 2nde à la Terminale',
                'is_active' => true,
                'order' => 4,
            ],
        ];

        foreach ($sections as $section) {
            Section::create($section);
        }

        echo "✅ Sections créées avec succès !\n";
        echo "==========================================\n";
        foreach ($sections as $section) {
            echo "• {$section['name']}\n";
        }
        echo "==========================================\n";
    }
}