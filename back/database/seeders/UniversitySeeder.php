<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\School;
use App\Models\Level;
use App\Models\SchoolClass;
use App\Models\ClassSeries;
use App\Models\PaymentTranche;
use App\Models\ClassPaymentAmount;
use App\Models\UniversityScholarship;
use App\Models\UniversityFee;
use App\Models\LaptopDistribution;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\Student;
use App\Models\SchoolYear;
use App\Models\Attendance;
use App\Models\TeacherAttendance;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class UniversitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🚀 Starting university seeder...');

        // 1. Create base users
        $this->createUsers();
        
        // 2. Create schools
        $this->createSchools();
        
        // 3. Create university levels
        $this->createUniversityLevels();
        
        // 4. Create payment tranches
        $this->createPaymentTranches();
        
        // 5. Create specialities and class series
        $this->createSpecialities();
        
        // 6. Create university fees
        $this->createUniversityFees();
        
        // 7. Create scholarships
        $this->createScholarships();
        
        // 8. Create subjects
        $this->createSubjects();
        
        // 9. Create school year
        $this->createSchoolYear();
        
        // 10. Create teachers
        $this->createTeachers();
        
        // 11. Create students
        $this->createStudents();
        
        // 12. Create laptop distributions
        $this->createLaptopDistributions();
        
        // 13. Create attendances
        $this->createAttendances();

        $this->command->info('✅ University seeder completed!');
        $this->displaySummary();
    }

    private function createUsers()
    {
        $this->command->info('👥 Creating users...');
        
        $users = [
            [
                'username' => 'admin',
                'name' => 'Administrateur Principal IUP',
                'email' => 'admin@iu-pointe.fr',
                'role' => 'admin',
                'password' => Hash::make('password123')
            ],
            [
                'username' => 'surveillant',
                'name' => 'Surveillant Général IUP',
                'email' => 'surveillant@iu-pointe.fr',
                'role' => 'surveillant_general',
                'password' => Hash::make('password123')
            ],
            [
                'username' => 'comptable',
                'name' => 'Comptable IUP',
                'email' => 'comptable@iu-pointe.fr',
                'role' => 'accountant',
                'password' => Hash::make('password123')
            ],
            [
                'username' => 'prof.martin',
                'name' => 'Dr. Martin Dupont',
                'email' => 'martin@iu-pointe.fr',
                'role' => 'teacher',
                'password' => Hash::make('password123')
            ],
            [
                'username' => 'prof.kamga',
                'name' => 'Dr. Pierre Kamga',
                'email' => 'kamga@iu-pointe.fr',
                'role' => 'teacher',
                'password' => Hash::make('password123')
            ]
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['username' => $userData['username']],
                $userData
            );
        }
    }

    private function createSchools()
    {
        $this->command->info('🏫 Creating schools...');
        
        $schools = [
            [
                'name' => 'INSSAS',
                'code' => 'INSSAS',
                'description' => 'Institut Supérieur Des Sciences Appliquées À La Santé',
                'director_name' => 'Dr. Marie Nkomo',
                'director_email' => 'director.inssas@iu-pointe.fr',
                'director_phone' => '+237650123456',
                'order' => 1,
                'is_active' => true
            ],
            [
                'name' => 'ESGIT',
                'code' => 'ESGIT',
                'description' => 'École Supérieure de Génie Informatique et de Télécommunication',
                'director_name' => 'Dr. Jean Fouda',
                'director_email' => 'director.esgit@iu-pointe.fr',
                'director_phone' => '+237650234567',
                'order' => 2,
                'is_active' => true
            ],
            [
                'name' => 'ESJEC',
                'code' => 'ESJEC',
                'description' => 'École Supérieure des Sciences Juridiques et Études Commerciales',
                'director_name' => 'Dr. Grace Etindi',
                'director_email' => 'director.esjec@iu-pointe.fr',
                'director_phone' => '+237650345678',
                'order' => 3,
                'is_active' => true
            ],
            [
                'name' => 'ESSIT',
                'code' => 'ESSIT',
                'description' => 'École Supérieure des Sciences Industrielles et des Technologies',
                'director_name' => 'Ing. Paul Mbeki',
                'director_email' => 'director.essit@iu-pointe.fr',
                'director_phone' => '+237650456789',
                'order' => 4,
                'is_active' => true
            ],
            [
                'name' => 'ISTMS',
                'code' => 'ISTMS',
                'description' => 'Institut des Sciences, Techniques Médico-Sanitaires',
                'director_name' => 'Dr. Fatima Hassan',
                'director_email' => 'director.istms@iu-pointe.fr',
                'director_phone' => '+237650567890',
                'order' => 5,
                'is_active' => true
            ],
            [
                'name' => 'ISTPM',
                'code' => 'ISTPM',
                'description' => 'Institut des Sciences, Techniques Professionnelles et Managériales',
                'director_name' => 'Dr. Michel Tchoumi',
                'director_email' => 'director.istpm@iu-pointe.fr',
                'director_phone' => '+237650678901',
                'order' => 6,
                'is_active' => true
            ]
        ];

        foreach ($schools as $schoolData) {
            School::updateOrCreate(
                ['name' => $schoolData['name']],
                $schoolData
            );
        }
    }

    private function createUniversityLevels()
    {
        $this->command->info('📖 Creating university levels...');
        
        $schools = School::all();
        
        foreach ($schools as $school) {
            $levels = $this->getLevelsForSchool($school->code);
            
            foreach ($levels as $levelData) {
                Level::updateOrCreate(
                    [
                        'name' => $levelData['name'],
                        'school_id' => $school->id,
                        'level_type' => $levelData['level_type']
                    ],
                    array_merge($levelData, [
                        'description' => "Level {$levelData['name']} of {$school->name}",
                        'is_active' => true
                    ])
                );
            }
        }
    }

    private function getLevelsForSchool($schoolCode)
    {
        $commonLevels = [
            ['name' => 'BTS 1', 'level_code' => 'BTS1', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 1],
            ['name' => 'BTS 2', 'level_code' => 'BTS2', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 2],
            ['name' => 'LICENCE PRO', 'level_code' => 'LP', 'level_type' => 'LICENCE_PRO', 'duration_years' => 1, 'order' => 3],
            ['name' => 'MASTER 1', 'level_code' => 'M1', 'level_type' => 'MASTER', 'duration_years' => 2, 'order' => 4],
            ['name' => 'MASTER 2', 'level_code' => 'M2', 'level_type' => 'MASTER', 'duration_years' => 2, 'order' => 5]
        ];

        switch ($schoolCode) {
            case 'INSSAS':
                return array_merge($commonLevels, [
                    ['name' => 'HND 1', 'level_code' => 'HND1', 'level_type' => 'HND', 'duration_years' => 3, 'order' => 6],
                    ['name' => 'HND 2', 'level_code' => 'HND2', 'level_type' => 'HND', 'duration_years' => 3, 'order' => 7],
                    ['name' => 'HND 3', 'level_code' => 'HND3', 'level_type' => 'HND', 'duration_years' => 3, 'order' => 8],
                    ['name' => 'BACHELOR', 'level_code' => 'BCH', 'level_type' => 'BACHELOR', 'duration_years' => 1, 'order' => 9]
                ]);
            
            case 'ESGIT':
                return array_merge($commonLevels, [
                    ['name' => 'INGENIERIE 1', 'level_code' => 'ING1', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 6],
                    ['name' => 'INGENIERIE 2', 'level_code' => 'ING2', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 7],
                    ['name' => 'INGENIERIE 3', 'level_code' => 'ING3', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 8],
                    ['name' => 'INGENIERIE 4', 'level_code' => 'ING4', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 9],
                    ['name' => 'INGENIERIE 5', 'level_code' => 'ING5', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 10]
                ]);
            
            case 'ISTPM':
                return [
                    ['name' => 'CQP', 'level_code' => 'CQP', 'level_type' => 'CQP', 'duration_years' => 1, 'order' => 1],
                    ['name' => 'DQP', 'level_code' => 'DQP', 'level_type' => 'DQP', 'duration_years' => 1, 'order' => 2]
                ];
            
            case 'ISTMS':
                return [
                    ['name' => 'TMS 1', 'level_code' => 'TMS1', 'level_type' => 'TMS', 'duration_years' => 3, 'order' => 1],
                    ['name' => 'TMS 2', 'level_code' => 'TMS2', 'level_type' => 'TMS', 'duration_years' => 3, 'order' => 2],
                    ['name' => 'TMS 3', 'level_code' => 'TMS3', 'level_type' => 'TMS', 'duration_years' => 3, 'order' => 3]
                ];
            
            default:
                return $commonLevels;
        }
    }

    private function createPaymentTranches()
    {
        $this->command->info('💰 Creating payment tranches...');
        
        $tranches = [
            ['name' => 'Inscription', 'description' => 'Frais d\'inscription annuelle', 'order' => 1],
            ['name' => '1ère Tranche', 'description' => 'Première tranche de scolarité', 'order' => 2],
            ['name' => '2ème Tranche', 'description' => 'Deuxième tranche de scolarité', 'order' => 3],
            ['name' => '3ème Tranche', 'description' => 'Troisième tranche de scolarité', 'order' => 4]
        ];

        foreach ($tranches as $tranche) {
            PaymentTranche::updateOrCreate(
                ['name' => $tranche['name']],
                array_merge($tranche, ['is_active' => true])
            );
        }
    }

    private function createSpecialities()
    {
        $this->command->info('🎓 Creating specialities and class series...');
        
        $schools = School::all();
        $levels = Level::all();
        
        foreach ($schools as $school) {
            $specialities = $this->getSpecialitiesForSchool($school->code);
            
            foreach ($specialities as $specialityData) {
                $level = $levels->where('school_id', $school->id)
                    ->where('level_type', $specialityData['level_type'])
                    ->first();
                
                if ($level) {
                    $schoolClass = SchoolClass::updateOrCreate(
                        [
                            'name' => $specialityData['name'],
                            'level_id' => $level->id
                        ],
                        [
                            'speciality_code' => $specialityData['code'],
                            'description' => $specialityData['description'],
                            'max_capacity' => $specialityData['capacity'],
                            'career_prospects' => json_encode($specialityData['career_prospects']),
                            'admission_requirements' => json_encode($specialityData['admission_requirements']),
                            'is_active' => true
                        ]
                    );

                    for ($i = 1; $i <= 2; $i++) {
                        ClassSeries::updateOrCreate(
                            [
                                'class_id' => $schoolClass->id,
                                'name' => "Groupe {$i}"
                            ],
                            [
                                'code' => $specialityData['code'] . $i,
                                'capacity' => $specialityData['capacity'] / 2,
                                'room_type' => $i == 1 ? 'Salle de cours magistral' : 'Salle de travaux pratiques',
                                'equipment' => json_encode($this->getRoomEquipment($school->code, $i)),
                                'is_active' => true
                            ]
                        );
                    }
                }
            }
        }
    }

    private function getSpecialitiesForSchool($schoolCode)
    {
        switch ($schoolCode) {
            case 'INSSAS':
                return [
                    [
                        'name' => 'Sciences Infirmières',
                        'code' => 'SINF',
                        'level_type' => 'BTS',
                        'description' => 'Formation en sciences infirmières',
                        'capacity' => 40,
                        'career_prospects' => ['Infirmier', 'Chef de service', 'Formateur en soins'],
                        'admission_requirements' => ['Baccalauréat', 'Certificat médical', 'Entretien']
                    ],
                    [
                        'name' => 'Analyses Médicales',
                        'code' => 'AMED',
                        'level_type' => 'BTS',
                        'description' => 'Formation en techniques de laboratoire',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien de laboratoire', 'Responsable qualité'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Certificat médical']
                    ],
                    [
                        'name' => 'Kinésithérapie',
                        'code' => 'KINE',
                        'level_type' => 'BTS',
                        'description' => 'Formation en kinésithérapie et rééducation',
                        'capacity' => 30,
                        'career_prospects' => ['Kinésithérapeute', 'Rééducateur'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Certificat médical', 'Test physique']
                    ]
                ];
            
            case 'ESGIT':
                return [
                    [
                        'name' => 'Génie Logiciel',
                        'code' => 'GLOG',
                        'level_type' => 'BTS',
                        'description' => 'Développement d\'applications et génie logiciel',
                        'capacity' => 45,
                        'career_prospects' => ['Développeur', 'Chef de projet', 'Architecte logiciel'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en mathématiques']
                    ],
                    [
                        'name' => 'Réseaux et Télécommunications',
                        'code' => 'RTEL',
                        'level_type' => 'BTS',
                        'description' => 'Administration réseaux et télécommunications',
                        'capacity' => 40,
                        'career_prospects' => ['Administrateur réseau', 'Technicien télécoms'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Bases en électronique']
                    ],
                    [
                        'name' => 'Intelligence Artificielle',
                        'code' => 'IA',
                        'level_type' => 'INGENIERIE',
                        'description' => 'IA et Machine Learning',
                        'capacity' => 35,
                        'career_prospects' => ['Data Scientist', 'Ingénieur IA'],
                        'admission_requirements' => ['BTS Informatique', 'Excellent niveau math']
                    ]
                ];
            
            case 'ESJEC':
                return [
                    [
                        'name' => 'Gestion des Entreprises',
                        'code' => 'GEST',
                        'level_type' => 'BTS',
                        'description' => 'Management et gestion d\'entreprise',
                        'capacity' => 50,
                        'career_prospects' => ['Manager', 'Consultant', 'Entrepreneur'],
                        'admission_requirements' => ['Baccalauréat', 'Entretien de motivation']
                    ],
                    [
                        'name' => 'Droit des Affaires',
                        'code' => 'DROI',
                        'level_type' => 'BTS',
                        'description' => 'Droit commercial et des affaires',
                        'capacity' => 40,
                        'career_prospects' => ['Juriste d\'entreprise', 'Conseiller juridique'],
                        'admission_requirements' => ['Baccalauréat', 'Culture générale']
                    ]
                ];
            
            case 'ESSIT':
                return [
                    [
                        'name' => 'Génie Mécanique',
                        'code' => 'GMEC',
                        'level_type' => 'BTS',
                        'description' => 'Mécanique industrielle et productique',
                        'capacity' => 35,
                        'career_prospects' => ['Ingénieur mécanique', 'Technicien industriel'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Bases en physique']
                    ],
                    [
                        'name' => 'Génie Civil',
                        'code' => 'GCIV',
                        'level_type' => 'BTS',
                        'description' => 'Construction et travaux publics',
                        'capacity' => 40,
                        'career_prospects' => ['Ingénieur BTP', 'Chef de chantier'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Bases en mathématiques']
                    ]
                ];
            
            case 'ISTPM':
                return [
                    [
                        'name' => 'Secrétariat Bureautique',
                        'code' => 'SECR',
                        'level_type' => 'CQP',
                        'description' => 'Formation en secrétariat et bureautique',
                        'capacity' => 30,
                        'career_prospects' => ['Secrétaire', 'Assistant administratif'],
                        'admission_requirements' => ['Niveau BEPC', 'Entretien']
                    ]
                ];
            
            case 'ISTMS':
                return [
                    [
                        'name' => 'Techniques Médico-Sanitaires',
                        'code' => 'TMS',
                        'level_type' => 'TMS',
                        'description' => 'Formation en techniques médico-sanitaires',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien médical', 'Assistant de santé'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Certificat médical']
                    ]
                ];
            
            default:
                return [];
        }
    }

    private function getRoomEquipment($schoolCode, $groupNumber)
    {
        switch ($schoolCode) {
            case 'INSSAS':
                return $groupNumber == 1 
                    ? ['projecteur', 'tableau blanc', 'lits médicaux'] 
                    : ['équipements de laboratoire', 'microscopes', 'tableau blanc'];
            case 'ESGIT':
                return $groupNumber == 1 
                    ? ['ordinateurs', 'projecteur', 'tableau interactif'] 
                    : ['serveurs', 'routeurs', 'ordinateurs'];
            case 'ESJEC':
                return ['projecteur', 'tableau blanc', 'bibliothèque juridique'];
            case 'ESSIT':
                return $groupNumber == 1 
                    ? ['projecteur', 'tableau blanc', 'outils de mesure'] 
                    : ['machines-outils', 'bancs d\'essai'];
            case 'ISTMS':
                return ['équipements médicaux', 'tableau blanc', 'mannequins de simulation'];
            case 'ISTPM':
                return ['ordinateurs', 'tableau blanc', 'imprimantes'];
            default:
                return ['tableau blanc', 'projecteur'];
        }
    }

    private function createUniversityFees()
    {
        $this->command->info('💸 Creating university fees...');
        
        $schools = School::all();
        $tranches = PaymentTranche::all();
        
        foreach ($schools as $school) {
            $fees = $this->getFeesForSchool($school->code);
            
            foreach ($fees as $feeData) {
                $universityFee = UniversityFee::updateOrCreate(
                    [
                        'school_id' => $school->id,
                        'level_type' => $feeData['level_type'],
                        'speciality' => $feeData['speciality']
                    ],
                    array_merge($feeData, ['is_active' => true])
                );

                $level = Level::where('school_id', $school->id)
                    ->where('level_type', $feeData['level_type'])
                    ->first();
                
                if ($level) {
                    $schoolClass = SchoolClass::where('level_id', $level->id)
                        ->where('speciality_code', $feeData['speciality'])
                        ->first();
                    
                    if ($schoolClass) {
                        foreach ($tranches as $tranche) {
                            $amount = $this->getAmountForTranche($tranche->name, $feeData);
                            ClassPaymentAmount::updateOrCreate(
                                [
                                    'class_id' => $schoolClass->id,
                                    'payment_tranche_id' => $tranche->id
                                ],
                                [
                                    'amount' => $amount
                                ]
                            );
                        }
                    }
                }
            }
        }
    }

    private function getFeesForSchool($schoolCode)
    {
        switch ($schoolCode) {
            case 'INSSAS':
                return [
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'SINF',
                        'inscription_fee' => 50000,
                        'first_installment' => 150000,
                        'second_installment' => 100000,
                        'third_installment' => 100000,
                        'total_annual_fee' => 400000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Wifi, Accès laboratoires'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'AMED',
                        'inscription_fee' => 50000,
                        'first_installment' => 150000,
                        'second_installment' => 100000,
                        'third_installment' => 100000,
                        'total_annual_fee' => 400000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Wifi, Accès laboratoires'
                    ]
                ];
            
            case 'ESGIT':
                return [
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'GLOG',
                        'inscription_fee' => 40000,
                        'first_installment' => 150000,
                        'second_installment' => 100000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 300000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Wifi, Laboratoire informatique'
                    ],
                    [
                        'level_type' => 'INGENIERIE',
                        'speciality' => 'IA',
                        'inscription_fee' => 200000,
                        'first_installment' => 500000,
                        'second_installment' => 200000,
                        'third_installment' => 200000,
                        'total_annual_fee' => 900000,
                        'duration_years' => 1,
                        'included_benefits' => 'Certification internationale, Projets encadrés'
                    ]
                ];
            
            case 'ESJEC':
                return [
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'GEST',
                        'inscription_fee' => 40000,
                        'first_installment' => 100000,
                        'second_installment' => 100000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 250000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Wifi, Séminaires professionnels'
                    ]
                ];
            
            case 'ISTPM':
                return [
                    [
                        'level_type' => 'CQP',
                        'speciality' => 'SECR',
                        'inscription_fee' => 20000,
                        'first_installment' => 100000,
                        'second_installment' => 50000,
                        'third_installment' => 25000,
                        'total_annual_fee' => 150000,
                        'duration_years' => 1,
                        'included_benefits' => 'Bourse 25000 FCFA, Formation pratique'
                    ]
                ];
            
            default:
                return [];
        }
    }

    private function getAmountForTranche($trancheName, $feeData)
    {
        switch ($trancheName) {
            case 'Inscription':
                return $feeData['inscription_fee'];
            case '1ère Tranche':
                return $feeData['first_installment'];
            case '2ème Tranche':
                return $feeData['second_installment'];
            case '3ème Tranche':
                return $feeData['third_installment'];
            default:
                return 0;
        }
    }

    private function createScholarships()
    {
        $this->command->info('🎓 Creating university scholarships...');
        
        $schools = School::all();
        
        foreach ($schools as $school) {
            $scholarships = $this->getScholarshipsForSchool($school->code);
            
            foreach ($scholarships as $scholarshipData) {
                UniversityScholarship::updateOrCreate(
                    [
                        'school_id' => $school->id,
                        'level_type' => $scholarshipData['level_type'],
                        'formation_name' => $scholarshipData['formation_name']
                    ],
                    array_merge($scholarshipData, ['is_active' => true])
                );
            }
        }
    }

    private function getScholarshipsForSchool($schoolCode)
    {
        switch ($schoolCode) {
            case 'INSSAS':
                return [
                    [
                        'level_type' => 'BTS',
                        'formation_name' => 'BTS Santé',
                        'scholarship_amount' => 50000,
                        'laptop_included' => true,
                        'conditions' => 'Inscription régulière, assiduité aux cours'
                    ],
                    [
                        'level_type' => 'LICENCE_PRO',
                        'formation_name' => 'Licence Pro Santé',
                        'scholarship_amount' => 100000,
                        'laptop_included' => true,
                        'conditions' => 'BTS obtenu, dossier académique satisfaisant'
                    ],
                    [
                        'level_type' => 'MASTER',
                        'formation_name' => 'Master Santé',
                        'scholarship_amount' => 100000,
                        'laptop_included' => false,
                        'conditions' => 'Licence Pro validée, projet de recherche'
                    ]
                ];
            
            case 'ESGIT':
                return [
                    [
                        'level_type' => 'BTS',
                        'formation_name' => 'BTS Informatique',
                        'scholarship_amount' => 0,
                        'laptop_included' => true,
                        'conditions' => 'Inscription en BTS Informatique'
                    ],
                    [
                        'level_type' => 'LICENCE_PRO',
                        'formation_name' => 'Licence Pro - Mention Passable',
                        'scholarship_amount' => 50000,
                        'laptop_included' => false,
                        'conditions' => 'BTS avec mention Passable'
                    ],
                    [
                        'level_type' => 'LICENCE_PRO',
                        'formation_name' => 'Licence Pro - Mention Assez Bien',
                        'scholarship_amount' => 100000,
                        'laptop_included' => false,
                        'conditions' => 'BTS avec mention Assez Bien'
                    ],
                    [
                        'level_type' => 'LICENCE_PRO',
                        'formation_name' => 'Licence Pro - Mention Bien',
                        'scholarship_amount' => 120000,
                        'laptop_included' => false,
                        'conditions' => 'BTS avec mention Bien'
                    ],
                    [
                        'level_type' => 'LICENCE_PRO',
                        'formation_name' => 'Licence Pro - Mention Très Bien',
                        'scholarship_amount' => 150000,
                        'laptop_included' => true,
                        'conditions' => 'BTS avec mention Très Bien'
                    ],
                    [
                        'level_type' => 'INGENIERIE',
                        'formation_name' => 'Cycle Ingénierie',
                        'scholarship_amount' => 50000,
                        'laptop_included' => false,
                        'conditions' => 'Admission en cycle ingénierie'
                    ]
                ];
            
            case 'ISTPM':
                return [
                    [
                        'level_type' => 'CQP',
                        'formation_name' => 'CQP',
                        'scholarship_amount' => 25000,
                        'laptop_included' => false,
                        'conditions' => 'Inscription en CQP'
                    ],
                    [
                        'level_type' => 'DQP',
                        'formation_name' => 'DQP',
                        'scholarship_amount' => 25000,
                        'laptop_included' => false,
                        'conditions' => 'Inscription en DQP'
                    ]
                ];
            
            default:
                return [
                    [
                        'level_type' => 'BTS',
                        'formation_name' => 'BTS Standard',
                        'scholarship_amount' => 0,
                        'laptop_included' => true,
                        'conditions' => 'Inscription régulière'
                    ]
                ];
        }
    }

    private function createSubjects()
    {
        $this->command->info('📚 Creating subjects...');
        
        $subjects = [
            ['name' => 'Français', 'code' => 'FR', 'description' => 'Expression française et communication'],
            ['name' => 'Anglais', 'code' => 'EN', 'description' => 'Langue anglaise'],
            ['name' => 'Mathématiques', 'code' => 'MATH', 'description' => 'Mathématiques appliquées'],
            ['name' => 'Anatomie', 'code' => 'ANAT', 'description' => 'Anatomie humaine'],
            ['name' => 'Physiologie', 'code' => 'PHYS', 'description' => 'Physiologie humaine'],
            ['name' => 'Pathologie', 'code' => 'PATH', 'description' => 'Étude des maladies'],
            ['name' => 'Pharmacologie', 'code' => 'PHAR', 'description' => 'Science des médicaments'],
            ['name' => 'Programmation', 'code' => 'PROG', 'description' => 'Programmation informatique'],
            ['name' => 'Base de Données', 'code' => 'BDD', 'description' => 'Gestion des bases de données'],
            ['name' => 'Réseaux', 'code' => 'RES', 'description' => 'Administration des réseaux'],
            ['name' => 'Intelligence Artificielle', 'code' => 'IA', 'description' => 'IA et Machine Learning'],
            ['name' => 'Comptabilité', 'code' => 'COMP', 'description' => 'Comptabilité générale'],
            ['name' => 'Marketing', 'code' => 'MKT', 'description' => 'Marketing et communication'],
            ['name' => 'Droit', 'code' => 'DROIT', 'description' => 'Droit des affaires'],
            ['name' => 'Économie', 'code' => 'ECO', 'description' => 'Économie générale'],
            ['name' => 'Mécanique', 'code' => 'MEC', 'description' => 'Mécanique générale'],
            ['name' => 'Électrotechnique', 'code' => 'ELEC', 'description' => 'Électricité et électronique'],
            ['name' => 'Construction', 'code' => 'CONST', 'description' => 'Techniques de construction']
        ];

        foreach ($subjects as $subjectData) {
            Subject::updateOrCreate(
                ['code' => $subjectData['code']],
                array_merge($subjectData, ['is_active' => true])
            );
        }
    }

    private function createSchoolYear()
    {
        $this->command->info('📅 Creating school year...');
        
        SchoolYear::updateOrCreate(
            ['name' => '2025-2026'],
            [
                'start_date' => '2025-09-01',
                'end_date' => '2026-07-31',
                'is_current' => true,
                'is_active' => true
            ]
        );
    }

    private function createTeachers()
    {
        $this->command->info('👨‍🏫 Creating teachers...');
        
        $teacherUsers = User::where('role', 'teacher')->get();
        $subjects = Subject::take(5)->get();

        foreach ($teacherUsers as $user) {
            $names = explode(' ', $user->name);
            $firstName = $names[1] ?? 'Jean';
            $lastName = $names[2] ?? 'Dupont';

            Teacher::updateOrCreate(
                ['email' => $user->email],
                [
                    'user_id' => $user->id,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'phone_number' => '+237650' . rand(100000, 999999),
                    'qr_code' => 'TCH_' . strtoupper(Str::random(8)) . '_' . $user->id,
                    'expected_arrival_time' => '08:00:00',
                    'expected_departure_time' => '17:00:00',
                    'daily_work_hours' => 8.0,
                    'is_active' => true
                ]
            );
        }
    }

    private function createStudents()
    {
        $this->command->info('👨‍🎓 Creating test students...');
        
        $classSeries = ClassSeries::take(8)->get();
        $schoolYear = SchoolYear::where('is_current', true)->first();
        $scholarships = UniversityScholarship::all();

        $studentNames = [
            ['first_name' => 'Pierre', 'last_name' => 'Kamga', 'mention' => 'Bien'],
            ['first_name' => 'Marie', 'last_name' => 'Nkomo', 'mention' => 'Très Bien'],
            ['first_name' => 'Jean', 'last_name' => 'Fouda', 'mention' => 'Assez Bien'],
            ['first_name' => 'Aisha', 'last_name' => 'Bello', 'mention' => 'Passable'],
            ['first_name' => 'Paul', 'last_name' => 'Mbeki', 'mention' => 'Bien'],
            ['first_name' => 'Grace', 'last_name' => 'Etindi', 'mention' => 'Très Bien'],
            ['first_name' => 'David', 'last_name' => 'Manga', 'mention' => 'Assez Bien'],
            ['first_name' => 'Fatima', 'last_name' => 'Hassan', 'mention' => 'Bien'],
            ['first_name' => 'Michel', 'last_name' => 'Tchoumi', 'mention' => 'Passable'],
            ['first_name' => 'Esther', 'last_name' => 'Ndongo', 'mention' => 'Très Bien']
        ];

        foreach ($studentNames as $index => $studentData) {
            if ($classSeries->isNotEmpty()) {
                $series = $classSeries->random();
                
                $scholarshipAmount = 0;
                $laptopEligible = false;
                
                $schoolClass = SchoolClass::find($series->class_id);
                if ($schoolClass) {
                    $level = Level::find($schoolClass->level_id);
                    if ($level) {
                        $school = School::find($level->school_id);
                        
                        if ($school->code === 'INSSAS') {
                            $scholarshipAmount = 50000;
                            $laptopEligible = true;
                        } elseif ($school->code === 'ESGIT') {
                            $laptopEligible = true;
                            switch ($studentData['mention']) {
                                case 'Très Bien':
                                    $scholarshipAmount = 150000;
                                    $laptopEligible = true;
                                    break;
                                case 'Bien':
                                    $scholarshipAmount = 120000;
                                    break;
                                case 'Assez Bien':
                                    $scholarshipAmount = 100000;
                                    break;
                                case 'Passable':
                                    $scholarshipAmount = 50000;
                                    break;
                            }
                        } elseif ($school->code === 'ISTPM') {
                            $scholarshipAmount = 25000;
                        }
                    }
                }
                
                Student::updateOrCreate(
                    ['registration_number' => 'ETU' . str_pad($index + 1, 4, '0', STR_PAD_LEFT)],
                    array_merge($studentData, [
                        'class_series_id' => $series->id,
                        'school_year_id' => $schoolYear->id,
                        'qr_code' => 'STU_' . strtoupper(Str::random(8)) . '_' . ($index + 1),
                        'date_of_birth' => Carbon::now()->subYears(rand(18, 25))->format('Y-m-d'),
                        'place_of_birth' => 'Bafoussam',
                        'gender' => rand(0, 1) ? 'M' : 'F',
                        'parent_phone' => '+237650' . rand(100000, 999999),
                        'parent_email' => strtolower($studentData['last_name']) . '@parent.com',
                        'scholarship_amount' => $scholarshipAmount,
                        'laptop_eligible' => $laptopEligible,
                        'laptop_received' => false,
                        'bts_mention' => $studentData['mention'],
                        'is_active' => true
                    ])
                );
            }
        }
    }

    private function createLaptopDistributions()
    {
        $this->command->info('💻 Creating laptop distributions...');
        
        $students = Student::where('laptop_eligible', true)->where('laptop_received', false)->take(5)->get();
        $schoolYear = SchoolYear::where('is_current', true)->first();
        
        foreach ($students as $student) {
            LaptopDistribution::create([
                'student_id' => $student->id,
                'laptop_model' => 'Dell Inspiron 15',
                'serial_number' => 'LAP' . strtoupper(Str::random(10)),
                'distribution_date' => Carbon::today()->toDateString(),
                'status' => 'distributed',
                'notes' => 'Distributed for academic year ' . $schoolYear->name
            ]);
            
            $student->update(['laptop_received' => true]);
        }
    }

    private function createAttendances()
    {
        $this->command->info('📊 Creating attendances...');
        
        $this->createStudentAttendances();
        $this->createTeacherAttendances();
    }

    private function createStudentAttendances()
    {
        $schoolYear = SchoolYear::where('is_current', true)->first();
        $supervisor = User::where('role', 'surveillant_general')->first();
        $students = Student::with('classSeries')->where('is_active', true)->take(10)->get();
        
        if (!$supervisor || $students->isEmpty()) {
            return;
        }

        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        foreach ($students as $student) {
            if (!$student->classSeries) continue;

            if (rand(1, 100) <= 85) {
                $entryTime = $today->copy()->setTime(7, 30)->addMinutes(rand(-30, 60));
                
                Attendance::create([
                    'student_id' => $student->id,
                    'supervisor_id' => $supervisor->id,
                    'school_class_id' => $student->classSeries->class_id,
                    'school_year_id' => $schoolYear->id,
                    'attendance_date' => $today->toDateString(),
                    'scanned_at' => $entryTime,
                    'is_present' => true,
                    'event_type' => 'entry',
                    'parent_notified' => true,
                    'notified_at' => $entryTime->addMinutes(2)
                ]);
            }

            if (rand(1, 100) <= 90) {
                $entryTime = $yesterday->copy()->setTime(7, 30)->addMinutes(rand(-30, 60));
                $exitTime = $yesterday->copy()->setTime(16, 0)->addMinutes(rand(-30, 60));
                
                Attendance::create([
                    'student_id' => $student->id,
                    'supervisor_id' => $supervisor->id,
                    'school_class_id' => $student->classSeries->class_id,
                    'school_year_id' => $schoolYear->id,
                    'attendance_date' => $yesterday->toDateString(),
                    'scanned_at' => $entryTime,
                    'is_present' => true,
                    'event_type' => 'entry',
                    'parent_notified' => true,
                    'notified_at' => $entryTime->addMinutes(2)
                ]);

                Attendance::create([
                    'student_id' => $student->id,
                    'supervisor_id' => $supervisor->id,
                    'school_class_id' => $student->classSeries->class_id,
                    'school_year_id' => $schoolYear->id,
                    'attendance_date' => $yesterday->toDateString(),
                    'scanned_at' => $exitTime,
                    'is_present' => true,
                    'event_type' => 'exit',
                    'parent_notified' => true,
                    'notified_at' => $exitTime->addMinutes(2)
                ]);
            }
        }
    }

    private function createTeacherAttendances()
    {
        $schoolYear = SchoolYear::where('is_current', true)->first();
        $supervisor = User::where('role', 'surveillant_general')->first();
        $teachers = Teacher::where('is_active', true)->get();
        
        if (!$supervisor || $teachers->isEmpty()) {
            return;
        }

        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        foreach ($teachers as $teacher) {
            if (rand(1, 100) <= 90) {
                $entryTime = $today->copy()->setTime(8, 0)->addMinutes(rand(-15, 30));
                $workHours = 8 + (rand(-60, 60) / 60);
                
                TeacherAttendance::create([
                    'teacher_id' => $teacher->id,
                    'supervisor_id' => $supervisor->id,
                    'school_year_id' => $schoolYear->id,
                    'attendance_date' => $today->toDateString(),
                    'scanned_at' => $entryTime,
                    'is_present' => true,
                    'event_type' => 'entry',
                    'work_hours' => 0,
                    'late_minutes' => max(0, $entryTime->diffInMinutes($today->copy()->setTime(8, 0))),
                    'early_departure_minutes' => 0
                ]);
            }

            if (rand(1, 100) <= 95) {
                $entryTime = $yesterday->copy()->setTime(8, 0)->addMinutes(rand(-15, 30));
                $exitTime = $yesterday->copy()->setTime(17, 0)->addMinutes(rand(-30, 30));
                $workHours = $exitTime->diffInHours($entryTime);
                
                TeacherAttendance::create([
                    'teacher_id' => $teacher->id,
                    'supervisor_id' => $supervisor->id,
                    'school_year_id' => $schoolYear->id,
                    'attendance_date' => $yesterday->toDateString(),
                    'scanned_at' => $entryTime,
                    'is_present' => true,
                    'event_type' => 'entry',
                    'work_hours' => 0,
                    'late_minutes' => max(0, $entryTime->diffInMinutes($yesterday->copy()->setTime(8, 0))),
                    'early_departure_minutes' => 0
                ]);

                TeacherAttendance::create([
                    'teacher_id' => $teacher->id,
                    'supervisor_id' => $supervisor->id,
                    'school_year_id' => $schoolYear->id,
                    'attendance_date' => $yesterday->toDateString(),
                    'scanned_at' => $exitTime,
                    'is_present' => true,
                    'event_type' => 'exit',
                    'work_hours' => $workHours,
                    'late_minutes' => 0,
                    'early_departure_minutes' => max(0, $yesterday->copy()->setTime(17, 0)->diffInMinutes($exitTime))
                ]);
            }
        }
    }

    private function displaySummary()
    {
        $this->command->info('');
        $this->command->info('🎉 UNIVERSITY SEEDING SUMMARY');
        $this->command->info('==========================================');
        
        $counts = [
            'Users' => User::count(),
            'Schools' => School::count(),
            'Levels' => Level::count(),
            'Specialities' => SchoolClass::count(),
            'Class Series' => ClassSeries::count(),
            'Payment Tranches' => PaymentTranche::count(),
            'University Fees' => UniversityFee::count(),
            'Scholarships' => UniversityScholarship::count(),
            'Laptop Distributions' => LaptopDistribution::count(),
            'Subjects' => Subject::count(),
            'Teachers' => Teacher::count(),
            'Students' => Student::count(),
            'Student Attendances' => Attendance::count(),
            'Teacher Attendances' => TeacherAttendance::count(),
        ];

        foreach ($counts as $type => $count) {
            $this->command->info("• {$type}: {$count}");
        }
        
        $this->command->info('==========================================');
        $this->command->info('🏫 SCHOOLS CREATED');
        $schools = School::all(['name', 'code']);
        foreach ($schools as $school) {
            $this->command->info("• {$school->name} ({$school->code})");
        }
        
        $this->command->info('==========================================');
        $this->command->info('💰 SCHOLARSHIPS AND LAPTOPS');
        $this->command->info('• INSSAS: 50,000 FCFA + Laptop');
        $this->command->info('• ESGIT: 50,000-150,000 FCFA based on mention + Laptop (Très Bien)');
        $this->command->info('• ISTPM: 25,000 FCFA');
        
        $this->command->info('==========================================');
        $this->command->info('🔑 TEST ACCOUNTS');
        $this->command->info('Username: admin       | Password: password123');
        $this->command->info('Username: surveillant | Password: password123');
        $this->command->info('Username: comptable   | Password: password123');
        $this->command->info('==========================================');
    }
}