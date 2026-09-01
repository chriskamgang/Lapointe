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
        switch ($schoolCode) {
            case 'INSSAS':
                return [
                    ['name' => 'BTS 1', 'level_code' => 'BTS1', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 1],
                    ['name' => 'BTS 2', 'level_code' => 'BTS2', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 2],
                    ['name' => 'BTS 3', 'level_code' => 'BTS3', 'level_type' => 'BTS', 'duration_years' => 3, 'order' => 3],
                    ['name' => 'Licence Aca 1', 'level_code' => 'LACA1', 'level_type' => 'LICENCE_ACA', 'duration_years' => 3, 'order' => 4],
                    ['name' => 'Licence Aca 2', 'level_code' => 'LACA2', 'level_type' => 'LICENCE_ACA', 'duration_years' => 3, 'order' => 5],
                    ['name' => 'Licence Aca 3', 'level_code' => 'LACA3', 'level_type' => 'LICENCE_ACA', 'duration_years' => 3, 'order' => 6],
                    ['name' => 'Licence Pro', 'level_code' => 'LP', 'level_type' => 'LICENCE_PRO', 'duration_years' => 1, 'order' => 7],
                    ['name' => 'Bachelor', 'level_code' => 'BCH', 'level_type' => 'BACHELOR', 'duration_years' => 1, 'order' => 8],
                    ['name' => 'Double Diplomation 1', 'level_code' => 'DD1', 'level_type' => 'DOUBLE_DIPLOMATION', 'duration_years' => 3, 'order' => 9],
                    ['name' => 'Double Diplomation 2', 'level_code' => 'DD2', 'level_type' => 'DOUBLE_DIPLOMATION', 'duration_years' => 3, 'order' => 10],
                    ['name' => 'Double Diplomation 3', 'level_code' => 'DD3', 'level_type' => 'DOUBLE_DIPLOMATION', 'duration_years' => 3, 'order' => 11],
                    ['name' => 'MASTER 1', 'level_code' => 'M1', 'level_type' => 'MASTER', 'duration_years' => 2, 'order' => 12],
                    ['name' => 'MASTER 2', 'level_code' => 'M2', 'level_type' => 'MASTER', 'duration_years' => 2, 'order' => 13],
                    // Health HND (3 ans) - Section anglophone
                    ['name' => 'Health HND 1', 'level_code' => 'HND1', 'level_type' => 'HND', 'duration_years' => 3, 'order' => 14],
                    ['name' => 'Health HND 2', 'level_code' => 'HND2', 'level_type' => 'HND', 'duration_years' => 3, 'order' => 15],
                    ['name' => 'Health HND 3', 'level_code' => 'HND3', 'level_type' => 'HND', 'duration_years' => 3, 'order' => 16],

                    // Professional License (3 ans) - Section anglophone  
                    ['name' => 'Professional License 1', 'level_code' => 'PL1', 'level_type' => 'PROFESSIONAL_LICENSE', 'duration_years' => 3, 'order' => 17],
                    ['name' => 'Professional License 2', 'level_code' => 'PL2', 'level_type' => 'PROFESSIONAL_LICENSE', 'duration_years' => 3, 'order' => 18],
                    ['name' => 'Professional License 3', 'level_code' => 'PL3', 'level_type' => 'PROFESSIONAL_LICENSE', 'duration_years' => 3, 'order' => 19],

                    // Professional License (BTS+1) - Section anglophone
                    ['name' => 'Professional License', 'level_code' => 'PLPRO', 'level_type' => 'LICENCE_PRO', 'duration_years' => 1, 'order' => 20],

                    // Bachelor - Section anglophone
                    ['name' => 'Bachelor Health', 'level_code' => 'BACH_H', 'level_type' => 'BACHELOR', 'duration_years' => 1, 'order' => 21],

                    // Professional Master (2 ans) - Section anglophone
                    ['name' => 'Professional Master 1', 'level_code' => 'PM1', 'level_type' => 'PROFESSIONAL_MASTER', 'duration_years' => 2, 'order' => 22],
                    ['name' => 'Professional Master 2', 'level_code' => 'PM2', 'level_type' => 'PROFESSIONAL_MASTER', 'duration_years' => 2, 'order' => 23],
                ];

            case 'ESGIT':
                return [
                    ['name' => 'BTS 1', 'level_code' => 'BTS1', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 1],
                    ['name' => 'BTS 2', 'level_code' => 'BTS2', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 2],
                    ['name' => 'Licence Pro', 'level_code' => 'LP', 'level_type' => 'LICENCE_PRO', 'duration_years' => 1, 'order' => 3],
                    ['name' => 'Cycle Prépa 1', 'level_code' => 'CP1', 'level_type' => 'CYCLE_PREPA', 'duration_years' => 2, 'order' => 4],
                    ['name' => 'Cycle Prépa 2', 'level_code' => 'CP2', 'level_type' => 'CYCLE_PREPA', 'duration_years' => 2, 'order' => 5],
                    ['name' => 'INGENIERIE 1', 'level_code' => 'ING1', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 6],
                    ['name' => 'INGENIERIE 2', 'level_code' => 'ING2', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 7],
                    ['name' => 'INGENIERIE 3', 'level_code' => 'ING3', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 8],
                    ['name' => 'INGENIERIE 4', 'level_code' => 'ING4', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 9],
                    ['name' => 'INGENIERIE 5', 'level_code' => 'ING5', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 10]
                ];

            case 'ESJEC':
                return [
                    ['name' => 'BTS 1', 'level_code' => 'BTS1', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 1],
                    ['name' => 'BTS 2', 'level_code' => 'BTS2', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 2],
                    ['name' => 'Licence Pro', 'level_code' => 'LP', 'level_type' => 'LICENCE_PRO', 'duration_years' => 1, 'order' => 3]
                ];

            case 'ESSIT':
                return [
                    ['name' => 'BTS 1', 'level_code' => 'BTS1', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 1],
                    ['name' => 'BTS 2', 'level_code' => 'BTS2', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 2],
                    ['name' => 'Cycle Prépa 1', 'level_code' => 'CP1', 'level_type' => 'CYCLE_PREPA', 'duration_years' => 2, 'order' => 3],
                    ['name' => 'Cycle Prépa 2', 'level_code' => 'CP2', 'level_type' => 'CYCLE_PREPA', 'duration_years' => 2, 'order' => 4],
                    ['name' => 'INGENIERIE 1', 'level_code' => 'ING1', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 5],
                    ['name' => 'INGENIERIE 2', 'level_code' => 'ING2', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 6],
                    ['name' => 'INGENIERIE 3', 'level_code' => 'ING3', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 7],
                    ['name' => 'INGENIERIE 4', 'level_code' => 'ING4', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 8],
                    ['name' => 'INGENIERIE 5', 'level_code' => 'ING5', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 9]
                ];

            case 'ISTMS':
                return [
                    ['name' => 'TMS 1', 'level_code' => 'TMS1', 'level_type' => 'TMS', 'duration_years' => 3, 'order' => 1],
                    ['name' => 'TMS 2', 'level_code' => 'TMS2', 'level_type' => 'TMS', 'duration_years' => 3, 'order' => 2],
                    ['name' => 'TMS 3', 'level_code' => 'TMS3', 'level_type' => 'TMS', 'duration_years' => 3, 'order' => 3]
                ];

            case 'ISTPM':
                return [
                    ['name' => 'CQP', 'level_code' => 'CQP', 'level_type' => 'CQP', 'duration_years' => 1, 'order' => 1],
                    ['name' => 'DQP', 'level_code' => 'DQP', 'level_type' => 'DQP', 'duration_years' => 1, 'order' => 2]
                ];

            default:
                return [];
        }
    }

    private function createPaymentTranches()
    {
        $this->command->info('💰 Creating payment tranches...');

        $tranches = [
            ['name' => 'Frais Étude Dossier', 'description' => 'Frais d\'étude de dossier', 'order' => 1],
            ['name' => 'Inscription', 'description' => 'Frais d\'inscription annuelle', 'order' => 2],
            ['name' => 'Rames Papier', 'description' => 'Frais des rames de papier', 'order' => 3],
            ['name' => 'Tutelle Universitaire', 'description' => 'Frais de tutelle universitaire', 'order' => 4],
            ['name' => 'Établissement Diplôme', 'description' => 'Frais d\'établissement de diplôme', 'order' => 5],
            ['name' => '1ère Tranche', 'description' => 'Première tranche de scolarité', 'order' => 6],
            ['name' => '2ème Tranche', 'description' => 'Deuxième tranche de scolarité', 'order' => 7],
            ['name' => '3ème Tranche', 'description' => 'Troisième tranche de scolarité', 'order' => 8]
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
                    ->where('name', $specialityData['level_name'])
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
                    // BTS Santé (2 ans)
                    [
                        'name' => 'Sciences Infirmières',
                        'code' => 'SINF',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation en sciences infirmières',
                        'capacity' => 40,
                        'career_prospects' => ['Infirmier', 'Chef de service', 'Formateur en soins'],
                        'admission_requirements' => ['Baccalauréat', 'Certificat médical', 'Entretien']
                    ],
                    [
                        'name' => 'Sciences Infirmières',
                        'code' => 'SINF',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation en sciences infirmières',
                        'capacity' => 40,
                        'career_prospects' => ['Infirmier', 'Chef de service', 'Formateur en soins'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Sage-Femme / Maïeuticien',
                        'code' => 'SAGE',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation en maïeutique',
                        'capacity' => 35,
                        'career_prospects' => ['Sage-femme', 'Maïeuticien'],
                        'admission_requirements' => ['Baccalauréat', 'Certificat médical']
                    ],
                    [
                        'name' => 'Sage-Femme / Maïeuticien',
                        'code' => 'SAGE',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation en maïeutique',
                        'capacity' => 35,
                        'career_prospects' => ['Sage-femme', 'Maïeuticien'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Techniques de Laboratoire d\'Analyses Médicales',
                        'code' => 'TLAM',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation en techniques de laboratoire',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien de laboratoire', 'Responsable qualité'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Certificat médical']
                    ],
                    [
                        'name' => 'Techniques de Laboratoire d\'Analyses Médicales',
                        'code' => 'TLAM',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation en techniques de laboratoire',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien de laboratoire', 'Responsable qualité'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Kinésithérapie',
                        'code' => 'KINE',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation en kinésithérapie et rééducation',
                        'capacity' => 30,
                        'career_prospects' => ['Kinésithérapeute', 'Rééducateur'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Certificat médical', 'Test physique']
                    ],
                    [
                        'name' => 'Kinésithérapie',
                        'code' => 'KINE',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation en kinésithérapie et rééducation',
                        'capacity' => 30,
                        'career_prospects' => ['Kinésithérapeute', 'Rééducateur'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Sciences et Techniques Pharmaceutiques',
                        'code' => 'STP',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation en pharmacie',
                        'capacity' => 35,
                        'career_prospects' => ['Pharmacien assistant', 'Technicien pharmaceutique'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Sciences et Techniques Pharmaceutiques',
                        'code' => 'STP',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation en pharmacie',
                        'capacity' => 35,
                        'career_prospects' => ['Pharmacien assistant', 'Technicien pharmaceutique'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Imagerie Médicale et Radiologie',
                        'code' => 'IMR',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation en imagerie médicale',
                        'capacity' => 30,
                        'career_prospects' => ['Manipulateur radio', 'Technicien imagerie'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Imagerie Médicale et Radiologie',
                        'code' => 'IMR',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation en imagerie médicale',
                        'capacity' => 30,
                        'career_prospects' => ['Manipulateur radio', 'Technicien imagerie'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Odontostomatologie',
                        'code' => 'ODONTO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation en soins dentaires',
                        'capacity' => 25,
                        'career_prospects' => ['Assistant dentaire', 'Technicien prothésiste'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Odontostomatologie',
                        'code' => 'ODONTO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation en soins dentaires',
                        'capacity' => 25,
                        'career_prospects' => ['Assistant dentaire', 'Technicien prothésiste'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Opticien-Lunetier',
                        'code' => 'OPT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation en optique',
                        'capacity' => 30,
                        'career_prospects' => ['Opticien', 'Vendeur optique'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Opticien-Lunetier',
                        'code' => 'OPT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation en optique',
                        'capacity' => 30,
                        'career_prospects' => ['Opticien', 'Vendeur optique'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],

                    // BTS Santé (3 ans) - Health HND
                    [
                        'name' => 'Nursing',
                        'code' => 'NURS',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 3',
                        'description' => 'Formation en soins infirmiers (Health HND)',
                        'capacity' => 40,
                        'career_prospects' => ['Nurse', 'Healthcare manager'],
                        'admission_requirements' => ['Baccalauréat', 'Medical certificate']
                    ],
                    [
                        'name' => 'Midwifery',
                        'code' => 'MIDW',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 3',
                        'description' => 'Formation en maïeutique (Health HND)',
                        'capacity' => 35,
                        'career_prospects' => ['Midwife', 'Reproductive health specialist'],
                        'admission_requirements' => ['Baccalauréat', 'Medical certificate']
                    ],
                    [
                        'name' => 'Medical Laboratory Sciences',
                        'code' => 'MLS',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 3',
                        'description' => 'Formation en sciences de laboratoire médical',
                        'capacity' => 35,
                        'career_prospects' => ['Medical laboratory technician', 'Quality controller'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Physiotherapy',
                        'code' => 'PHYSIO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 3',
                        'description' => 'Formation en physiothérapie',
                        'capacity' => 30,
                        'career_prospects' => ['Physiotherapist', 'Rehabilitation specialist'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Physical test']
                    ],
                    [
                        'name' => 'Pharmaceutical Sciences and Techniques',
                        'code' => 'PST',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 3',
                        'description' => 'Formation en sciences pharmaceutiques',
                        'capacity' => 35,
                        'career_prospects' => ['Pharmaceutical technician', 'Pharmacy assistant'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Medical Imaging and Radiology',
                        'code' => 'MIR',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 3',
                        'description' => 'Formation en imagerie médicale et radiologie',
                        'capacity' => 30,
                        'career_prospects' => ['Radiographer', 'Medical imaging technician'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Odontostomatology',
                        'code' => 'ODONTO_HND',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 3',
                        'description' => 'Formation en odontostomatologie',
                        'capacity' => 25,
                        'career_prospects' => ['Dental technician', 'Oral health specialist'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Optician-Eye wear',
                        'code' => 'OPT_HND',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 3',
                        'description' => 'Formation en optique et lunetterie',
                        'capacity' => 30,
                        'career_prospects' => ['Optician', 'Eye care specialist'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Ultrasonography and Echography',
                        'code' => 'ULTRA',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 3',
                        'description' => 'Formation en échographie',
                        'capacity' => 25,
                        'career_prospects' => ['Sonographer', 'Medical imaging specialist'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],

                    // Licence Aca (3 ans) - Professional License BAC+3
                    [
                        'name' => 'Sciences Biomédicales',
                        'code' => 'BIOMED',
                        'level_type' => 'LICENCE_ACA',
                        'level_name' => 'Licence Aca 1',
                        'description' => 'Formation en sciences biomédicales',
                        'capacity' => 40,
                        'career_prospects' => ['Biomedical scientist', 'Research assistant'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Sciences Biomédicales',
                        'code' => 'BIOMED',
                        'level_type' => 'LICENCE_ACA',
                        'level_name' => 'Licence Aca 2',
                        'description' => 'Formation en sciences biomédicales',
                        'capacity' => 40,
                        'career_prospects' => ['Biomedical scientist', 'Research assistant'],
                        'admission_requirements' => ['Licence Aca 1 validée']
                    ],
                    [
                        'name' => 'Sciences Biomédicales',
                        'code' => 'BIOMED',
                        'level_type' => 'LICENCE_ACA',
                        'level_name' => 'Licence Aca 3',
                        'description' => 'Formation en sciences biomédicales',
                        'capacity' => 40,
                        'career_prospects' => ['Biomedical scientist', 'Research assistant'],
                        'admission_requirements' => ['Licence Aca 2 validée']
                    ],
                    [
                        'name' => 'Sciences Infirmières',
                        'code' => 'SINF_LACA',
                        'level_type' => 'LICENCE_ACA',
                        'level_name' => 'Licence Aca 1',
                        'description' => 'Licence professionnelle en sciences infirmières',
                        'capacity' => 40,
                        'career_prospects' => ['Infirmier diplômé', 'Superviseur de soins'],
                        'admission_requirements' => ['Baccalauréat']
                    ],
                    [
                        'name' => 'Sciences Infirmières',
                        'code' => 'SINF_LACA',
                        'level_type' => 'LICENCE_ACA',
                        'level_name' => 'Licence Aca 2',
                        'description' => 'Licence professionnelle en sciences infirmières',
                        'capacity' => 40,
                        'career_prospects' => ['Infirmier diplômé', 'Superviseur de soins'],
                        'admission_requirements' => ['Licence Aca 1 validée']
                    ],
                    [
                        'name' => 'Sciences Infirmières',
                        'code' => 'SINF_LACA',
                        'level_type' => 'LICENCE_ACA',
                        'level_name' => 'Licence Aca 3',
                        'description' => 'Licence professionnelle en sciences infirmières',
                        'capacity' => 40,
                        'career_prospects' => ['Infirmier diplômé', 'Superviseur de soins'],
                        'admission_requirements' => ['Licence Aca 2 validée']
                    ],

                    // Licence Pro (BTS+1, IDE+1, TMS+1)
                    [
                        'name' => 'Sciences Infirmières',
                        'code' => 'SINF_LP',
                        'level_type' => 'LICENCE_PRO',
                        'level_name' => 'Licence Pro',
                        'description' => 'Licence professionnelle pour infirmiers',
                        'capacity' => 30,
                        'career_prospects' => ['Infirmier spécialisé', 'Cadre de santé'],
                        'admission_requirements' => ['BTS Santé ou IDE']
                    ],
                    [
                        'name' => 'Sage-Femme / Maïeuticien',
                        'code' => 'SAGE_LP',
                        'level_type' => 'LICENCE_PRO',
                        'level_name' => 'Licence Pro',
                        'description' => 'Licence professionnelle en maïeutique',
                        'capacity' => 25,
                        'career_prospects' => ['Sage-femme spécialisée', 'Cadre de santé'],
                        'admission_requirements' => ['BTS Santé ou équivalent']
                    ],
                    [
                        'name' => 'Analyses Médicales',
                        'code' => 'AMED_LP',
                        'level_type' => 'LICENCE_PRO',
                        'level_name' => 'Licence Pro',
                        'description' => 'Licence professionnelle en analyses médicales',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien supérieur laboratoire', 'Responsable qualité'],
                        'admission_requirements' => ['BTS Laboratoire ou TMS']
                    ],

                    // Bachelor
                    [
                        'name' => 'Sciences Infirmières',
                        'code' => 'SINF_BCH',
                        'level_type' => 'BACHELOR',
                        'level_name' => 'Bachelor',
                        'description' => 'Bachelor en sciences infirmières',
                        'capacity' => 30,
                        'career_prospects' => ['Nurse supervisor', 'Healthcare coordinator'],
                        'admission_requirements' => ['BTS+1 validé']
                    ],

                    // Double Diplomation (BTS Santé + Licence Pro en 3 ans)
                    [
                        'name' => 'Sciences Infirmières DD',
                        'code' => 'SINF_DD',
                        'level_type' => 'DOUBLE_DIPLOMATION',
                        'level_name' => 'Double Diplomation 1',
                        'description' => 'Double diplomation BTS+Licence Pro',
                        'capacity' => 30,
                        'career_prospects' => ['Infirmier diplômé', 'Cadre de santé'],
                        'admission_requirements' => ['Baccalauréat']
                    ],
                    [
                        'name' => 'Sciences Infirmières DD',
                        'code' => 'SINF_DD',
                        'level_type' => 'DOUBLE_DIPLOMATION',
                        'level_name' => 'Double Diplomation 2',
                        'description' => 'Double diplomation BTS+Licence Pro',
                        'capacity' => 30,
                        'career_prospects' => ['Infirmier diplômé', 'Cadre de santé'],
                        'admission_requirements' => ['DD 1 validée']
                    ],
                    [
                        'name' => 'Sciences Infirmières DD',
                        'code' => 'SINF_DD',
                        'level_type' => 'DOUBLE_DIPLOMATION',
                        'level_name' => 'Double Diplomation 3',
                        'description' => 'Double diplomation BTS+Licence Pro',
                        'capacity' => 30,
                        'career_prospects' => ['Infirmier diplômé', 'Cadre de santé'],
                        'admission_requirements' => ['DD 2 validée']
                    ],

                    // Master Professionnel
                    [
                        'name' => 'Sciences Biomédicales',
                        'code' => 'BIOMED_M1',
                        'level_type' => 'MASTER',
                        'level_name' => 'MASTER 1',
                        'description' => 'Master en sciences biomédicales',
                        'capacity' => 25,
                        'career_prospects' => ['Chercheur', 'Spécialiste biomédical'],
                        'admission_requirements' => ['Licence Pro ou Bachelor']
                    ],
                    [
                        'name' => 'Sciences Biomédicales',
                        'code' => 'BIOMED_M2',
                        'level_type' => 'MASTER',
                        'level_name' => 'MASTER 2',
                        'description' => 'Master en sciences biomédicales',
                        'capacity' => 25,
                        'career_prospects' => ['Chercheur senior', 'Expert biomédical'],
                        'admission_requirements' => ['Master 1 validé']
                    ],
                    // Health HND (3 ans) - Section anglophone
                    [
                        'name' => 'Nursing',
                        'code' => 'NURS_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 1',
                        'description' => 'Health HND Nursing program',
                        'capacity' => 40,
                        'career_prospects' => ['Nurse', 'Healthcare supervisor'],
                        'admission_requirements' => ['GCE A Level', 'Medical certificate']
                    ],
                    [
                        'name' => 'Nursing',
                        'code' => 'NURS_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 2',
                        'description' => 'Health HND Nursing program',
                        'capacity' => 40,
                        'career_prospects' => ['Nurse', 'Healthcare supervisor'],
                        'admission_requirements' => ['HND 1 validated']
                    ],
                    [
                        'name' => 'Nursing',
                        'code' => 'NURS_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 3',
                        'description' => 'Health HND Nursing program',
                        'capacity' => 40,
                        'career_prospects' => ['Nurse', 'Healthcare supervisor'],
                        'admission_requirements' => ['HND 2 validated']
                    ],
                    [
                        'name' => 'Midwifery',
                        'code' => 'MIDW_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 1',
                        'description' => 'Health HND Midwifery program',
                        'capacity' => 35,
                        'career_prospects' => ['Midwife', 'Reproductive health specialist'],
                        'admission_requirements' => ['GCE A Level', 'Medical certificate']
                    ],
                    [
                        'name' => 'Midwifery',
                        'code' => 'MIDW_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 2',
                        'description' => 'Health HND Midwifery program',
                        'capacity' => 35,
                        'career_prospects' => ['Midwife', 'Reproductive health specialist'],
                        'admission_requirements' => ['HND 1 validated']
                    ],
                    [
                        'name' => 'Midwifery',
                        'code' => 'MIDW_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 3',
                        'description' => 'Health HND Midwifery program',
                        'capacity' => 35,
                        'career_prospects' => ['Midwife', 'Reproductive health specialist'],
                        'admission_requirements' => ['HND 2 validated']
                    ],
                    [
                        'name' => 'Medical Laboratory Sciences',
                        'code' => 'MLS_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 1',
                        'description' => 'Health HND Medical Laboratory program',
                        'capacity' => 35,
                        'career_prospects' => ['Medical lab technician', 'Quality controller'],
                        'admission_requirements' => ['GCE A Level Sciences']
                    ],
                    [
                        'name' => 'Medical Laboratory Sciences',
                        'code' => 'MLS_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 2',
                        'description' => 'Health HND Medical Laboratory program',
                        'capacity' => 35,
                        'career_prospects' => ['Medical lab technician', 'Quality controller'],
                        'admission_requirements' => ['HND 1 validated']
                    ],
                    [
                        'name' => 'Medical Laboratory Sciences',
                        'code' => 'MLS_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 3',
                        'description' => 'Health HND Medical Laboratory program',
                        'capacity' => 35,
                        'career_prospects' => ['Medical lab technician', 'Quality controller'],
                        'admission_requirements' => ['HND 2 validated']
                    ],
                    [
                        'name' => 'Physiotherapy',
                        'code' => 'PHYSIO_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 1',
                        'description' => 'Health HND Physiotherapy program',
                        'capacity' => 30,
                        'career_prospects' => ['Physiotherapist', 'Rehabilitation specialist'],
                        'admission_requirements' => ['GCE A Level Sciences', 'Physical test']
                    ],
                    [
                        'name' => 'Physiotherapy',
                        'code' => 'PHYSIO_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 2',
                        'description' => 'Health HND Physiotherapy program',
                        'capacity' => 30,
                        'career_prospects' => ['Physiotherapist', 'Rehabilitation specialist'],
                        'admission_requirements' => ['HND 1 validated']
                    ],
                    [
                        'name' => 'Physiotherapy',
                        'code' => 'PHYSIO_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 3',
                        'description' => 'Health HND Physiotherapy program',
                        'capacity' => 30,
                        'career_prospects' => ['Physiotherapist', 'Rehabilitation specialist'],
                        'admission_requirements' => ['HND 2 validated']
                    ],
                    [
                        'name' => 'Pharmaceutical Sciences and Techniques',
                        'code' => 'PST_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 1',
                        'description' => 'Health HND Pharmaceutical program',
                        'capacity' => 35,
                        'career_prospects' => ['Pharmaceutical technician', 'Pharmacy assistant'],
                        'admission_requirements' => ['GCE A Level Sciences']
                    ],
                    [
                        'name' => 'Pharmaceutical Sciences and Techniques',
                        'code' => 'PST_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 2',
                        'description' => 'Health HND Pharmaceutical program',
                        'capacity' => 35,
                        'career_prospects' => ['Pharmaceutical technician', 'Pharmacy assistant'],
                        'admission_requirements' => ['HND 1 validated']
                    ],
                    [
                        'name' => 'Pharmaceutical Sciences and Techniques',
                        'code' => 'PST_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 3',
                        'description' => 'Health HND Pharmaceutical program',
                        'capacity' => 35,
                        'career_prospects' => ['Pharmaceutical technician', 'Pharmacy assistant'],
                        'admission_requirements' => ['HND 2 validated']
                    ],
                    [
                        'name' => 'Medical Imaging and Radiology',
                        'code' => 'MIR_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 1',
                        'description' => 'Health HND Medical Imaging program',
                        'capacity' => 30,
                        'career_prospects' => ['Radiographer', 'Medical imaging technician'],
                        'admission_requirements' => ['GCE A Level Sciences']
                    ],
                    [
                        'name' => 'Medical Imaging and Radiology',
                        'code' => 'MIR_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 2',
                        'description' => 'Health HND Medical Imaging program',
                        'capacity' => 30,
                        'career_prospects' => ['Radiographer', 'Medical imaging technician'],
                        'admission_requirements' => ['HND 1 validated']
                    ],
                    [
                        'name' => 'Medical Imaging and Radiology',
                        'code' => 'MIR_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 3',
                        'description' => 'Health HND Medical Imaging program',
                        'capacity' => 30,
                        'career_prospects' => ['Radiographer', 'Medical imaging technician'],
                        'admission_requirements' => ['HND 2 validated']
                    ],
                    [
                        'name' => 'Odontostomatology',
                        'code' => 'ODONTO_HND_EN',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 1',
                        'description' => 'Health HND Odontostomatology program',
                        'capacity' => 25,
                        'career_prospects' => ['Dental technician', 'Oral health specialist'],
                        'admission_requirements' => ['GCE A Level Sciences']
                    ],
                    [
                        'name' => 'Odontostomatology',
                        'code' => 'ODONTO_HND_EN',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 2',
                        'description' => 'Health HND Odontostomatology program',
                        'capacity' => 25,
                        'career_prospects' => ['Dental technician', 'Oral health specialist'],
                        'admission_requirements' => ['HND 1 validated']
                    ],
                    [
                        'name' => 'Odontostomatology',
                        'code' => 'ODONTO_HND_EN',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 3',
                        'description' => 'Health HND Odontostomatology program',
                        'capacity' => 25,
                        'career_prospects' => ['Dental technician', 'Oral health specialist'],
                        'admission_requirements' => ['HND 2 validated']
                    ],
                    [
                        'name' => 'Optician-Eye wear',
                        'code' => 'OPT_HND_EN',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 1',
                        'description' => 'Health HND Optician program',
                        'capacity' => 30,
                        'career_prospects' => ['Optician', 'Eye care specialist'],
                        'admission_requirements' => ['GCE A Level Sciences']
                    ],
                    [
                        'name' => 'Optician-Eye wear',
                        'code' => 'OPT_HND_EN',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 2',
                        'description' => 'Health HND Optician program',
                        'capacity' => 30,
                        'career_prospects' => ['Optician', 'Eye care specialist'],
                        'admission_requirements' => ['HND 1 validated']
                    ],
                    [
                        'name' => 'Optician-Eye wear',
                        'code' => 'OPT_HND_EN',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 3',
                        'description' => 'Health HND Optician program',
                        'capacity' => 30,
                        'career_prospects' => ['Optician', 'Eye care specialist'],
                        'admission_requirements' => ['HND 2 validated']
                    ],
                    [
                        'name' => 'Ultrasonography and Echography',
                        'code' => 'ULTRA_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 1',
                        'description' => 'Health HND Ultrasonography program',
                        'capacity' => 25,
                        'career_prospects' => ['Sonographer', 'Medical imaging specialist'],
                        'admission_requirements' => ['GCE A Level Sciences']
                    ],
                    [
                        'name' => 'Ultrasonography and Echography',
                        'code' => 'ULTRA_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 2',
                        'description' => 'Health HND Ultrasonography program',
                        'capacity' => 25,
                        'career_prospects' => ['Sonographer', 'Medical imaging specialist'],
                        'admission_requirements' => ['HND 1 validated']
                    ],
                    [
                        'name' => 'Ultrasonography and Echography',
                        'code' => 'ULTRA_HND',
                        'level_type' => 'HND',
                        'level_name' => 'Health HND 3',
                        'description' => 'Health HND Ultrasonography program',
                        'capacity' => 25,
                        'career_prospects' => ['Sonographer', 'Medical imaging specialist'],
                        'admission_requirements' => ['HND 2 validated']
                    ],

                    // Professional License BAC+3 (3 ans) - Section anglophone
                    [
                        'name' => 'Biomedical Sciences',
                        'code' => 'BIOMED_PL',
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'level_name' => 'Professional License 1',
                        'description' => 'Professional License Biomedical Sciences',
                        'capacity' => 40,
                        'career_prospects' => ['Biomedical scientist', 'Research assistant'],
                        'admission_requirements' => ['GCE A Level Sciences']
                    ],
                    [
                        'name' => 'Biomedical Sciences',
                        'code' => 'BIOMED_PL',
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'level_name' => 'Professional License 2',
                        'description' => 'Professional License Biomedical Sciences',
                        'capacity' => 40,
                        'career_prospects' => ['Biomedical scientist', 'Research assistant'],
                        'admission_requirements' => ['PL 1 validated']
                    ],
                    [
                        'name' => 'Biomedical Sciences',
                        'code' => 'BIOMED_PL',
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'level_name' => 'Professional License 3',
                        'description' => 'Professional License Biomedical Sciences',
                        'capacity' => 40,
                        'career_prospects' => ['Biomedical scientist', 'Research assistant'],
                        'admission_requirements' => ['PL 2 validated']
                    ],
                    [
                        'name' => 'Nursing',
                        'code' => 'NURS_PL',
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'level_name' => 'Professional License 1',
                        'description' => 'Professional License Nursing',
                        'capacity' => 40,
                        'career_prospects' => ['Professional nurse', 'Nurse supervisor'],
                        'admission_requirements' => ['GCE A Level']
                    ],
                    [
                        'name' => 'Nursing',
                        'code' => 'NURS_PL',
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'level_name' => 'Professional License 2',
                        'description' => 'Professional License Nursing',
                        'capacity' => 40,
                        'career_prospects' => ['Professional nurse', 'Nurse supervisor'],
                        'admission_requirements' => ['PL 1 validated']
                    ],
                    [
                        'name' => 'Nursing',
                        'code' => 'NURS_PL',
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'level_name' => 'Professional License 3',
                        'description' => 'Professional License Nursing',
                        'capacity' => 40,
                        'career_prospects' => ['Professional nurse', 'Nurse supervisor'],
                        'admission_requirements' => ['PL 2 validated']
                    ],
                    [
                        'name' => 'Midwifery',
                        'code' => 'MIDW_PL',
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'level_name' => 'Professional License 1',
                        'description' => 'Professional License Midwifery',
                        'capacity' => 35,
                        'career_prospects' => ['Professional midwife', 'Reproductive health manager'],
                        'admission_requirements' => ['GCE A Level']
                    ],
                    [
                        'name' => 'Midwifery',
                        'code' => 'MIDW_PL',
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'level_name' => 'Professional License 2',
                        'description' => 'Professional License Midwifery',
                        'capacity' => 35,
                        'career_prospects' => ['Professional midwife', 'Reproductive health manager'],
                        'admission_requirements' => ['PL 1 validated']
                    ],
                    [
                        'name' => 'Midwifery',
                        'code' => 'MIDW_PL',
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'level_name' => 'Professional License 3',
                        'description' => 'Professional License Midwifery',
                        'capacity' => 35,
                        'career_prospects' => ['Professional midwife', 'Reproductive health manager'],
                        'admission_requirements' => ['PL 2 validated']
                    ],

                    // Professional License (HND+1) - Section anglophone
                    [
                        'name' => 'Nursing',
                        'code' => 'NURS_PL_PRO',
                        'level_type' => 'LICENCE_PRO',
                        'level_name' => 'Professional License',
                        'description' => 'Professional License for HND graduates',
                        'capacity' => 30,
                        'career_prospects' => ['Advanced nurse', 'Healthcare manager'],
                        'admission_requirements' => ['Health HND or equivalent']
                    ],
                    [
                        'name' => 'Midwifery',
                        'code' => 'MIDW_PL_PRO',
                        'level_type' => 'LICENCE_PRO',
                        'level_name' => 'Professional License',
                        'description' => 'Professional License Midwifery for HND graduates',
                        'capacity' => 25,
                        'career_prospects' => ['Advanced midwife', 'Maternal health specialist'],
                        'admission_requirements' => ['Health HND or equivalent']
                    ],
                    [
                        'name' => 'Medical Laboratory Science',
                        'code' => 'MLS_PL_PRO',
                        'level_type' => 'LICENCE_PRO',
                        'level_name' => 'Professional License',
                        'description' => 'Professional License Medical Laboratory',
                        'capacity' => 30,
                        'career_prospects' => ['Senior lab technician', 'Quality manager'],
                        'admission_requirements' => ['Health HND or equivalent']
                    ],

                    // Bachelor (HND+1) - Section anglophone
                    [
                        'name' => 'Nursing',
                        'code' => 'NURS_BACH',
                        'level_type' => 'BACHELOR',
                        'level_name' => 'Bachelor Health',
                        'description' => 'Bachelor of Nursing',
                        'capacity' => 30,
                        'career_prospects' => ['Nurse practitioner', 'Healthcare coordinator'],
                        'admission_requirements' => ['HND+1 validated']
                    ],
                    [
                        'name' => 'Midwifery',
                        'code' => 'MIDW_BACH',
                        'level_type' => 'BACHELOR',
                        'level_name' => 'Bachelor Health',
                        'description' => 'Bachelor of Midwifery',
                        'capacity' => 25,
                        'career_prospects' => ['Midwife practitioner', 'Reproductive health coordinator'],
                        'admission_requirements' => ['HND+1 validated']
                    ],
                    [
                        'name' => 'Medical Laboratory Science',
                        'code' => 'MLS_BACH',
                        'level_type' => 'BACHELOR',
                        'level_name' => 'Bachelor Health',
                        'description' => 'Bachelor of Medical Laboratory Science',
                        'capacity' => 25,
                        'career_prospects' => ['Laboratory manager', 'Clinical researcher'],
                        'admission_requirements' => ['HND+1 validated']
                    ],
                    [
                        'name' => 'Nursing and Midwifery',
                        'code' => 'NURS_MIDW_BACH',
                        'level_type' => 'BACHELOR',
                        'level_name' => 'Bachelor Health',
                        'description' => 'Bachelor of Nursing and Midwifery',
                        'capacity' => 20,
                        'career_prospects' => ['Dual specialist', 'Healthcare manager'],
                        'admission_requirements' => ['HND+1 validated', 'Both specializations']
                    ],

                    // Professional Master (2 ans) - Section anglophone
                    [
                        'name' => 'Biomedical Sciences',
                        'code' => 'BIOMED_PM1',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 1',
                        'description' => 'Professional Master Biomedical Sciences',
                        'capacity' => 25,
                        'career_prospects' => ['Research scientist', 'Biomedical expert'],
                        'admission_requirements' => ['Professional License or Bachelor']
                    ],
                    [
                        'name' => 'Biomedical Sciences',
                        'code' => 'BIOMED_PM2',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 2',
                        'description' => 'Professional Master Biomedical Sciences',
                        'capacity' => 25,
                        'career_prospects' => ['Senior research scientist', 'Biomedical consultant'],
                        'admission_requirements' => ['PM 1 validated']
                    ],
                    [
                        'name' => 'Nursing (Reproductive Health)',
                        'code' => 'NURS_RH_PM1',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 1',
                        'description' => 'Professional Master Nursing - Reproductive Health',
                        'capacity' => 20,
                        'career_prospects' => ['Nurse specialist', 'Healthcare manager'],
                        'admission_requirements' => ['Professional License or Bachelor']
                    ],
                    [
                        'name' => 'Nursing (Reproductive Health)',
                        'code' => 'NURS_RH_PM2',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 2',
                        'description' => 'Professional Master Nursing - Reproductive Health',
                        'capacity' => 20,
                        'career_prospects' => ['Senior nurse specialist', 'Program director'],
                        'admission_requirements' => ['PM 1 validated']
                    ],
                    [
                        'name' => 'Public Health, Community Health',
                        'code' => 'PH_CH_PM1',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 1',
                        'description' => 'Professional Master Public Health - Community Health',
                        'capacity' => 25,
                        'career_prospects' => ['Public health specialist', 'Community health manager'],
                        'admission_requirements' => ['Professional License or Bachelor']
                    ],
                    [
                        'name' => 'Public Health, Community Health',
                        'code' => 'PH_CH_PM2',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 2',
                        'description' => 'Professional Master Public Health - Community Health',
                        'capacity' => 25,
                        'career_prospects' => ['Senior public health expert', 'Health program director'],
                        'admission_requirements' => ['PM 1 validated']
                    ],
                    [
                        'name' => 'Public Health, Epidemiology',
                        'code' => 'PH_EPI_PM1',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 1',
                        'description' => 'Professional Master Public Health - Epidemiology',
                        'capacity' => 25,
                        'career_prospects' => ['Epidemiologist', 'Disease surveillance specialist'],
                        'admission_requirements' => ['Professional License or Bachelor']
                    ],
                    [
                        'name' => 'Public Health, Epidemiology',
                        'code' => 'PH_EPI_PM2',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 2',
                        'description' => 'Professional Master Public Health - Epidemiology',
                        'capacity' => 25,
                        'career_prospects' => ['Senior epidemiologist', 'Public health researcher'],
                        'admission_requirements' => ['PM 1 validated']
                    ],
                    [
                        'name' => 'Hematology and Serology',
                        'code' => 'HEMA_SERO_PM1',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 1',
                        'description' => 'Professional Master Hematology and Serology',
                        'capacity' => 20,
                        'career_prospects' => ['Hematology specialist', 'Laboratory manager'],
                        'admission_requirements' => ['Professional License or Bachelor']
                    ],
                    [
                        'name' => 'Hematology and Serology',
                        'code' => 'HEMA_SERO_PM2',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 2',
                        'description' => 'Professional Master Hematology and Serology',
                        'capacity' => 20,
                        'career_prospects' => ['Senior hematologist', 'Research specialist'],
                        'admission_requirements' => ['PM 1 validated']
                    ],
                    [
                        'name' => 'Bacteriology and Parasitology',
                        'code' => 'BACT_PARA_PM1',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 1',
                        'description' => 'Professional Master Bacteriology and Parasitology',
                        'capacity' => 20,
                        'career_prospects' => ['Microbiologist', 'Infectious disease specialist'],
                        'admission_requirements' => ['Professional License or Bachelor']
                    ],
                    [
                        'name' => 'Bacteriology and Parasitology',
                        'code' => 'BACT_PARA_PM2',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 2',
                        'description' => 'Professional Master Bacteriology and Parasitology',
                        'capacity' => 20,
                        'career_prospects' => ['Senior microbiologist', 'Research director'],
                        'admission_requirements' => ['PM 1 validated']
                    ],
                    [
                        'name' => 'Public Health, Infectious Disease Control',
                        'code' => 'PH_IDC_PM1',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 1',
                        'description' => 'Professional Master Public Health - Infectious Disease Control',
                        'capacity' => 25,
                        'career_prospects' => ['Disease control specialist', 'Public health manager'],
                        'admission_requirements' => ['Professional License or Bachelor']
                    ],
                    [
                        'name' => 'Public Health, Infectious Disease Control',
                        'code' => 'PH_IDC_PM2',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 2',
                        'description' => 'Professional Master Public Health - Infectious Disease Control',
                        'capacity' => 25,
                        'career_prospects' => ['Senior disease control expert', 'Health policy advisor'],
                        'admission_requirements' => ['PM 1 validated']
                    ],
                    [
                        'name' => 'Clinical Biology, Molecular Medicine',
                        'code' => 'CB_MM_PM1',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 1',
                        'description' => 'Professional Master Clinical Biology - Molecular Medicine',
                        'capacity' => 15,
                        'career_prospects' => ['Molecular biologist', 'Clinical researcher'],
                        'admission_requirements' => ['Professional License or Bachelor', 'Excellent academic record']
                    ],
                    [
                        'name' => 'Clinical Biology, Molecular Medicine',
                        'code' => 'CB_MM_PM2',
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'level_name' => 'Professional Master 2',
                        'description' => 'Professional Master Clinical Biology - Molecular Medicine',
                        'capacity' => 15,
                        'career_prospects' => ['Senior molecular biologist', 'Research director'],
                        'admission_requirements' => ['PM 1 validated']
                    ],
                ];

            case 'ESGIT':
                return [
                    // BTS Informatique (2 ans)
                    [
                        'name' => 'Génie Logiciel',
                        'code' => 'GLOG',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Développement d\'applications et génie logiciel',
                        'capacity' => 45,
                        'career_prospects' => ['Développeur', 'Chef de projet', 'Architecte logiciel'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en mathématiques']
                    ],
                    [
                        'name' => 'Génie Logiciel',
                        'code' => 'GLOG',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Développement d\'applications et génie logiciel',
                        'capacity' => 45,
                        'career_prospects' => ['Développeur', 'Chef de projet', 'Architecte logiciel'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Infographie et Web Design',
                        'code' => 'IWD',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Design web et infographie',
                        'capacity' => 40,
                        'career_prospects' => ['Web designer', 'Infographiste', 'UI/UX designer'],
                        'admission_requirements' => ['Baccalauréat', 'Créativité artistique']
                    ],
                    [
                        'name' => 'Infographie et Web Design',
                        'code' => 'IWD',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Design web et infographie',
                        'capacity' => 40,
                        'career_prospects' => ['Web designer', 'Infographiste', 'UI/UX designer'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Maintenance de Système Informatique',
                        'code' => 'MSI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Maintenance et support informatique',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien maintenance', 'Support IT'],
                        'admission_requirements' => ['Baccalauréat', 'Bases techniques']
                    ],
                    [
                        'name' => 'Maintenance de Système Informatique',
                        'code' => 'MSI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Maintenance et support informatique',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien maintenance', 'Support IT'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Réseaux et Télécommunications',
                        'code' => 'RTEL',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Administration réseaux et télécommunications',
                        'capacity' => 40,
                        'career_prospects' => ['Administrateur réseau', 'Technicien télécoms'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Bases en électronique']
                    ],
                    [
                        'name' => 'Réseaux et Télécommunications',
                        'code' => 'RTEL',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Administration réseaux et télécommunications',
                        'capacity' => 40,
                        'career_prospects' => ['Administrateur réseau', 'Technicien télécoms'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'E-Commerce et Marketing Numérique',
                        'code' => 'CMN',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Commerce électronique et marketing digital',
                        'capacity' => 35,
                        'career_prospects' => ['Responsable e-commerce', 'Digital marketer'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en commerce']
                    ],
                    [
                        'name' => 'E-Commerce et Marketing Numérique',
                        'code' => 'CMN',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Commerce électronique et marketing digital',
                        'capacity' => 35,
                        'career_prospects' => ['Responsable e-commerce', 'Digital marketer'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Informatique Industrielle et Automatisme',
                        'code' => 'IIA',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Informatique appliquée à l\'industrie',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien automatisme', 'Informaticien industriel'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Informatique Industrielle et Automatisme',
                        'code' => 'IIA',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Informatique appliquée à l\'industrie',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien automatisme', 'Informaticien industriel'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],

                    // Licence Pro Informatique
                    [
                        'name' => 'Génie Logiciel',
                        'code' => 'GLOG_LP',
                        'level_type' => 'LICENCE_PRO',
                        'level_name' => 'Licence Pro',
                        'description' => 'Licence professionnelle en génie logiciel',
                        'capacity' => 30,
                        'career_prospects' => ['Développeur senior', 'Chef de projet'],
                        'admission_requirements' => ['BTS Informatique ou équivalent']
                    ],
                    [
                        'name' => 'Ingénierie des Réseaux et Télécommunication',
                        'code' => 'IRT_LP',
                        'level_type' => 'LICENCE_PRO',
                        'level_name' => 'Licence Pro',
                        'description' => 'Licence pro en réseaux et télécoms',
                        'capacity' => 25,
                        'career_prospects' => ['Ingénieur réseau', 'Consultant télécom'],
                        'admission_requirements' => ['BTS Réseaux ou équivalent']
                    ],
                    [
                        'name' => 'Administration et Sécurité des Réseaux',
                        'code' => 'ASR_LP',
                        'level_type' => 'LICENCE_PRO',
                        'level_name' => 'Licence Pro',
                        'description' => 'Licence pro en sécurité informatique',
                        'capacity' => 25,
                        'career_prospects' => ['Expert sécurité', 'Administrateur sécurité'],
                        'admission_requirements' => ['BTS Informatique ou équivalent']
                    ],

                    // Cycle Préparatoire Intégré
                    [
                        'name' => 'Classes Préparatoires Intégrées + Licence Pro Génie Logiciel',
                        'code' => 'CPI_GL',
                        'level_type' => 'CYCLE_PREPA',
                        'level_name' => 'Cycle Prépa 1',
                        'description' => 'Cycle préparatoire pour ingénierie',
                        'capacity' => 35,
                        'career_prospects' => ['Accès cycle ingénieur', 'Licence Pro'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Classes Préparatoires Intégrées + Licence Pro Génie Logiciel',
                        'code' => 'CPI_GL',
                        'level_type' => 'CYCLE_PREPA',
                        'level_name' => 'Cycle Prépa 2',
                        'description' => 'Cycle préparatoire pour ingénierie',
                        'capacity' => 35,
                        'career_prospects' => ['Accès cycle ingénieur', 'Licence Pro'],
                        'admission_requirements' => ['Cycle Prépa 1 validé']
                    ],

                    // Ingénierie Informatique - 3ème année (pour étudiants du cycle prépa)
                    [
                        'name' => 'Intelligence Artificielle & Machine Learning',
                        'code' => 'IA_ING3',
                        'level_type' => 'INGENIERIE',
                        'level_name' => 'INGENIERIE 3',
                        'description' => 'IA et Machine Learning - 3ème année',
                        'capacity' => 25,
                        'career_prospects' => ['Data Scientist', 'Ingénieur IA'],
                        'admission_requirements' => ['Cycle prépa validé']
                    ],
                    [
                        'name' => 'Business Intelligence & Data Science',
                        'code' => 'BI_ING3',
                        'level_type' => 'INGENIERIE',
                        'level_name' => 'INGENIERIE 3',
                        'description' => 'Business Intelligence et Data Science',
                        'capacity' => 25,
                        'career_prospects' => ['Data Analyst', 'Business Intelligence specialist'],
                        'admission_requirements' => ['Cycle prépa validé']
                    ],
                    [
                        'name' => 'Développement Informatique',
                        'code' => 'DEV_ING3',
                        'level_type' => 'INGENIERIE',
                        'level_name' => 'INGENIERIE 3',
                        'description' => 'Développement informatique avancé',
                        'capacity' => 30,
                        'career_prospects' => ['Architecte logiciel', 'Lead developer'],
                        'admission_requirements' => ['Cycle prépa validé']
                    ],
                    [
                        'name' => 'Cyber Sécurité & Cloud Computing',
                        'code' => 'CSCC_ING3',
                        'level_type' => 'INGENIERIE',
                        'level_name' => 'INGENIERIE 3',
                        'description' => 'Cybersécurité et Cloud Computing',
                        'capacity' => 25,
                        'career_prospects' => ['Expert cybersécurité', 'Architecte cloud'],
                        'admission_requirements' => ['Cycle prépa validé']
                    ],

                    // Ingénierie Informatique - 3ème année spéciale (sur concours BTS/DUT)
                    [
                        'name' => 'Intelligence Artificielle & Machine Learning',
                        'code' => 'IA_ING3S',
                        'level_type' => 'INGENIERIE',
                        'level_name' => 'INGENIERIE 3',
                        'description' => 'IA et ML - admission directe 3ème année',
                        'capacity' => 20,
                        'career_prospects' => ['Data Scientist', 'Ingénieur IA'],
                        'admission_requirements' => ['BTS/DUT + concours']
                    ],

                    // 4ème et 5ème année au Maroc
                    [
                        'name' => 'Intelligence Artificielle & Machine Learning',
                        'code' => 'IA_M4',
                        'level_type' => 'INGENIERIE',
                        'level_name' => 'INGENIERIE 4',
                        'description' => 'IA et ML - 4ème année au Maroc',
                        'capacity' => 20,
                        'career_prospects' => ['Ingénieur IA senior', 'Consultant IA'],
                        'admission_requirements' => ['Ingénierie 3 validée']
                    ],
                    [
                        'name' => 'Intelligence Artificielle & Machine Learning',
                        'code' => 'IA_M5',
                        'level_type' => 'INGENIERIE',
                        'level_name' => 'INGENIERIE 5',
                        'description' => 'IA et ML - 5ème année au Maroc',
                        'capacity' => 20,
                        'career_prospects' => ['Expert IA', 'Architecte solutions IA'],
                        'admission_requirements' => ['Ingénierie 4 validée']
                    ]
                ];

            case 'ESJEC':
                return [
                    // BTS Commerce et Gestion (2 ans)
                    [
                        'name' => 'Assistant Judiciaire',
                        'code' => 'AJU',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation d\'assistant judiciaire',
                        'capacity' => 35,
                        'career_prospects' => ['Assistant judiciaire', 'Greffier'],
                        'admission_requirements' => ['Baccalauréat', 'Culture générale']
                    ],
                    [
                        'name' => 'Assistant Judiciaire',
                        'code' => 'AJU',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation d\'assistant judiciaire',
                        'capacity' => 35,
                        'career_prospects' => ['Assistant judiciaire', 'Greffier'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Droit des Affaires et de l\'Entreprise',
                        'code' => 'DAE',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Droit commercial et des affaires',
                        'capacity' => 40,
                        'career_prospects' => ['Juriste d\'entreprise', 'Conseiller juridique'],
                        'admission_requirements' => ['Baccalauréat', 'Culture générale']
                    ],
                    [
                        'name' => 'Droit des Affaires et de l\'Entreprise',
                        'code' => 'DAE',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Droit commercial et des affaires',
                        'capacity' => 40,
                        'career_prospects' => ['Juriste d\'entreprise', 'Conseiller juridique'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Droit Foncier et Domanial',
                        'code' => 'DTF',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Droit foncier et immobilier',
                        'capacity' => 30,
                        'career_prospects' => ['Expert foncier', 'Consultant immobilier'],
                        'admission_requirements' => ['Baccalauréat']
                    ],
                    [
                        'name' => 'Droit Foncier et Domanial',
                        'code' => 'DTF',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Droit foncier et immobilier',
                        'capacity' => 30,
                        'career_prospects' => ['Expert foncier', 'Consultant immobilier'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Douane et Transit',
                        'code' => 'DOT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation en douane et transit',
                        'capacity' => 35,
                        'career_prospects' => ['Agent de douane', 'Transitaire'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en commerce']
                    ],
                    [
                        'name' => 'Douane et Transit',
                        'code' => 'DOT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation en douane et transit',
                        'capacity' => 35,
                        'career_prospects' => ['Agent de douane', 'Transitaire'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Métier de la Bourse',
                        'code' => 'MDB',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation aux métiers de la bourse',
                        'capacity' => 30,
                        'career_prospects' => ['Trader', 'Analyste financier'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en mathématiques']
                    ],
                    [
                        'name' => 'Métier de la Bourse',
                        'code' => 'MDB',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation aux métiers de la bourse',
                        'capacity' => 30,
                        'career_prospects' => ['Trader', 'Analyste financier'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Gestion Fiscale',
                        'code' => 'GFT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation en fiscalité',
                        'capacity' => 35,
                        'career_prospects' => ['Conseiller fiscal', 'Expert comptable'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en comptabilité']
                    ],
                    [
                        'name' => 'Gestion Fiscale',
                        'code' => 'GFT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation en fiscalité',
                        'capacity' => 35,
                        'career_prospects' => ['Conseiller fiscal', 'Expert comptable'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Commerce International',
                        'code' => 'CI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Commerce international et export',
                        'capacity' => 40,
                        'career_prospects' => ['Responsable export', 'Commercial international'],
                        'admission_requirements' => ['Baccalauréat', 'Langues étrangères']
                    ],
                    [
                        'name' => 'Commerce International',
                        'code' => 'CI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Commerce international et export',
                        'capacity' => 40,
                        'career_prospects' => ['Responsable export', 'Commercial international'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Marketing Commerce Vente',
                        'code' => 'MCV',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Marketing et techniques de vente',
                        'capacity' => 40,
                        'career_prospects' => ['Responsable marketing', 'Commercial'],
                        'admission_requirements' => ['Baccalauréat', 'Aptitudes commerciales']
                    ],
                    [
                        'name' => 'Marketing Commerce Vente',
                        'code' => 'MCV',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Marketing et techniques de vente',
                        'capacity' => 40,
                        'career_prospects' => ['Responsable marketing', 'Commercial'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Assistant Manager',
                        'code' => 'AMA',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Formation d\'assistant de direction',
                        'capacity' => 35,
                        'career_prospects' => ['Assistant de direction', 'Coordinateur'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en gestion']
                    ],
                    [
                        'name' => 'Assistant Manager',
                        'code' => 'AMA',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Formation d\'assistant de direction',
                        'capacity' => 35,
                        'career_prospects' => ['Assistant de direction', 'Coordinateur'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Assurance',
                        'code' => 'ASS',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Techniques d\'assurance',
                        'capacity' => 30,
                        'career_prospects' => ['Agent d\'assurance', 'Courtier'],
                        'admission_requirements' => ['Baccalauréat', 'Aptitudes commerciales']
                    ],
                    [
                        'name' => 'Assurance',
                        'code' => 'ASS',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Techniques d\'assurance',
                        'capacity' => 30,
                        'career_prospects' => ['Agent d\'assurance', 'Courtier'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Banque et Finance',
                        'code' => 'BF',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Techniques bancaires et financières',
                        'capacity' => 40,
                        'career_prospects' => ['Conseiller bancaire', 'Analyste financier'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en mathématiques']
                    ],
                    [
                        'name' => 'Banque et Finance',
                        'code' => 'BF',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Techniques bancaires et financières',
                        'capacity' => 40,
                        'career_prospects' => ['Conseiller bancaire', 'Analyste financier'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Comptabilité et Gestion des Entreprises',
                        'code' => 'CGE',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Comptabilité générale et gestion',
                        'capacity' => 45,
                        'career_prospects' => ['Comptable', 'Gestionnaire'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en mathématiques']
                    ],
                    [
                        'name' => 'Comptabilité et Gestion des Entreprises',
                        'code' => 'CGE',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Comptabilité générale et gestion',
                        'capacity' => 45,
                        'career_prospects' => ['Comptable', 'Gestionnaire'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Gestion des ONG',
                        'code' => 'GONG',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Management des organisations',
                        'capacity' => 30,
                        'career_prospects' => ['Gestionnaire ONG', 'Coordinateur projets'],
                        'admission_requirements' => ['Baccalauréat', 'Sensibilité sociale']
                    ],
                    [
                        'name' => 'Gestion des ONG',
                        'code' => 'GONG',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Management des organisations',
                        'capacity' => 30,
                        'career_prospects' => ['Gestionnaire ONG', 'Coordinateur projets'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Gestion des Projets',
                        'code' => 'GP',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Management de projets',
                        'capacity' => 35,
                        'career_prospects' => ['Chef de projet', 'Coordinateur'],
                        'admission_requirements' => ['Baccalauréat', 'Aptitudes organisationnelles']
                    ],
                    [
                        'name' => 'Gestion des Projets',
                        'code' => 'GP',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Management de projets',
                        'capacity' => 35,
                        'career_prospects' => ['Chef de projet', 'Coordinateur'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Gestion des Ressources Humaines',
                        'code' => 'GRH',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Management des ressources humaines',
                        'capacity' => 40,
                        'career_prospects' => ['RH généraliste', 'Chargé de recrutement'],
                        'admission_requirements' => ['Baccalauréat', 'Aptitudes relationnelles']
                    ],
                    [
                        'name' => 'Gestion des Ressources Humaines',
                        'code' => 'GRH',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Management des ressources humaines',
                        'capacity' => 40,
                        'career_prospects' => ['RH généraliste', 'Chargé de recrutement'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Gestion de la Qualité',
                        'code' => 'GSQ',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Management de la qualité',
                        'capacity' => 30,
                        'career_prospects' => ['Responsable qualité', 'Auditeur'],
                        'admission_requirements' => ['Baccalauréat', 'Rigueur méthodologique']
                    ],
                    [
                        'name' => 'Gestion de la Qualité',
                        'code' => 'GSQ',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Management de la qualité',
                        'capacity' => 30,
                        'career_prospects' => ['Responsable qualité', 'Auditeur'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Gestion Logistique et Transport',
                        'code' => 'GLT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Logistique et transport',
                        'capacity' => 35,
                        'career_prospects' => ['Responsable logistique', 'Gestionnaire transport'],
                        'admission_requirements' => ['Baccalauréat', 'Aptitudes organisationnelles']
                    ],
                    [
                        'name' => 'Gestion Logistique et Transport',
                        'code' => 'GLT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Logistique et transport',
                        'capacity' => 35,
                        'career_prospects' => ['Responsable logistique', 'Gestionnaire transport'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Gestion des Systèmes d\'Information',
                        'code' => 'GSI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Systèmes d\'information de gestion',
                        'capacity' => 30,
                        'career_prospects' => ['Administrateur SI', 'Consultant ERP'],
                        'admission_requirements' => ['Baccalauréat', 'Bases informatiques']
                    ],
                    [
                        'name' => 'Gestion des Systèmes d\'Information',
                        'code' => 'GSI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Systèmes d\'information de gestion',
                        'capacity' => 30,
                        'career_prospects' => ['Administrateur SI', 'Consultant ERP'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Management du Sport',
                        'code' => 'MS',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Management des organisations sportives',
                        'capacity' => 25,
                        'career_prospects' => ['Manager sportif', 'Coordinateur événements'],
                        'admission_requirements' => ['Baccalauréat', 'Passion du sport']
                    ],
                    [
                        'name' => 'Management du Sport',
                        'code' => 'MS',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Management des organisations sportives',
                        'capacity' => 25,
                        'career_prospects' => ['Manager sportif', 'Coordinateur événements'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Statistique',
                        'code' => 'STA',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Statistiques appliquées',
                        'capacity' => 30,
                        'career_prospects' => ['Statisticien', 'Analyste de données'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Mathématiques']
                    ],
                    [
                        'name' => 'Statistique',
                        'code' => 'STA',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Statistiques appliquées',
                        'capacity' => 30,
                        'career_prospects' => ['Statisticien', 'Analyste de données'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Microfinance',
                        'code' => 'MIF',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Techniques de microfinance',
                        'capacity' => 30,
                        'career_prospects' => ['Conseiller microfinance', 'Chargé de crédit'],
                        'admission_requirements' => ['Baccalauréat', 'Sensibilité sociale']
                    ],
                    [
                        'name' => 'Microfinance',
                        'code' => 'MIF',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Techniques de microfinance',
                        'capacity' => 30,
                        'career_prospects' => ['Conseiller microfinance', 'Chargé de crédit'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Management Événementiel',
                        'code' => 'MEV',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Organisation d\'événements',
                        'capacity' => 30,
                        'career_prospects' => ['Event manager', 'Coordinateur événements'],
                        'admission_requirements' => ['Baccalauréat', 'Créativité']
                    ],
                    [
                        'name' => 'Management Événementiel',
                        'code' => 'MEV',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Organisation d\'événements',
                        'capacity' => 30,
                        'career_prospects' => ['Event manager', 'Coordinateur événements'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Administration des Collectivités Territoriales',
                        'code' => 'ACT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Administration publique locale',
                        'capacity' => 25,
                        'career_prospects' => ['Fonctionnaire territorial', 'Secrétaire général'],
                        'admission_requirements' => ['Baccalauréat', 'Culture administrative']
                    ],
                    [
                        'name' => 'Administration des Collectivités Territoriales',
                        'code' => 'ACT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Administration publique locale',
                        'capacity' => 25,
                        'career_prospects' => ['Fonctionnaire territorial', 'Secrétaire général'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Fiscalité des Collectivités Territoriales',
                        'code' => 'FCT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Fiscalité locale',
                        'capacity' => 25,
                        'career_prospects' => ['Contrôleur fiscal', 'Conseiller fiscal'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en fiscalité']
                    ],
                    [
                        'name' => 'Fiscalité des Collectivités Territoriales',
                        'code' => 'FCT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Fiscalité locale',
                        'capacity' => 25,
                        'career_prospects' => ['Contrôleur fiscal', 'Conseiller fiscal'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Comptabilité et Finances Publiques',
                        'code' => 'CFP',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Comptabilité publique',
                        'capacity' => 30,
                        'career_prospects' => ['Comptable public', 'Contrôleur finances'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en comptabilité']
                    ],
                    [
                        'name' => 'Comptabilité et Finances Publiques',
                        'code' => 'CFP',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Comptabilité publique',
                        'capacity' => 30,
                        'career_prospects' => ['Comptable public', 'Contrôleur finances'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],

                    // Licence Professionnelle
                    [
                        'name' => 'Banque et Assurance',
                        'code' => 'BA_LP',
                        'level_type' => 'LICENCE_PRO',
                        'level_name' => 'Licence Pro',
                        'description' => 'Licence pro banque assurance',
                        'capacity' => 25,
                        'career_prospects' => ['Conseiller bancaire senior', 'Expert assurance'],
                        'admission_requirements' => ['BTS Commerce ou équivalent']
                    ]
                ];

            case 'ESSIT':
                return [
                    // BTS Génie Civil
                    [
                        'name' => 'Bâtiment',
                        'code' => 'BAT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Techniques du bâtiment',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien BTP', 'Conducteur travaux'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Bâtiment',
                        'code' => 'BAT',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Techniques du bâtiment',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien BTP', 'Conducteur travaux'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Urbanisme',
                        'code' => 'URB',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Aménagement urbain',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien urbanisme', 'Aménageur'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Urbanisme',
                        'code' => 'URB',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Aménagement urbain',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien urbanisme', 'Aménageur'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Travaux Publiques',
                        'code' => 'TP',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Travaux publics et infrastructures',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien TP', 'Chef de chantier'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Travaux Publiques',
                        'code' => 'TP',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Travaux publics et infrastructures',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien TP', 'Chef de chantier'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Installation Sanitaire',
                        'code' => 'INSAN',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Plomberie et installations sanitaires',
                        'capacity' => 25,
                        'career_prospects' => ['Technicien sanitaire', 'Installateur'],
                        'admission_requirements' => ['Baccalauréat technique']
                    ],
                    [
                        'name' => 'Installation Sanitaire',
                        'code' => 'INSAN',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Plomberie et installations sanitaires',
                        'capacity' => 25,
                        'career_prospects' => ['Technicien sanitaire', 'Installateur'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Géomètre Topographe',
                        'code' => 'GEOTOP',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Topographie et géométrie',
                        'capacity' => 30,
                        'career_prospects' => ['Géomètre', 'Topographe'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Mathématiques']
                    ],
                    [
                        'name' => 'Géomètre Topographe',
                        'code' => 'GEOTOP',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Topographie et géométrie',
                        'capacity' => 30,
                        'career_prospects' => ['Géomètre', 'Topographe'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Menuiserie et Ébénisterie',
                        'code' => 'MENEB',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Travail du bois et ameublement',
                        'capacity' => 25,
                        'career_prospects' => ['Menuisier', 'Ébéniste'],
                        'admission_requirements' => ['Baccalauréat technique']
                    ],
                    [
                        'name' => 'Menuiserie et Ébénisterie',
                        'code' => 'MENEB',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Travail du bois et ameublement',
                        'capacity' => 25,
                        'career_prospects' => ['Menuisier', 'Ébéniste'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Géotechnique et Géologie Appliquée',
                        'code' => 'GEOGEO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Géotechnique et géologie',
                        'capacity' => 30,
                        'career_prospects' => ['Géotechnicien', 'Géologue'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Géotechnique et Géologie Appliquée',
                        'code' => 'GEOGEO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Géotechnique et géologie',
                        'capacity' => 30,
                        'career_prospects' => ['Géotechnicien', 'Géologue'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],

                    // BTS Génie Électrique
                    [
                        'name' => 'Électrotechnique',
                        'code' => 'ELEC',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Électricité et électrotechnique',
                        'capacity' => 35,
                        'career_prospects' => ['Électrotechnicien', 'Installateur électrique'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Électrotechnique',
                        'code' => 'ELEC',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Électricité et électrotechnique',
                        'capacity' => 35,
                        'career_prospects' => ['Électrotechnicien', 'Installateur électrique'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Énergies Renouvelables',
                        'code' => 'ENREN',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Technologies des énergies renouvelables',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien énergies renouvelables', 'Installateur solaire'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Énergies Renouvelables',
                        'code' => 'ENREN',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Technologies des énergies renouvelables',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien énergies renouvelables', 'Installateur solaire'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Maintenance des Appareils Biomédicaux',
                        'code' => 'MAB',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Maintenance équipements médicaux',
                        'capacity' => 25,
                        'career_prospects' => ['Technicien biomédical', 'Mainteneur hospitalier'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Maintenance des Appareils Biomédicaux',
                        'code' => 'MAB',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Maintenance équipements médicaux',
                        'capacity' => 25,
                        'career_prospects' => ['Technicien biomédical', 'Mainteneur hospitalier'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Maintenance des Systèmes Électroniques',
                        'code' => 'MSE',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Maintenance électronique',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien électronique', 'Réparateur'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Maintenance des Systèmes Électroniques',
                        'code' => 'MSE',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Maintenance électronique',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien électronique', 'Réparateur'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Contrôle, Instrumentalisation et Régulation',
                        'code' => 'CIR',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Systèmes de contrôle automatisés',
                        'capacity' => 25,
                        'career_prospects' => ['Technicien instrumentation', 'Automaticien'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Contrôle, Instrumentalisation et Régulation',
                        'code' => 'CIR',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Systèmes de contrôle automatisés',
                        'capacity' => 25,
                        'career_prospects' => ['Technicien instrumentation', 'Automaticien'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],

                    // BTS Génie Mécanique et Productique
                    [
                        'name' => 'Mécanique et Électronique Automobiles (Mécatronique)',
                        'code' => 'MEA_MEC',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Mécatronique automobile',
                        'capacity' => 35,
                        'career_prospects' => ['Mécanicien auto', 'Technicien mécatronique'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Mécanique et Électronique Automobiles (Mécatronique)',
                        'code' => 'MEA_MEC',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Mécatronique automobile',
                        'capacity' => 35,
                        'career_prospects' => ['Mécanicien auto', 'Technicien mécatronique'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Mécanique et Électronique Automobiles (Maintenance Après-vente)',
                        'code' => 'MEA_MAV',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Maintenance après-vente automobile',
                        'capacity' => 35,
                        'career_prospects' => ['Chef d\'atelier', 'Conseiller technique'],
                        'admission_requirements' => ['Baccalauréat technique']
                    ],
                    [
                        'name' => 'Mécanique et Électronique Automobiles (Maintenance Après-vente)',
                        'code' => 'MEA_MAV',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Maintenance après-vente automobile',
                        'capacity' => 35,
                        'career_prospects' => ['Chef d\'atelier', 'Conseiller technique'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Construction et Fabrication Mécanique (Fabrication)',
                        'code' => 'CFM_FAB',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Fabrication mécanique',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien fabrication', 'Usineur'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Construction et Fabrication Mécanique (Fabrication)',
                        'code' => 'CFM_FAB',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Fabrication mécanique',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien fabrication', 'Usineur'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Construction et Fabrication Mécanique (Construction)',
                        'code' => 'CFM_CON',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Construction mécanique',
                        'capacity' => 30,
                        'career_prospects' => ['Dessinateur industriel', 'Technicien BE'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Construction et Fabrication Mécanique (Construction)',
                        'code' => 'CFM_CON',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Construction mécanique',
                        'capacity' => 30,
                        'career_prospects' => ['Dessinateur industriel', 'Technicien BE'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Construction Métallique',
                        'code' => 'CONMET',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Structures métalliques',
                        'capacity' => 25,
                        'career_prospects' => ['Charpentier métallique', 'Soudeur'],
                        'admission_requirements' => ['Baccalauréat technique']
                    ],
                    [
                        'name' => 'Construction Métallique',
                        'code' => 'CONMET',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Structures métalliques',
                        'capacity' => 25,
                        'career_prospects' => ['Charpentier métallique', 'Soudeur'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Chaudronnerie et Soudure',
                        'code' => 'CHS',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Chaudronnerie et techniques de soudage',
                        'capacity' => 25,
                        'career_prospects' => ['Chaudronnier', 'Soudeur spécialisé'],
                        'admission_requirements' => ['Baccalauréat technique']
                    ],
                    [
                        'name' => 'Chaudronnerie et Soudure',
                        'code' => 'CHS',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Chaudronnerie et techniques de soudage',
                        'capacity' => 25,
                        'career_prospects' => ['Chaudronnier', 'Soudeur spécialisé'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Maintenance des Systèmes Industriels (Maintenance Industrielle)',
                        'code' => 'MSI_MI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Maintenance industrielle et productive',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien maintenance', 'Responsable maintenance'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Maintenance des Systèmes Industriels (Maintenance Industrielle)',
                        'code' => 'MSI_MI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Maintenance industrielle et productive',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien maintenance', 'Responsable maintenance'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],

                    // BTS Agriculture et Élevage
                    [
                        'name' => 'Aquaculture',
                        'code' => 'AQUA',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Élevage aquatique',
                        'capacity' => 25,
                        'career_prospects' => ['Aquaculteur', 'Technicien pisciculture'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en biologie']
                    ],
                    [
                        'name' => 'Aquaculture',
                        'code' => 'AQUA',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Élevage aquatique',
                        'capacity' => 25,
                        'career_prospects' => ['Aquaculteur', 'Technicien pisciculture'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Agroéquipement',
                        'code' => 'AGROEQ',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Équipements agricoles',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien machinisme', 'Conseiller équipement'],
                        'admission_requirements' => ['Baccalauréat technique']
                    ],
                    [
                        'name' => 'Agroéquipement',
                        'code' => 'AGROEQ',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Équipements agricoles',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien machinisme', 'Conseiller équipement'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Production Végétale',
                        'code' => 'PRODVEG',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Techniques de production végétale',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien agricole', 'Conseiller cultures'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en biologie']
                    ],
                    [
                        'name' => 'Production Végétale',
                        'code' => 'PRODVEG',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Techniques de production végétale',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien agricole', 'Conseiller cultures'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Production Animale',
                        'code' => 'PRODANI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Techniques d\'élevage',
                        'capacity' => 35,
                        'career_prospects' => ['Éleveur', 'Conseiller élevage'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en biologie']
                    ],
                    [
                        'name' => 'Production Animale',
                        'code' => 'PRODANI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Techniques d\'élevage',
                        'capacity' => 35,
                        'career_prospects' => ['Éleveur', 'Conseiller élevage'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Conseiller Agropastoral',
                        'code' => 'CONSAGRO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Conseil en agriculture et élevage',
                        'capacity' => 30,
                        'career_prospects' => ['Conseiller agricole', 'Vulgarisateur'],
                        'admission_requirements' => ['Baccalauréat', 'Aptitudes communication']
                    ],
                    [
                        'name' => 'Conseiller Agropastoral',
                        'code' => 'CONSAGRO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Conseil en agriculture et élevage',
                        'capacity' => 30,
                        'career_prospects' => ['Conseiller agricole', 'Vulgarisateur'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Entrepreneuriat Agropastoral',
                        'code' => 'ENTRAGRO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Création d\'entreprises agricoles',
                        'capacity' => 25,
                        'career_prospects' => ['Entrepreneur agricole', 'Promoteur rural'],
                        'admission_requirements' => ['Baccalauréat', 'Esprit entrepreneurial']
                    ],
                    [
                        'name' => 'Entrepreneuriat Agropastoral',
                        'code' => 'ENTRAGRO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Création d\'entreprises agricoles',
                        'capacity' => 25,
                        'career_prospects' => ['Entrepreneur agricole', 'Promoteur rural'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Technique Commerciale Agricole',
                        'code' => 'TCA',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Commercialisation des produits agricoles',
                        'capacity' => 30,
                        'career_prospects' => ['Commercial agricole', 'Responsable vente'],
                        'admission_requirements' => ['Baccalauréat', 'Aptitudes commerciales']
                    ],
                    [
                        'name' => 'Technique Commerciale Agricole',
                        'code' => 'TCA',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Commercialisation des produits agricoles',
                        'capacity' => 30,
                        'career_prospects' => ['Commercial agricole', 'Responsable vente'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],

                    // BTS Génie Biologique
                    [
                        'name' => 'Diététique',
                        'code' => 'DIET',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Nutrition et diététique',
                        'capacity' => 30,
                        'career_prospects' => ['Diététicien', 'Nutritionniste'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Diététique',
                        'code' => 'DIET',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Nutrition et diététique',
                        'capacity' => 30,
                        'career_prospects' => ['Diététicien', 'Nutritionniste'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Industries Alimentaires',
                        'code' => 'INDALI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Transformation agroalimentaire',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien agroalimentaire', 'Contrôleur qualité'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Industries Alimentaires',
                        'code' => 'INDALI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Transformation agroalimentaire',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien agroalimentaire', 'Contrôleur qualité'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Biotechnologie Agricole',
                        'code' => 'BIOAGRI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Biotechnologies appliquées à l\'agriculture',
                        'capacity' => 25,
                        'career_prospects' => ['Technicien biotechnologie', 'Chercheur assistant'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Excellent niveau bio']
                    ],
                    [
                        'name' => 'Biotechnologie Agricole',
                        'code' => 'BIOAGRI',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Biotechnologies appliquées à l\'agriculture',
                        'capacity' => 25,
                        'career_prospects' => ['Technicien biotechnologie', 'Chercheur assistant'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Phytothérapie et Aromathérapie',
                        'code' => 'PHYTO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Médecine par les plantes',
                        'capacity' => 25,
                        'career_prospects' => ['Phytothérapeute', 'Herboriste'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Bases en chimie']
                    ],
                    [
                        'name' => 'Phytothérapie et Aromathérapie',
                        'code' => 'PHYTO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Médecine par les plantes',
                        'capacity' => 25,
                        'career_prospects' => ['Phytothérapeute', 'Herboriste'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],

                    // BTS Génie Géologique et Pétrolier
                    [
                        'name' => 'Ingénierie Pétrolière',
                        'code' => 'INGPET',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Techniques pétrolières',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien pétrolier', 'Foreur'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Excellent niveau physique']
                    ],
                    [
                        'name' => 'Ingénierie Pétrolière',
                        'code' => 'INGPET',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Techniques pétrolières',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien pétrolier', 'Foreur'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Mines et Géologie Appliquée',
                        'code' => 'MINGEO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Exploitation minière et géologie',
                        'capacity' => 25,
                        'career_prospects' => ['Technicien minier', 'Géologue'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Mines et Géologie Appliquée',
                        'code' => 'MINGEO',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Exploitation minière et géologie',
                        'capacity' => 25,
                        'career_prospects' => ['Technicien minier', 'Géologue'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],

                    // BTS Fabrication Mécaniques
                    [
                        'name' => 'Fabrication Mécanique',
                        'code' => 'FABMEC',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Fabrication de pièces mécaniques',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien fabrication', 'Opérateur CNC'],
                        'admission_requirements' => ['Baccalauréat technique']
                    ],
                    [
                        'name' => 'Fabrication Mécanique',
                        'code' => 'FABMEC',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Fabrication de pièces mécaniques',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien fabrication', 'Opérateur CNC'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Construction Mécanique',
                        'code' => 'CONMEC',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Conception mécanique',
                        'capacity' => 30,
                        'career_prospects' => ['Dessinateur industriel', 'Technicien BE'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Construction Mécanique',
                        'code' => 'CONMEC',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Conception mécanique',
                        'capacity' => 30,
                        'career_prospects' => ['Dessinateur industriel', 'Technicien BE'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Construction Mécanique',
                        'code' => 'CONMEC',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Conception mécanique',
                        'capacity' => 30,
                        'career_prospects' => ['Dessinateur industriel', 'Technicien BE'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],

                    // BTS Informatique et Communication
                    [
                        'name' => 'Journalisme',
                        'code' => 'JOURN',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Techniques journalistiques',
                        'capacity' => 30,
                        'career_prospects' => ['Journaliste', 'Reporter'],
                        'admission_requirements' => ['Baccalauréat', 'Culture générale', 'Expression écrite']
                    ],
                    [
                        'name' => 'Journalisme',
                        'code' => 'JOURN',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Techniques journalistiques',
                        'capacity' => 30,
                        'career_prospects' => ['Journaliste', 'Reporter'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],
                    [
                        'name' => 'Communication des Organisations',
                        'code' => 'COMORG',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 1',
                        'description' => 'Communication d\'entreprise',
                        'capacity' => 35,
                        'career_prospects' => ['Chargé de communication', 'Attaché de presse'],
                        'admission_requirements' => ['Baccalauréat', 'Aptitudes rédactionnelles']
                    ],
                    [
                        'name' => 'Communication des Organisations',
                        'code' => 'COMORG',
                        'level_type' => 'BTS',
                        'level_name' => 'BTS 2',
                        'description' => 'Communication d\'entreprise',
                        'capacity' => 35,
                        'career_prospects' => ['Chargé de communication', 'Attaché de presse'],
                        'admission_requirements' => ['BTS 1 validé']
                    ],

                    // Cycle Préparatoire Polytechnicien
                    [
                        'name' => 'Mécatronique',
                        'code' => 'MEC_CP1',
                        'level_type' => 'CYCLE_PREPA',
                        'level_name' => 'Cycle Prépa 1',
                        'description' => 'Préparation ingénierie mécatronique',
                        'capacity' => 30,
                        'career_prospects' => ['Accès cycle ingénieur'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Excellent niveau']
                    ],
                    [
                        'name' => 'Mécatronique',
                        'code' => 'MEC_CP2',
                        'level_type' => 'CYCLE_PREPA',
                        'level_name' => 'Cycle Prépa 2',
                        'description' => 'Préparation ingénierie mécatronique',
                        'capacity' => 30,
                        'career_prospects' => ['Accès cycle ingénieur'],
                        'admission_requirements' => ['Cycle Prépa 1 validé']
                    ],
                    [
                        'name' => 'Ingénierie De L\'énergie Electrique',
                        'code' => 'IEE_CP1',
                        'level_type' => 'CYCLE_PREPA',
                        'level_name' => 'Cycle Prépa 1',
                        'description' => 'Préparation ingénierie électrique',
                        'capacity' => 25,
                        'career_prospects' => ['Accès cycle ingénieur'],
                        'admission_requirements' => ['Baccalauréat scientifique', 'Excellent niveau physique']
                    ],
                    [
                        'name' => 'Ingénierie De L\'énergie Electrique',
                        'code' => 'IEE_CP2',
                        'level_type' => 'CYCLE_PREPA',
                        'level_name' => 'Cycle Prépa 2',
                        'description' => 'Préparation ingénierie électrique',
                        'capacity' => 25,
                        'career_prospects' => ['Accès cycle ingénieur'],
                        'admission_requirements' => ['Cycle Prépa 1 validé']
                    ],
                    [
                        'name' => 'Bâtiment Et Construction Industrielles',
                        'code' => 'BCI_CP1',
                        'level_type' => 'CYCLE_PREPA',
                        'level_name' => 'Cycle Prépa 1',
                        'description' => 'Préparation ingénierie BTP',
                        'capacity' => 30,
                        'career_prospects' => ['Accès cycle ingénieur'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Bâtiment Et Construction Industrielles',
                        'code' => 'BCI_CP2',
                        'level_type' => 'CYCLE_PREPA',
                        'level_name' => 'Cycle Prépa 2',
                        'description' => 'Préparation ingénierie BTP',
                        'capacity' => 30,
                        'career_prospects' => ['Accès cycle ingénieur'],
                        'admission_requirements' => ['Cycle Prépa 1 validé']
                    ],

                    // Cycle Ingénierie (Niveaux 3, 4, 5)
                    [
                        'name' => 'Toutes les Spécialités',
                        'code' => 'ALL_ING3',
                        'level_type' => 'INGENIERIE',
                        'level_name' => 'INGENIERIE 3',
                        'description' => '3ème année d\'ingénierie',
                        'capacity' => 50,
                        'career_prospects' => ['Ingénieur junior'],
                        'admission_requirements' => ['Cycle prépa validé ou concours']
                    ],
                    [
                        'name' => 'Toutes les Spécialités',
                        'code' => 'ALL_ING4',
                        'level_type' => 'INGENIERIE',
                        'level_name' => 'INGENIERIE 4',
                        'description' => '4ème année d\'ingénierie',
                        'capacity' => 50,
                        'career_prospects' => ['Ingénieur confirmé'],
                        'admission_requirements' => ['Ingénierie 3 validée']
                    ],
                    [
                        'name' => 'Toutes les Spécialités',
                        'code' => 'ALL_ING5',
                        'level_type' => 'INGENIERIE',
                        'level_name' => 'INGENIERIE 5',
                        'description' => '5ème année d\'ingénierie',
                        'capacity' => 50,
                        'career_prospects' => ['Ingénieur expert', 'Chef de projet'],
                        'admission_requirements' => ['Ingénierie 4 validée']
                    ]
                ];

            case 'ISTMS':
                return [
                    // TMS (3 ans)
                    [
                        'name' => 'Analyses Médicales',
                        'code' => 'AMED_TMS',
                        'level_type' => 'TMS',
                        'level_name' => 'TMS 1',
                        'description' => 'Techniques médico-sanitaires en analyses',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien laboratoire', 'Assistant médical'],
                        'admission_requirements' => ['Baccalauréat scientifique']
                    ],
                    [
                        'name' => 'Analyses Médicales',
                        'code' => 'AMED_TMS',
                        'level_type' => 'TMS',
                        'level_name' => 'TMS 2',
                        'description' => 'Techniques médico-sanitaires en analyses',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien laboratoire', 'Assistant médical'],
                        'admission_requirements' => ['TMS 1 validé']
                    ],
                    [
                        'name' => 'Analyses Médicales',
                        'code' => 'AMED_TMS',
                        'level_type' => 'TMS',
                        'level_name' => 'TMS 3',
                        'description' => 'Techniques médico-sanitaires en analyses',
                        'capacity' => 35,
                        'career_prospects' => ['Technicien laboratoire', 'Assistant médical'],
                        'admission_requirements' => ['TMS 2 validé']
                    ]
                ];

            case 'ISTPM':
                return [
                    // CQP (1 an)
                    [
                        'name' => 'Technicien Adjoint de Laboratoire / Aide Chimiste Biologiste',
                        'code' => 'TALACB',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Formation d\'assistant de laboratoire',
                        'capacity' => 25,
                        'career_prospects' => ['Assistant laboratoire', 'Aide chimiste'],
                        'admission_requirements' => ['Niveau BEPC', 'Bases en sciences']
                    ],
                    [
                        'name' => 'Auxiliaire de Puériculture (Assistant de Maternité)',
                        'code' => 'AUXPUER',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Soins aux enfants',
                        'capacity' => 30,
                        'career_prospects' => ['Auxiliaire puériculture', 'Assistant maternité'],
                        'admission_requirements' => ['Niveau BEPC', 'Certificat médical']
                    ],
                    [
                        'name' => 'Assistant en Cabinet Médical (Aide-Soignant)',
                        'code' => 'ACMAS',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Assistance en cabinet médical',
                        'capacity' => 30,
                        'career_prospects' => ['Aide-soignant', 'Assistant médical'],
                        'admission_requirements' => ['Niveau BEPC', 'Certificat médical']
                    ],
                    [
                        'name' => 'Auxiliaire de Vie',
                        'code' => 'AUXVIE',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Accompagnement personnes âgées',
                        'capacity' => 25,
                        'career_prospects' => ['Auxiliaire de vie', 'Aide à domicile'],
                        'admission_requirements' => ['Niveau BEPC', 'Sensibilité sociale']
                    ],
                    [
                        'name' => 'Massothérapie (Kinésithérapie)',
                        'code' => 'MASSOKINE',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Techniques de massage thérapeutique',
                        'capacity' => 20,
                        'career_prospects' => ['Masseur', 'Kinésithérapeute assistant'],
                        'admission_requirements' => ['Niveau BEPC', 'Formation courte']
                    ],
                    [
                        'name' => 'Développement d\'Application',
                        'code' => 'DEVAPP',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Développement d\'applications simples',
                        'capacity' => 25,
                        'career_prospects' => ['Développeur junior', 'Programmeur'],
                        'admission_requirements' => ['Niveau BEPC', 'Bases informatiques']
                    ],
                    [
                        'name' => 'Maintenance Informatique',
                        'code' => 'MAINTINFO',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Maintenance matériel informatique',
                        'capacity' => 30,
                        'career_prospects' => ['Technicien maintenance', 'Réparateur PC'],
                        'admission_requirements' => ['Niveau BEPC', 'Bases techniques']
                    ],
                    [
                        'name' => 'Web Master',
                        'code' => 'WEBMAST',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Gestion de sites web',
                        'capacity' => 25,
                        'career_prospects' => ['Webmaster', 'Gestionnaire web'],
                        'admission_requirements' => ['Niveau BEPC', 'Bases web']
                    ],
                    [
                        'name' => 'Graphisme de Production',
                        'code' => 'GRAPHPROD',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Création graphique',
                        'capacity' => 20,
                        'career_prospects' => ['Graphiste', 'Designer'],
                        'admission_requirements' => ['Niveau BEPC', 'Créativité artistique']
                    ],
                    [
                        'name' => 'Infographie',
                        'code' => 'INFOGRAPH',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Infographie et design numérique',
                        'capacity' => 25,
                        'career_prospects' => ['Infographiste', 'Designer numérique'],
                        'admission_requirements' => ['Niveau BEPC', 'Créativité']
                    ],
                    [
                        'name' => 'Comptabilité Informatisé et Gestion',
                        'code' => 'COMPGEST',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Comptabilité avec logiciels',
                        'capacity' => 30,
                        'career_prospects' => ['Assistant comptable', 'Gestionnaire'],
                        'admission_requirements' => ['Niveau BEPC', 'Bases mathématiques']
                    ],
                    [
                        'name' => 'Secrétariat Comptable',
                        'code' => 'SECCOMP',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Secrétariat spécialisé comptabilité',
                        'capacity' => 25,
                        'career_prospects' => ['Secrétaire comptable', 'Assistant administratif'],
                        'admission_requirements' => ['Niveau BEPC', 'Bases bureautiques']
                    ],
                    [
                        'name' => 'Secrétariat Bureautique',
                        'code' => 'SECBUR',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Secrétariat et bureautique',
                        'capacity' => 30,
                        'career_prospects' => ['Secrétaire', 'Assistant administratif'],
                        'admission_requirements' => ['Niveau BEPC', 'Maîtrise bureautique']
                    ],
                    [
                        'name' => 'Douane et Transit',
                        'code' => 'DOUTRANS',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Procédures douanières',
                        'capacity' => 25,
                        'career_prospects' => ['Agent douanier', 'Transitaire'],
                        'admission_requirements' => ['Niveau BEPC', 'Bases commerce']
                    ],
                    [
                        'name' => 'Déclarant en Douane',
                        'code' => 'DECLDOU',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Déclarations douanières',
                        'capacity' => 20,
                        'career_prospects' => ['Déclarant douanier', 'Commissionnaire'],
                        'admission_requirements' => ['Niveau BEPC', 'Rigueur administrative']
                    ],
                    [
                        'name' => 'Marketing Digital',
                        'code' => 'MARKDIG',
                        'level_type' => 'CQP',
                        'level_name' => 'CQP',
                        'description' => 'Marketing numérique',
                        'capacity' => 25,
                        'career_prospects' => ['Community manager', 'Digital marketer'],
                        'admission_requirements' => ['Niveau BEPC', 'Bases web et réseaux sociaux']
                    ],

                    // DQP (1 an)
                    [
                        'name' => 'Délégué Médical',
                        'code' => 'DELMED',
                        'level_type' => 'DQP',
                        'level_name' => 'DQP',
                        'description' => 'Promotion médicale et pharmaceutique',
                        'capacity' => 25,
                        'career_prospects' => ['Délégué médical', 'Visiteur médical'],
                        'admission_requirements' => ['Baccalauréat', 'Aptitudes commerciales']
                    ],
                    [
                        'name' => 'Vendeur en Pharmacie',
                        'code' => 'VENDPHAR',
                        'level_type' => 'DQP',
                        'level_name' => 'DQP',
                        'description' => 'Vente en officine pharmaceutique',
                        'capacity' => 30,
                        'career_prospects' => ['Vendeur pharmacie', 'Assistant pharmacien'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en santé']
                    ],
                    [
                        'name' => 'Secrétariat Médical',
                        'code' => 'SECMED',
                        'level_type' => 'DQP',
                        'level_name' => 'DQP',
                        'description' => 'Secrétariat médical spécialisé',
                        'capacity' => 25,
                        'career_prospects' => ['Secrétaire médical', 'Assistant cabinet médical'],
                        'admission_requirements' => ['Baccalauréat', 'Terminologie médicale']
                    ],
                    [
                        'name' => 'Maintenance Réseaux',
                        'code' => 'MAINTRES',
                        'level_type' => 'DQP',
                        'level_name' => 'DQP',
                        'description' => 'Maintenance infrastructure réseau',
                        'capacity' => 25,
                        'career_prospects' => ['Technicien réseau', 'Support technique'],
                        'admission_requirements' => ['Baccalauréat', 'Bases en réseaux']
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
                    ? ['projecteur', 'tableau blanc', 'lits médicaux', 'mannequins']
                    : ['équipements de laboratoire', 'microscopes', 'tableau blanc', 'centrifugeuse'];
            case 'ESGIT':
                return $groupNumber == 1
                    ? ['ordinateurs', 'projecteur', 'tableau interactif', 'logiciels développement']
                    : ['serveurs', 'routeurs', 'switches', 'câblage réseau'];
            case 'ESJEC':
                return ['projecteur', 'tableau blanc', 'bibliothèque juridique', 'codes juridiques'];
            case 'ESSIT':
                return $groupNumber == 1
                    ? ['projecteur', 'tableau blanc', 'outils de mesure', 'plans techniques']
                    : ['machines-outils', 'bancs d\'essai', 'équipements sécurité'];
            case 'ISTMS':
                return ['équipements médicaux', 'tableau blanc', 'mannequins simulation', 'trousse premiers secours'];
            case 'ISTPM':
                return ['ordinateurs', 'tableau blanc', 'imprimantes', 'logiciels bureautiques'];
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
                            $amount = $this->getAmountForTranche($tranche->name, $feeData, $school->code, $feeData['level_type']);
                            if ($amount > 0) {
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
    }

    private function getFeesForSchool($schoolCode)
    {
        switch ($schoolCode) {
            case 'INSSAS':
                return [
                    // BTS Santé (2 ans)
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'SINF',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500, // 6 rames
                        'first_installment' => 200000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 500000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse, Wifi, Accès laboratoires'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'SAGE',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 200000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 500000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse, Wifi, Accès laboratoires'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'TLAM',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 250000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 550000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse, Wifi, Accès laboratoires'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'KINE',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 250000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 550000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse'
                    ],
                    // Licence Aca (3 ans)
                    [
                        'level_type' => 'LICENCE_ACA',
                        'speciality' => 'BIOMED',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 300000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 600000,
                        'duration_years' => 3,
                        'included_benefits' => 'Formation académique complète'
                    ],
                    // Licence Pro (BTS+1)
                    [
                        'level_type' => 'LICENCE_PRO',
                        'speciality' => 'SINF_LP',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 50000,
                        'rames_papier' => 22500,
                        'tutelle_universitaire' => 50000,
                        'first_installment' => 300000,
                        'second_installment' => 250000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 700000,
                        'duration_years' => 1,
                        'included_benefits' => 'Certification professionnelle'
                    ],
                    // Double Diplomation (3 ans)
                    [
                        'level_type' => 'DOUBLE_DIPLOMATION',
                        'speciality' => 'SINF_DD',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'tutelle_universitaire' => 50000,
                        'etablissement_diplome' => 15000, // Seulement en 3ème année
                        'first_installment' => 400000,
                        'second_installment' => 200000,
                        'third_installment' => 100000,
                        'total_annual_fee' => 700000,
                        'duration_years' => 3,
                        'included_benefits' => 'Double certification BTS + Licence Pro'
                    ],
                    // Master (2 ans)
                    [
                        'level_type' => 'MASTER',
                        'speciality' => 'BIOMED_M1',
                        'inscription_fee' => 150000,
                        'rames_papier' => 0,
                        'first_installment' => 350000,
                        'second_installment' => 350000,
                        'third_installment' => 200000,
                        'total_annual_fee' => 900000,
                        'duration_years' => 2,
                        'included_benefits' => 'Recherche et spécialisation'
                    ],
                    // Health HND (3 ans) - Section anglophone
                    [
                        'level_type' => 'HND',
                        'speciality' => 'NURS_HND',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 200000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 500000,
                        'duration_years' => 3,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse, Wifi, AccÃ¨s laboratoires'
                    ],
                    [
                        'level_type' => 'HND',
                        'speciality' => 'MIDW_HND',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 200000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 500000,
                        'duration_years' => 3,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse, Wifi, AccÃ¨s laboratoires'
                    ],
                    [
                        'level_type' => 'HND',
                        'speciality' => 'MLS_HND',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 250000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 550000,
                        'duration_years' => 3,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse, Wifi, AccÃ¨s laboratoires'
                    ],
                    [
                        'level_type' => 'HND',
                        'speciality' => 'PHYSIO_HND',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 250000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 550000,
                        'duration_years' => 3,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse'
                    ],
                    [
                        'level_type' => 'HND',
                        'speciality' => 'PST_HND',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 250000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 550000,
                        'duration_years' => 3,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse'
                    ],
                    [
                        'level_type' => 'HND',
                        'speciality' => 'MIR_HND',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 250000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 550000,
                        'duration_years' => 3,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse'
                    ],
                    [
                        'level_type' => 'HND',
                        'speciality' => 'ODONTO_HND_EN',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 250000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 550000,
                        'duration_years' => 3,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse'
                    ],
                    [
                        'level_type' => 'HND',
                        'speciality' => 'OPT_HND_EN',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 250000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 550000,
                        'duration_years' => 3,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse'
                    ],
                    [
                        'level_type' => 'HND',
                        'speciality' => 'ULTRA_HND',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 250000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 550000,
                        'duration_years' => 3,
                        'included_benefits' => 'Laptop offert + 150000 FCFA bourse'
                    ],

                    // Professional License BAC+3 (3 ans) - Section anglophone
                    [
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'speciality' => 'BIOMED_PL',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 300000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 600000,
                        'duration_years' => 3,
                        'included_benefits' => 'Formation acadÃ©mique complÃ¨te'
                    ],
                    [
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'speciality' => 'NURS_PL',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 300000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 600000,
                        'duration_years' => 3,
                        'included_benefits' => 'Formation acadÃ©mique complÃ¨te'
                    ],
                    [
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'speciality' => 'MIDW_PL',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 300000,
                        'second_installment' => 150000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 600000,
                        'duration_years' => 3,
                        'included_benefits' => 'Formation acadÃ©mique complÃ¨te'
                    ],

                    // Professional License (HND+1) - Section anglophone
                    [
                        'level_type' => 'LICENCE_PRO',
                        'speciality' => 'NURS_PL_PRO',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 50000,
                        'rames_papier' => 22500,
                        'tutelle_universitaire' => 50000,
                        'first_installment' => 300000,
                        'second_installment' => 250000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 700000,
                        'duration_years' => 1,
                        'included_benefits' => 'Certification professionnelle'
                    ],
                    [
                        'level_type' => 'LICENCE_PRO',
                        'speciality' => 'MIDW_PL_PRO',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 50000,
                        'rames_papier' => 22500,
                        'tutelle_universitaire' => 50000,
                        'first_installment' => 300000,
                        'second_installment' => 250000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 700000,
                        'duration_years' => 1,
                        'included_benefits' => 'Certification professionnelle'
                    ],
                    [
                        'level_type' => 'LICENCE_PRO',
                        'speciality' => 'MLS_PL_PRO',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 50000,
                        'rames_papier' => 22500,
                        'tutelle_universitaire' => 50000,
                        'first_installment' => 300000,
                        'second_installment' => 250000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 700000,
                        'duration_years' => 1,
                        'included_benefits' => 'Certification professionnelle'
                    ],

                    // Bachelor (HND+1) - Section anglophone
                    [
                        'level_type' => 'BACHELOR',
                        'speciality' => 'NURS_BACH',
                        'inscription_fee' => 50000,
                        'rames_papier' => 22500,
                        'tutelle_universitaire' => 50000,
                        'first_installment' => 300000,
                        'second_installment' => 250000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 700000,
                        'duration_years' => 1,
                        'included_benefits' => 'Certification bachelor'
                    ],
                    [
                        'level_type' => 'BACHELOR',
                        'speciality' => 'MIDW_BACH',
                        'inscription_fee' => 50000,
                        'rames_papier' => 22500,
                        'tutelle_universitaire' => 50000,
                        'first_installment' => 300000,
                        'second_installment' => 250000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 700000,
                        'duration_years' => 1,
                        'included_benefits' => 'Certification bachelor'
                    ],
                    [
                        'level_type' => 'BACHELOR',
                        'speciality' => 'MLS_BACH',
                        'inscription_fee' => 50000,
                        'rames_papier' => 22500,
                        'tutelle_universitaire' => 50000,
                        'first_installment' => 300000,
                        'second_installment' => 250000,
                        'third_installment' => 150000,
                        'total_annual_fee' => 700000,
                        'duration_years' => 1,
                        'included_benefits' => 'Certification bachelor'
                    ],
                    [
                        'level_type' => 'BACHELOR',
                        'speciality' => 'NURS_MIDW_BACH',
                        'inscription_fee' => 50000,
                        'rames_papier' => 22500,
                        'tutelle_universitaire' => 50000,
                        'first_installment' => 400000,
                        'second_installment' => 350000,
                        'third_installment' => 300000,
                        'total_annual_fee' => 1050000,
                        'duration_years' => 1,
                        'included_benefits' => 'Double certification'
                    ],

                    // Professional Master (2 ans) - Section anglophone
                    [
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'speciality' => 'BIOMED_PM1',
                        'inscription_fee' => 150000,
                        'rames_papier' => 0,
                        'first_installment' => 350000,
                        'second_installment' => 350000,
                        'third_installment' => 200000,
                        'total_annual_fee' => 900000,
                        'duration_years' => 2,
                        'included_benefits' => 'Recherche et spÃ©cialisation'
                    ],
                    [
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'speciality' => 'NURS_RH_PM1',
                        'inscription_fee' => 150000,
                        'rames_papier' => 0,
                        'first_installment' => 300000,
                        'second_installment' => 300000,
                        'third_installment' => 250000,
                        'total_annual_fee' => 850000,
                        'duration_years' => 2,
                        'included_benefits' => 'SpÃ©cialisation reproductive health'
                    ],
                    [
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'speciality' => 'PH_CH_PM1',
                        'inscription_fee' => 150000,
                        'rames_papier' => 0,
                        'first_installment' => 350000,
                        'second_installment' => 350000,
                        'third_installment' => 200000,
                        'total_annual_fee' => 900000,
                        'duration_years' => 2,
                        'included_benefits' => 'SpÃ©cialisation santÃ© publique'
                    ],
                    [
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'speciality' => 'PH_EPI_PM1',
                        'inscription_fee' => 150000,
                        'rames_papier' => 0,
                        'first_installment' => 350000,
                        'second_installment' => 350000,
                        'third_installment' => 200000,
                        'total_annual_fee' => 900000,
                        'duration_years' => 2,
                        'included_benefits' => 'SpÃ©cialisation Ã©pidÃ©miologie'
                    ],
                    [
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'speciality' => 'HEMA_SERO_PM1',
                        'inscription_fee' => 150000,
                        'rames_papier' => 0,
                        'first_installment' => 350000,
                        'second_installment' => 350000,
                        'third_installment' => 200000,
                        'total_annual_fee' => 900000,
                        'duration_years' => 2,
                        'included_benefits' => 'SpÃ©cialisation hÃ©matologie'
                    ],
                    [
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'speciality' => 'BACT_PARA_PM1',
                        'inscription_fee' => 150000,
                        'rames_papier' => 0,
                        'first_installment' => 300000,
                        'second_installment' => 300000,
                        'third_installment' => 250000,
                        'total_annual_fee' => 850000,
                        'duration_years' => 2,
                        'included_benefits' => 'SpÃ©cialisation bactÃ©riologie'
                    ],
                    [
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'speciality' => 'PH_IDC_PM1',
                        'inscription_fee' => 150000,
                        'rames_papier' => 0,
                        'first_installment' => 350000,
                        'second_installment' => 350000,
                        'third_installment' => 200000,
                        'total_annual_fee' => 900000,
                        'duration_years' => 2,
                        'included_benefits' => 'SpÃ©cialisation contrÃ´le maladies'
                    ],
                    [
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'speciality' => 'CB_MM_PM1',
                        'inscription_fee' => 150000,
                        'rames_papier' => 0,
                        'first_installment' => 400000,
                        'second_installment' => 350000,
                        'third_installment' => 200000,
                        'total_annual_fee' => 950000,
                        'duration_years' => 2,
                        'included_benefits' => 'SpÃ©cialisation mÃ©decine molÃ©culaire'
                    ]
                ];

            case 'ESGIT':
                return [
                    // BTS Informatique (2 ans)
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'GLOG',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 150000,
                        'second_installment' => 100000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 300000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Wifi, Laboratoire informatique'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'IWD',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 150000,
                        'second_installment' => 100000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 300000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Wifi, Logiciels design'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'CMN',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 150000,
                        'second_installment' => 150000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 350000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Wifi, Outils marketing digital'
                    ],
                    // Licence Pro Informatique
                    [
                        'level_type' => 'LICENCE_PRO',
                        'speciality' => 'GLOG_LP',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 50000,
                        'rames_papier' => 15000, // 4 rames
                        'tutelle_universitaire' => 50000,
                        'etablissement_diplome' => 15000,
                        'first_installment' => 250000,
                        'second_installment' => 150000,
                        'third_installment' => 100000,
                        'total_annual_fee' => 500000,
                        'duration_years' => 1,
                        'included_benefits' => 'Certification professionnelle'
                    ],
                    // Cycle Préparatoire Intégré
                    [
                        'level_type' => 'CYCLE_PREPA',
                        'speciality' => 'CPI_GL',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 250000,
                        'second_installment' => 200000,
                        'third_installment' => 200000,
                        'total_annual_fee' => 650000,
                        'duration_years' => 2,
                        'included_benefits' => 'Préparation cycle ingénieur'
                    ],
                    // Ingénierie Informatique 3ème année
                    [
                        'level_type' => 'INGENIERIE',
                        'speciality' => 'IA_ING3',
                        'etude_dossier' => 200000, // Frais concours
                        'inscription_fee' => 200000,
                        'rames_papier' => 15000,
                        'first_installment' => 500000,
                        'second_installment' => 200000,
                        'third_installment' => 200000,
                        'total_annual_fee' => 900000,
                        'duration_years' => 1,
                        'included_benefits' => 'Certification internationale, Projets encadrés'
                    ],
                    // Ingénierie au Maroc (4ème et 5ème année)
                    [
                        'level_type' => 'INGENIERIE',
                        'speciality' => 'IA_M4',
                        'inscription_fee' => 600000,
                        'first_installment' => 600000,
                        'second_installment' => 450000,
                        'third_installment' => 0,
                        'total_annual_fee' => 1650000,
                        'duration_years' => 1,
                        'included_benefits' => 'Formation au Maroc - ISMAGI'
                    ]
                ];

            case 'ESJEC':
                return [
                    // BTS Commerce (2 ans)
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'AJU',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 100000,
                        'second_installment' => 130000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 280000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Wifi, Séminaires juridiques'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'DAE',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 100000,
                        'second_installment' => 130000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 280000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Wifi, Bibliothèque juridique'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'DOT',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 150000,
                        'second_installment' => 100000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 300000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Stages en entreprise'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'CGE',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 100000,
                        'second_installment' => 100000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 250000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Logiciels comptables'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'GLT',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 100000,
                        'second_installment' => 150000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 300000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Visites d\'entreprises'
                    ],
                    // Licence Pro
                    [
                        'level_type' => 'LICENCE_PRO',
                        'speciality' => 'BA_LP',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 50000,
                        'rames_papier' => 15000,
                        'tutelle_universitaire' => 50000,
                        'etablissement_diplome' => 15000,
                        'first_installment' => 250000,
                        'second_installment' => 150000,
                        'third_installment' => 100000,
                        'total_annual_fee' => 500000,
                        'duration_years' => 1,
                        'included_benefits' => 'Certification professionnelle'
                    ]
                ];

            case 'ESSIT':
                return [
                    // BTS (2 ans)
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'BAT',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 150000,
                        'second_installment' => 100000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 300000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Wifi, Équipements BTP'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'ELEC',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 150000,
                        'second_installment' => 100000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 300000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Laboratoire électrique'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'MEA_MEC',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 150000,
                        'second_installment' => 100000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 300000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Atelier mécanique'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'DIET',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 150000,
                        'second_installment' => 100000,
                        'third_installment' => 40000,
                        'total_annual_fee' => 290000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Laboratoire nutrition'
                    ],
                    [
                        'level_type' => 'BTS',
                        'speciality' => 'JOURN',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 150000,
                        'second_installment' => 100000,
                        'third_installment' => 40000,
                        'total_annual_fee' => 290000,
                        'duration_years' => 2,
                        'included_benefits' => 'Laptop offert, Studio média'
                    ],
                    // Cycle Préparatoire Polytechnicien
                    [
                        'level_type' => 'CYCLE_PREPA',
                        'speciality' => 'MEC_CP1',
                        'etude_dossier' => 10000,
                        'inscription_fee' => 40000,
                        'rames_papier' => 22500,
                        'first_installment' => 300000,
                        'second_installment' => 200000,
                        'third_installment' => 200000,
                        'total_annual_fee' => 700000,
                        'duration_years' => 2,
                        'included_benefits' => 'Préparation Polytechnique Douala'
                    ],
                    // Cycle Ingénierie
                    [
                        'level_type' => 'INGENIERIE',
                        'speciality' => 'ALL_ING3',
                        'first_installment' => 300000,
                        'second_installment' => 250000,
                        'third_installment' => 200000,
                        'total_annual_fee' => 750000,
                        'duration_years' => 1,
                        'included_benefits' => 'Diplôme ingénieur Polytechnique'
                    ]
                ];

            case 'ISTMS':
                return [
                    // TMS (3 ans)
                    [
                        'level_type' => 'TMS',
                        'speciality' => 'AMED_TMS',
                        'etude_dossier' => 0, // Pas de frais dossier pour ISTMS
                        'inscription_fee' => 10000,
                        'rames_papier' => 0, // Annulé selon instructions
                        'first_installment' => 250000,
                        'second_installment' => 150000,
                        'third_installment' => 100000,
                        'total_annual_fee' => 500000,
                        'duration_years' => 3,
                        'included_benefits' => 'Formation médico-sanitaire'
                    ]
                ];

            case 'ISTPM':
                return [
                    // CQP (1 an)
                    [
                        'level_type' => 'CQP',
                        'speciality' => 'SECBUR',
                        'etude_dossier' => 5000,
                        'inscription_fee' => 20000,
                        'rames_papier' => 18500, // 5 rames
                        'first_installment' => 100000,
                        'second_installment' => 25000,
                        'third_installment' => 25000,
                        'total_annual_fee' => 150000,
                        'duration_years' => 1,
                        'included_benefits' => 'Bourse 25000 FCFA, Formation pratique'
                    ],
                    [
                        'level_type' => 'CQP',
                        'speciality' => 'TALACB',
                        'etude_dossier' => 5000,
                        'inscription_fee' => 20000,
                        'rames_papier' => 18500,
                        'first_installment' => 150000,
                        'second_installment' => 60000,
                        'third_installment' => 40000,
                        'total_annual_fee' => 250000,
                        'duration_years' => 1,
                        'included_benefits' => 'Bourse 25000 FCFA'
                    ],
                    [
                        'level_type' => 'CQP',
                        'speciality' => 'MAINTINFO',
                        'etude_dossier' => 5000,
                        'inscription_fee' => 20000,
                        'rames_papier' => 18500,
                        'first_installment' => 100000,
                        'second_installment' => 100000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 250000,
                        'duration_years' => 1,
                        'included_benefits' => 'Bourse 25000 FCFA'
                    ],
                    // DQP (1 an)
                    [
                        'level_type' => 'DQP',
                        'speciality' => 'DELMED',
                        'etude_dossier' => 5000,
                        'inscription_fee' => 20000,
                        'rames_papier' => 18500,
                        'first_installment' => 200000,
                        'second_installment' => 150000,
                        'third_installment' => 100000,
                        'total_annual_fee' => 450000,
                        'duration_years' => 1,
                        'included_benefits' => 'Bourse 25000 FCFA'
                    ],
                    [
                        'level_type' => 'DQP',
                        'speciality' => 'VENDPHAR',
                        'etude_dossier' => 5000,
                        'inscription_fee' => 20000,
                        'rames_papier' => 18500,
                        'first_installment' => 150000,
                        'second_installment' => 100000,
                        'third_installment' => 50000,
                        'total_annual_fee' => 300000,
                        'duration_years' => 1,
                        'included_benefits' => 'Bourse 25000 FCFA'
                    ]
                ];

            default:
                return [];
        }
    }

    private function getAmountForTranche($trancheName, $feeData, $schoolCode, $levelType)
    {
        switch ($trancheName) {
            case 'Frais Étude Dossier':
                return $feeData['etude_dossier'] ?? 0;
            case 'Inscription':
                return $feeData['inscription_fee'] ?? 0;
            case 'Rames Papier':
                return $feeData['rames_papier'] ?? 0;
            case 'Tutelle Universitaire':
                return $feeData['tutelle_universitaire'] ?? 0;
            case 'Établissement Diplôme':
                // Seulement pour les niveaux finaux (Licence Aca 3, DD 3, etc.)
                if (in_array($levelType, ['LICENCE_PRO', 'DOUBLE_DIPLOMATION', 'MASTER'])) {
                    return $feeData['etablissement_diplome'] ?? 0;
                }
                return 0;
            case '1ère Tranche':
                return $feeData['first_installment'] ?? 0;
            case '2ème Tranche':
                return $feeData['second_installment'] ?? 0;
            case '3ème Tranche':
                return $feeData['third_installment'] ?? 0;
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
                        'scholarship_amount' => 150000,
                        'laptop_included' => true,
                        'conditions' => 'Inscription régulière, assiduité aux cours'
                    ],
                    [
                        'level_type' => 'LICENCE_ACA',
                        'formation_name' => 'Licence Académique Santé',
                        'scholarship_amount' => 100000,
                        'laptop_included' => true,
                        'conditions' => 'BTS obtenu, dossier académique satisfaisant'
                    ],
                    [
                        'level_type' => 'LICENCE_PRO',
                        'formation_name' => 'Licence Pro Santé',
                        'scholarship_amount' => 100000,
                        'laptop_included' => false,
                        'conditions' => 'BTS validé, projet professionnel'
                    ],
                    [
                        'level_type' => 'MASTER',
                        'formation_name' => 'Master Santé',
                        'scholarship_amount' => 100000,
                        'laptop_included' => false,
                        'conditions' => 'Licence Pro validée, projet de recherche'
                    ],
                    // Section anglophone
                    [
                        'level_type' => 'HND',
                        'formation_name' => 'Health HND',
                        'scholarship_amount' => 150000,
                        'laptop_included' => true,
                        'conditions' => 'RÃ©gular registration, class attendance'
                    ],
                    [
                        'level_type' => 'PROFESSIONAL_LICENSE',
                        'formation_name' => 'Professional License BAC+3',
                        'scholarship_amount' => 100000,
                        'laptop_included' => true,
                        'conditions' => 'GCE A Level obtained, satisfactory academic record'
                    ],
                    [
                        'level_type' => 'LICENCE_PRO',
                        'formation_name' => 'Professional License HND+1',
                        'scholarship_amount' => 100000,
                        'laptop_included' => false,
                        'conditions' => 'HND validated, professional project'
                    ],
                    [
                        'level_type' => 'BACHELOR',
                        'formation_name' => 'Bachelor Health',
                        'scholarship_amount' => 100000,
                        'laptop_included' => false,
                        'conditions' => 'HND+1 validated, professional project'
                    ],
                    [
                        'level_type' => 'PROFESSIONAL_MASTER',
                        'formation_name' => 'Professional Master Health',
                        'scholarship_amount' => 100000,
                        'laptop_included' => false,
                        'conditions' => 'Professional License/Bachelor validated, research project'
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

            case 'ESJEC':
                return [
                    [
                        'level_type' => 'BTS',
                        'formation_name' => 'BTS Commerce et Gestion',
                        'scholarship_amount' => 0,
                        'laptop_included' => true,
                        'conditions' => 'Inscription régulière'
                    ]
                ];

            case 'ESSIT':
                return [
                    [
                        'level_type' => 'BTS',
                        'formation_name' => 'BTS Techniques',
                        'scholarship_amount' => 0,
                        'laptop_included' => true,
                        'conditions' => 'Inscription régulière'
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

            case 'ISTMS':
                return [
                    [
                        'level_type' => 'TMS',
                        'formation_name' => 'TMS',
                        'scholarship_amount' => 0,
                        'laptop_included' => false,
                        'conditions' => 'Inscription en TMS'
                    ]
                ];

            default:
                return [];
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
            ['name' => 'Construction', 'code' => 'CONST', 'description' => 'Techniques de construction'],
            ['name' => 'Chimie', 'code' => 'CHIM', 'description' => 'Chimie générale et appliquée'],
            ['name' => 'Biologie', 'code' => 'BIO', 'description' => 'Sciences biologiques'],
            ['name' => 'Physique', 'code' => 'PHYS_GEN', 'description' => 'Physique générale'],
            ['name' => 'Statistiques', 'code' => 'STAT', 'description' => 'Statistiques et probabilités'],
            ['name' => 'Gestion', 'code' => 'GEST', 'description' => 'Gestion d\'entreprise'],
            ['name' => 'Communication', 'code' => 'COM', 'description' => 'Techniques de communication'],
            ['name' => 'Bureautique', 'code' => 'BUR', 'description' => 'Informatique bureautique']
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
        $subjects = Subject::take(10)->get();

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

        $classSeries = ClassSeries::take(15)->get();
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
            ['first_name' => 'Esther', 'last_name' => 'Ndongo', 'mention' => 'Très Bien'],
            ['first_name' => 'Samuel', 'last_name' => 'Dongmo', 'mention' => 'Bien'],
            ['first_name' => 'Christelle', 'last_name' => 'Fombu', 'mention' => 'Assez Bien'],
            ['first_name' => 'Rodrigue', 'last_name' => 'Tchuente', 'mention' => 'Très Bien'],
            ['first_name' => 'Nadège', 'last_name' => 'Wouapi', 'mention' => 'Passable'],
            ['first_name' => 'Josué', 'last_name' => 'Kenmogne', 'mention' => 'Bien']
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
                            $scholarshipAmount = 150000;
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
                        } elseif ($school->code === 'ESJEC') {
                            $laptopEligible = true;
                            $scholarshipAmount = 0;
                        } elseif ($school->code === 'ESSIT') {
                            $laptopEligible = true;
                            $scholarshipAmount = 0;
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

        $students = Student::where('laptop_eligible', true)->where('laptop_received', false)->take(8)->get();
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
        $students = Student::with('classSeries')->where('is_active', true)->take(15)->get();

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
            'Payment Amounts' => ClassPaymentAmount::count(),
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
            $specialitiesCount = SchoolClass::whereHas('level', function ($q) use ($school) {
                $q->where('school_id', $school->id);
            })->count();
            $this->command->info("• {$school->name} ({$school->code}) - {$specialitiesCount} spécialités");
        }

        $this->command->info('==========================================');
        $this->command->info('💰 SCHOLARSHIPS AND LAPTOPS SUMMARY');
        $this->command->info('• INSSAS: 150,000 FCFA + Laptop offert');
        $this->command->info('• ESGIT: 50,000-150,000 FCFA selon mention + Laptop');
        $this->command->info('• ESJEC: Laptop offert');
        $this->command->info('• ESSIT: Laptop offert');
        $this->command->info('• ISTPM: 25,000 FCFA');
        $this->command->info('• ISTMS: Formation médico-sanitaire');

        $this->command->info('==========================================');
        $this->command->info('📊 DETAILED BREAKDOWN BY SCHOOL');

        foreach ($schools as $school) {
            $this->command->info("");
            $this->command->info("🏫 {$school->name} ({$school->code}):");

            $levels = Level::where('school_id', $school->id)->get();
            foreach ($levels as $level) {
                $specialitiesInLevel = SchoolClass::where('level_id', $level->id)->count();
                $this->command->info("  • {$level->name}: {$specialitiesInLevel} spécialités");
            }
        }

        $this->command->info('==========================================');
        $this->command->info('💳 PAYMENT STRUCTURE');
        $this->command->info('• Frais Étude Dossier: 5,000-10,000 FCFA');
        $this->command->info('• Frais Inscription: 20,000-200,000 FCFA');
        $this->command->info('• Rames Papier: 15,000-22,500 FCFA');
        $this->command->info('• Tutelle Universitaire: 50,000 FCFA (formations diplômantes)');
        $this->command->info('• Établissement Diplôme: 15,000 FCFA (fin de cycle)');

        $this->command->info('==========================================');
        $this->command->info('🔑 TEST ACCOUNTS');
        $this->command->info('Username: admin       | Password: password123');
        $this->command->info('Username: surveillant | Password: password123');
        $this->command->info('Username: comptable   | Password: password123');
        $this->command->info('Username: prof.martin | Password: password123');
        $this->command->info('Username: prof.kamga  | Password: password123');

        $this->command->info('==========================================');
        $this->command->info('📋 NOTES IMPORTANTES');
        $this->command->info('• Toutes les spécialités de chaque école sont incluses');
        $this->command->info('• Structure complète des frais selon les documents');
        $this->command->info('• Bourses et laptops configurés selon les écoles');
        $this->command->info('• Niveaux adaptés: BTS 1-3, Licence Aca 1-3, etc.');
        $this->command->info('• Frais de rames annulés pour ISTMS comme demandé');
        $this->command->info('==========================================');
    }
}
