<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\School;
use App\Models\SchoolEquipment;

class SchoolEquipmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🧥 Creating school-specific equipment...');

        $schools = School::all();

        foreach ($schools as $school) {
            $this->createEquipmentForSchool($school);
        }
    }

    private function createEquipmentForSchool(School $school)
    {
        $equipments = $this->getEquipmentForSchool($school->code);

        foreach ($equipments as $equipment) {
            SchoolEquipment::updateOrCreate(
                [
                    'school_id' => $school->id,
                    'item_name' => $equipment['item_name'],
                    'category' => $equipment['category']
                ],
                array_merge($equipment, ['school_id' => $school->id])
            );
        }
    }

    private function getEquipmentForSchool($schoolCode)
    {
        switch ($schoolCode) {
            case 'INSSAS':
                return [
                    // Vêtements obligatoires
                    [
                        'equipment_type' => 'clothing',
                        'item_name' => 'Blouse personnalisée INSSAS',
                        'price' => 7500,
                        'category' => 'blouse',
                        'description' => 'Blouse blanche personnalisée avec logo INSSAS, obligatoire pour toutes les formations de santé',
                        'is_mandatory' => true,
                        'applicable_levels' => ['BTS', 'LICENCE_ACA', 'LICENCE_PRO', 'MASTER', 'HND', 'PROFESSIONAL_LICENSE', 'BACHELOR', 'PROFESSIONAL_MASTER'],
                        'applicable_specialties' => null, // Toutes les spécialités
                        'is_active' => true,
                        'order' => 1
                    ],
                    // Équipements médicaux
                    [
                        'equipment_type' => 'medical',
                        'item_name' => 'Stéthoscope professionnel',
                        'price' => 25000,
                        'category' => 'stethoscope',
                        'description' => 'Stéthoscope de qualité professionnelle pour les formations médicales',
                        'is_mandatory' => true,
                        'applicable_levels' => ['LICENCE_PRO', 'MASTER', 'PROFESSIONAL_LICENSE', 'BACHELOR', 'PROFESSIONAL_MASTER'],
                        'applicable_specialties' => ['Médecine', 'Infirmerie', 'Santé publique'],
                        'is_active' => true,
                        'order' => 2
                    ],
                    [
                        'equipment_type' => 'medical',
                        'item_name' => 'Trousse premiers secours',
                        'price' => 15000,
                        'category' => 'first_aid_kit',
                        'description' => 'Trousse complète de premiers secours pour les formations médicales',
                        'is_mandatory' => false,
                        'applicable_levels' => ['BTS', 'LICENCE_ACA', 'LICENCE_PRO', 'MASTER'],
                        'applicable_specialties' => null,
                        'is_active' => true,
                        'order' => 3
                    ],
                    [
                        'equipment_type' => 'medical',
                        'item_name' => 'Gants jetables (boîte de 100)',
                        'price' => 5000,
                        'category' => 'disposable_gloves',
                        'description' => 'Gants en latex de qualité médicale',
                        'is_mandatory' => true,
                        'applicable_levels' => ['BTS', 'LICENCE_ACA', 'LICENCE_PRO', 'MASTER', 'HND', 'PROFESSIONAL_LICENSE'],
                        'applicable_specialties' => null,
                        'is_active' => true,
                        'order' => 4
                    ]
                ];

            case 'ESGIT':
                return [
                    [
                        'equipment_type' => 'clothing',
                        'item_name' => 'Polo ESGIT',
                        'price' => 6500,
                        'category' => 'polo',
                        'description' => 'Polo aux couleurs de l\'ESGIT avec logo brodé',
                        'is_mandatory' => true,
                        'applicable_levels' => ['BTS', 'LICENCE_PRO', 'INGENIERIE'],
                        'applicable_specialties' => null,
                        'is_active' => true,
                        'order' => 1
                    ],
                    [
                        'equipment_type' => 'technical',
                        'item_name' => 'Clé USB 32GB',
                        'price' => 8000,
                        'category' => 'usb_drive',
                        'description' => 'Clé USB de haute capacité pour projets informatiques',
                        'is_mandatory' => true,
                        'applicable_levels' => ['BTS', 'LICENCE_PRO', 'INGENIERIE'],
                        'applicable_specialties' => null,
                        'is_active' => true,
                        'order' => 2
                    ],
                    [
                        'equipment_type' => 'technical',
                        'item_name' => 'Disque dur externe 500GB',
                        'price' => 35000,
                        'category' => 'external_hdd',
                        'description' => 'Disque dur externe pour sauvegarde de projets',
                        'is_mandatory' => false,
                        'applicable_levels' => ['LICENCE_PRO', 'INGENIERIE'],
                        'applicable_specialties' => ['Génie Logiciel', 'Réseaux et Télécommunications'],
                        'is_active' => true,
                        'order' => 3
                    ]
                ];

            case 'ESJEC':
                return [
                    [
                        'equipment_type' => 'clothing',
                        'item_name' => 'Polo ESJEC',
                        'price' => 6500,
                        'category' => 'polo',
                        'description' => 'Polo aux couleurs de l\'ESJEC avec logo brodé',
                        'is_mandatory' => true,
                        'applicable_levels' => ['BTS', 'LICENCE_PRO', 'MASTER'],
                        'applicable_specialties' => null,
                        'is_active' => true,
                        'order' => 1
                    ],
                    [
                        'equipment_type' => 'academic',
                        'item_name' => 'Code civil camerounais',
                        'price' => 12000,
                        'category' => 'legal_code',
                        'description' => 'Code civil du Cameroun, édition récente',
                        'is_mandatory' => true,
                        'applicable_levels' => ['BTS', 'LICENCE_PRO'],
                        'applicable_specialties' => ['Droit', 'Sciences Juridiques'],
                        'is_active' => true,
                        'order' => 2
                    ],
                    [
                        'equipment_type' => 'academic',
                        'item_name' => 'Code de commerce OHADA',
                        'price' => 15000,
                        'category' => 'legal_code',
                        'description' => 'Code de commerce uniforme OHADA',
                        'is_mandatory' => true,
                        'applicable_levels' => ['BTS', 'LICENCE_PRO'],
                        'applicable_specialties' => ['Commerce', 'Gestion'],
                        'is_active' => true,
                        'order' => 3
                    ],
                    [
                        'equipment_type' => 'academic',
                        'item_name' => 'Calculatrice financière',
                        'price' => 25000,
                        'category' => 'calculator',
                        'description' => 'Calculatrice spécialisée pour les calculs financiers',
                        'is_mandatory' => false,
                        'applicable_levels' => ['LICENCE_PRO', 'MASTER'],
                        'applicable_specialties' => ['Finance', 'Comptabilité'],
                        'is_active' => true,
                        'order' => 4
                    ]
                ];

            case 'ESSIT':
                return [
                    [
                        'equipment_type' => 'clothing',
                        'item_name' => 'Polo ESSIT',
                        'price' => 6500,
                        'category' => 'polo',
                        'description' => 'Polo aux couleurs de l\'ESSIT avec logo brodé',
                        'is_mandatory' => true,
                        'applicable_levels' => ['BTS', 'LICENCE_PRO', 'INGENIERIE'],
                        'applicable_specialties' => null,
                        'is_active' => true,
                        'order' => 1
                    ],
                    [
                        'equipment_type' => 'security',
                        'item_name' => 'Casque de sécurité BTP',
                        'price' => 8000,
                        'category' => 'safety_helmet',
                        'description' => 'Casque de sécurité conforme aux normes BTP',
                        'is_mandatory' => true,
                        'applicable_levels' => ['BTS', 'LICENCE_PRO', 'INGENIERIE'],
                        'applicable_specialties' => ['Génie Civil', 'BTP', 'Architecture'],
                        'is_active' => true,
                        'order' => 2
                    ],
                    [
                        'equipment_type' => 'security',
                        'item_name' => 'Chaussures de sécurité',
                        'price' => 15000,
                        'category' => 'safety_shoes',
                        'description' => 'Chaussures de sécurité avec coque renforcée',
                        'is_mandatory' => true,
                        'applicable_levels' => ['BTS', 'LICENCE_PRO', 'INGENIERIE'],
                        'applicable_specialties' => ['Génie Civil', 'BTP', 'Maintenance industrielle'],
                        'is_active' => true,
                        'order' => 3
                    ],
                    [
                        'equipment_type' => 'security',
                        'item_name' => 'Gilet de sécurité',
                        'price' => 5000,
                        'category' => 'safety_vest',
                        'description' => 'Gilet haute visibilité pour chantiers',
                        'is_mandatory' => true,
                        'applicable_levels' => ['BTS', 'LICENCE_PRO', 'INGENIERIE'],
                        'applicable_specialties' => ['Génie Civil', 'BTP'],
                        'is_active' => true,
                        'order' => 4
                    ],
                    [
                        'equipment_type' => 'technical',
                        'item_name' => 'Kit de dessin technique',
                        'price' => 12000,
                        'category' => 'drawing_kit',
                        'description' => 'Compas, règles, équerres pour dessin technique',
                        'is_mandatory' => true,
                        'applicable_levels' => ['BTS', 'LICENCE_PRO'],
                        'applicable_specialties' => ['Architecture', 'Génie Civil'],
                        'is_active' => true,
                        'order' => 5
                    ]
                ];

            case 'ISTPM':
                return [
                    // Blouses pour filières santé uniquement
                    [
                        'equipment_type' => 'clothing',
                        'item_name' => 'Blouse personnalisée ISTPM',
                        'price' => 7500,
                        'category' => 'blouse',
                        'description' => 'Blouse pour les filières de santé de l\'ISTPM',
                        'is_mandatory' => true,
                        'applicable_levels' => ['CQP', 'DQP'],
                        'applicable_specialties' => ['Aide-soignant', 'Auxiliaire médical'],
                        'is_active' => true,
                        'order' => 1
                    ],
                    // Polos pour autres filières
                    [
                        'equipment_type' => 'clothing',
                        'item_name' => 'Polo ISTPM',
                        'price' => 6500,
                        'category' => 'polo',
                        'description' => 'Polo pour les filières non médicales de l\'ISTPM',
                        'is_mandatory' => true,
                        'applicable_levels' => ['CQP', 'DQP'],
                        'applicable_specialties' => ['Gestion', 'Commerce', 'Bureautique'],
                        'is_active' => true,
                        'order' => 2
                    ]
                ];

            case 'ISTMS':
                return [
                    [
                        'equipment_type' => 'clothing',
                        'item_name' => 'Blouse personnalisée ISTMS',
                        'price' => 7500,
                        'category' => 'blouse',
                        'description' => 'Blouse spécialisée pour formations médico-sanitaires',
                        'is_mandatory' => true,
                        'applicable_levels' => ['TMS'],
                        'applicable_specialties' => null,
                        'is_active' => true,
                        'order' => 1
                    ],
                    [
                        'equipment_type' => 'medical',
                        'item_name' => 'Kit de base médical',
                        'price' => 20000,
                        'category' => 'medical_kit',
                        'description' => 'Kit médical de base avec thermomètre, tensiomètre',
                        'is_mandatory' => true,
                        'applicable_levels' => ['TMS'],
                        'applicable_specialties' => null,
                        'is_active' => true,
                        'order' => 2
                    ]
                ];

            default:
                return [];
        }
    }
}