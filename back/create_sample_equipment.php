<?php

require_once 'vendor/autoload.php';

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\School;
use App\Models\SchoolEquipment;

echo "Création d'équipements d'exemple...\n";

// Obtenir les écoles
$schools = School::all();
echo "Écoles trouvées: " . $schools->count() . "\n";

foreach ($schools as $school) {
    echo "École: {$school->name} ({$school->code})\n";
}

// Créer des équipements pour INSSAS (école médicale)
$inssas = School::where('code', 'INSSAS')->first();
if ($inssas) {
    echo "Création d'équipements pour INSSAS...\n";
    
    $equipments = [
        [
            'school_id' => $inssas->id,
            'equipment_type' => 'clothing',
            'item_name' => 'Blouse médicale blanche',
            'price' => 15000,
            'category' => 'blouse',
            'description' => 'Blouse médicale obligatoire pour les travaux pratiques',
            'is_mandatory' => true,
            'is_active' => true,
            'order' => 1
        ],
        [
            'school_id' => $inssas->id,
            'equipment_type' => 'medical',
            'item_name' => 'Stéthoscope',
            'price' => 25000,
            'description' => 'Stéthoscope pour examens cliniques',
            'is_mandatory' => true,
            'is_active' => true,
            'order' => 1
        ],
        [
            'school_id' => $inssas->id,
            'equipment_type' => 'medical',
            'item_name' => 'Tensiomètre',
            'price' => 35000,
            'description' => 'Tensiomètre manuel ou électronique',
            'is_mandatory' => false,
            'is_active' => true,
            'order' => 2
        ],
        [
            'school_id' => $inssas->id,
            'equipment_type' => 'academic',
            'item_name' => 'Cahiers médicaux',
            'price' => 5000,
            'description' => 'Lot de cahiers spécialisés',
            'is_mandatory' => true,
            'is_active' => true,
            'order' => 1
        ]
    ];
    
    foreach ($equipments as $equipment) {
        SchoolEquipment::updateOrCreate(
            [
                'school_id' => $equipment['school_id'],
                'item_name' => $equipment['item_name']
            ],
            $equipment
        );
        echo "- Créé: {$equipment['item_name']}\n";
    }
}

// Créer des équipements pour ESGIT (école informatique)
$esgit = School::where('code', 'ESGIT')->first();
if ($esgit) {
    echo "Création d'équipements pour ESGIT...\n";
    
    $equipments = [
        [
            'school_id' => $esgit->id,
            'equipment_type' => 'clothing',
            'item_name' => 'Polo ESGIT',
            'price' => 8000,
            'category' => 'polo',
            'description' => 'Polo officiel avec logo ESGIT',
            'is_mandatory' => true,
            'is_active' => true,
            'order' => 1
        ],
        [
            'school_id' => $esgit->id,
            'equipment_type' => 'technical',
            'item_name' => 'Ordinateur portable',
            'price' => 250000,
            'description' => 'Ordinateur portable pour développement',
            'is_mandatory' => true,
            'is_active' => true,
            'order' => 1
        ],
        [
            'school_id' => $esgit->id,
            'equipment_type' => 'technical',
            'item_name' => 'Clé USB 32GB',
            'price' => 8000,
            'description' => 'Clé USB pour stockage des projets',
            'is_mandatory' => true,
            'is_active' => true,
            'order' => 2
        ]
    ];
    
    foreach ($equipments as $equipment) {
        SchoolEquipment::updateOrCreate(
            [
                'school_id' => $equipment['school_id'],
                'item_name' => $equipment['item_name']
            ],
            $equipment
        );
        echo "- Créé: {$equipment['item_name']}\n";
    }
}

echo "\nTotal équipements après création: " . SchoolEquipment::count() . "\n";
echo "Équipements par école:\n";

foreach (School::all() as $school) {
    $count = SchoolEquipment::where('school_id', $school->id)->count();
    echo "- {$school->code}: {$count} équipements\n";
}