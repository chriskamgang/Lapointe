<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Level;
use App\Models\Section;

class LevelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Récupérer les sections existantes
        $sections = Section::all();

        foreach ($sections as $section) {
            switch ($section->name) {
                case 'Maternelle':
                    $levels = [
                        ['name' => 'Petite Section', 'order' => 1],
                        ['name' => 'Moyenne Section', 'order' => 2],
                        ['name' => 'Grande Section', 'order' => 3]
                    ];
                    break;
                case 'Primaire':
                    $levels = [
                        ['name' => 'CP', 'order' => 1],
                        ['name' => 'CE1', 'order' => 2],
                        ['name' => 'CE2', 'order' => 3],
                        ['name' => 'CM1', 'order' => 4],
                        ['name' => 'CM2', 'order' => 5]
                    ];
                    break;
                case 'Secondaire':
                    $levels = [
                        ['name' => '6ème', 'order' => 1],
                        ['name' => '5ème', 'order' => 2],
                        ['name' => '4ème', 'order' => 3],
                        ['name' => '3ème', 'order' => 4],
                        ['name' => '2nde', 'order' => 5],
                        ['name' => '1ère', 'order' => 6],
                        ['name' => 'Terminale', 'order' => 7]
                    ];
                    break;
                default:
                    $levels = [
                        ['name' => 'Niveau 1', 'order' => 1],
                        ['name' => 'Niveau 2', 'order' => 2]
                    ];
            }

            foreach ($levels as $levelData) {
                Level::create([
                    'name' => $levelData['name'],
                    'section_id' => $section->id,
                    'description' => "Niveau {$levelData['name']} de la section {$section->name}",
                    'order' => $levelData['order'],
                    'is_active' => true
                ]);
            }
        }
    }
}