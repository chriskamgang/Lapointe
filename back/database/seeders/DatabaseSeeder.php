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

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🚀 Création des établissements supérieurs et leurs spécificités...');

        // 1. Create base users
        $this->createUsers();

        // 1. Créer les écoles supérieures
        $this->createUniversitySchools();

        // 2. Créer les niveaux pour chaque école
        $this->createUniversityLevels();

        // 3. Créer les tranches de paiement spécialisées
        $this->createSpecializedPaymentTranches();

        // 4. Créer les spécialités avec tarification
        $this->createSpecializedClasses();

        // 5. Configurer les bourses
        $this->createUniversityScholarships();

        $this->command->info('✅ Configuration des établissements supérieurs terminée !');

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

    private function createUniversitySchools()
    {
        $schools = [
            ['name' => 'INSSAS', 'code' => 'INSSAS', 'description' => 'Institut National Supérieur des Sciences Appliquées et de Santé'],
            ['name' => 'ESGIT', 'code' => 'ESGIT', 'description' => 'École Supérieure de Génie Informatique et Télécommunications'],
            ['name' => 'ESJEC', 'code' => 'ESJEC', 'description' => 'École Supérieure de Juridique, Économie et Commerce'],
            ['name' => 'ESSIT', 'code' => 'ESSIT', 'description' => 'École Supérieure des Sciences Industrielles et Technologiques'],
            ['name' => 'ISTPM', 'code' => 'ISTPM', 'description' => 'Institut Supérieur de Technologies et Professions Médicales'],
            ['name' => 'ISTMS', 'code' => 'ISTMS', 'description' => 'Institut Supérieur de Techniques Médico-Sanitaires']
        ];

        foreach ($schools as $schoolData) {
            School::updateOrCreate(
                ['code' => $schoolData['code']],
                array_merge($schoolData, ['is_active' => true])
            );
        }
    }

    private function createUniversityLevels()
    {
        $levelConfigs = [
            'INSSAS' => [
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
                ['name' => 'Aca Bachelor 1', 'level_code' => 'PL1', 'level_type' => 'PROFESSIONAL_LICENSE', 'duration_years' => 3, 'order' => 17],
                ['name' => 'Aca Bachelor 2', 'level_code' => 'PL2', 'level_type' => 'PROFESSIONAL_LICENSE', 'duration_years' => 3, 'order' => 18],
                ['name' => 'Aca Bachelor 3', 'level_code' => 'PL3', 'level_type' => 'PROFESSIONAL_LICENSE', 'duration_years' => 3, 'order' => 19],

                // Professional License (BTS+1) - Section anglophone
                ['name' => 'Professional Bachelor', 'level_code' => 'PLPRO', 'level_type' => 'LICENCE_PRO', 'duration_years' => 1, 'order' => 20],

                // Bachelor - Section anglophone
                ['name' => 'Bachelor Health', 'level_code' => 'BACH_H', 'level_type' => 'BACHELOR', 'duration_years' => 1, 'order' => 21],

                // Professional Master (2 ans) - Section anglophone
                ['name' => 'Professional Master 1', 'level_code' => 'PM1', 'level_type' => 'PROFESSIONAL_MASTER', 'duration_years' => 2, 'order' => 22],
                ['name' => 'Professional Master 2', 'level_code' => 'PM2', 'level_type' => 'PROFESSIONAL_MASTER', 'duration_years' => 2, 'order' => 23],
            ],
            'ESGIT' => [
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
            ],
            'ESSIT' => [
                ['name' => 'BTS 1', 'level_code' => 'BTS1', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 1],
                ['name' => 'BTS 2', 'level_code' => 'BTS2', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 2],
                ['name' => 'Cycle Prépa 1', 'level_code' => 'CP1', 'level_type' => 'CYCLE_PREPA', 'duration_years' => 2, 'order' => 3],
                ['name' => 'Cycle Prépa 2', 'level_code' => 'CP2', 'level_type' => 'CYCLE_PREPA', 'duration_years' => 2, 'order' => 4],
                ['name' => 'INGENIERIE 1', 'level_code' => 'ING1', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 5],
                ['name' => 'INGENIERIE 2', 'level_code' => 'ING2', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 6],
                ['name' => 'INGENIERIE 3', 'level_code' => 'ING3', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 7],
                ['name' => 'INGENIERIE 4', 'level_code' => 'ING4', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 8],
                ['name' => 'INGENIERIE 5', 'level_code' => 'ING5', 'level_type' => 'INGENIERIE', 'duration_years' => 5, 'order' => 9]
            ],
            'ESJEC' => [
                ['name' => 'BTS 1', 'level_code' => 'BTS1', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 1],
                ['name' => 'BTS 2', 'level_code' => 'BTS2', 'level_type' => 'BTS', 'duration_years' => 2, 'order' => 2],
                ['name' => 'Licence Pro', 'level_code' => 'LP', 'level_type' => 'LICENCE_PRO', 'duration_years' => 1, 'order' => 3]
            ],
            'ISTPM' => [
                ['name' => 'CQP', 'level_code' => 'CQP', 'level_type' => 'CQP', 'duration_years' => 1, 'order' => 1],
                ['name' => 'DQP', 'level_code' => 'DQP', 'level_type' => 'DQP', 'duration_years' => 1, 'order' => 2]
            ],
            'ISTMS' => [
                ['name' => 'TMS 1', 'level_code' => 'TMS1', 'level_type' => 'TMS', 'duration_years' => 3, 'order' => 1],
                ['name' => 'TMS 2', 'level_code' => 'TMS2', 'level_type' => 'TMS', 'duration_years' => 3, 'order' => 2],
                ['name' => 'TMS 3', 'level_code' => 'TMS3', 'level_type' => 'TMS', 'duration_years' => 3, 'order' => 3]
            ]
        ];

        foreach ($levelConfigs as $schoolCode => $levels) {
            $school = School::where('code', $schoolCode)->first();
            if ($school) {
                foreach ($levels as $levelData) {
                    Level::updateOrCreate(
                        ['name' => $levelData['name'], 'school_id' => $school->id],
                        array_merge($levelData, ['description' => $levelData['name'], 'is_active' => true])
                    );
                }
            }
        }
    }

    private function createSpecializedPaymentTranches()
    {
        $tranches = [
            // Tranches communes
            ['name' => 'Étude de dossier', 'description' => 'Frais d\'étude de dossier', 'order' => 1, 'is_equipment' => false],
            ['name' => 'Inscription', 'description' => 'Frais d\'inscription annuelle', 'order' => 2, 'is_equipment' => false],
            ['name' => '1ère Tranche', 'description' => 'Première tranche de scolarité', 'order' => 4, 'is_equipment' => false],
            ['name' => '2ème Tranche', 'description' => 'Deuxième tranche de scolarité', 'order' => 5, 'is_equipment' => false],
            ['name' => '3ème Tranche', 'description' => 'Troisième tranche de scolarité', 'order' => 6, 'is_equipment' => false],

            // Équipements
            ['name' => 'Blouse', 'description' => 'Blouse médicale', 'order' => 3, 'is_equipment' => true, 'equipment_type' => 'blouse'],
            ['name' => 'Polo', 'description' => 'Polo école', 'order' => 3, 'is_equipment' => true, 'equipment_type' => 'polo'],
            ['name' => 'Rames de papier', 'description' => 'Rames de papier ou physiques', 'order' => 3, 'is_equipment' => true, 'equipment_type' => 'rame'],

            // Frais spécialisés
            ['name' => 'Frais de tutelle académique', 'description' => 'Frais de tutelle universitaire', 'order' => 7, 'is_equipment' => false],
            ['name' => 'Frais d\'établissement de diplôme', 'description' => 'Frais pour l\'établissement du diplôme', 'order' => 8, 'is_equipment' => false],
            ['name' => 'Frais de concours', 'description' => 'Frais de concours d\'admission', 'order' => 1, 'is_equipment' => false]
        ];

        foreach ($tranches as $tranche) {
            PaymentTranche::updateOrCreate(
                ['name' => $tranche['name']],
                array_merge($tranche, ['is_active' => true])
            );
        }
    }

    private function createSpecializedClasses()
    {
        // Configuration spécialisée pour INSSAS
        $this->createINSSASClasses();

        // Configuration spécialisée pour ESGIT
        $this->createESGITClasses();

        // Configuration spécialisée pour ESJEC
        $this->createESJECClasses();

        // Configuration spécialisée pour ESSIT
        $this->createESSITClasses();

        // Configuration spécialisée pour ISTPM
        $this->createISTPMClasses();

        // Configuration spécialisée pour ISTMS
        $this->createISTMSClasses();
    }

    private function createINSSASClasses()
    {
        $school = School::where('code', 'INSSAS')->first();
        if (!$school) return;

        // BTS Santé - Filières générales
        $btsFilieresGenerales = [
            'Sciences Infirmières',
            'Sage-Femme/Maïeuticien',
            'Nursing',
            'Midwifery'
        ];

        // BTS Santé - Filières spécialisées
        $btsFilieresSpecialisees = [
            'Techniques de Laboratoire d\'Analyses Médicales',
            'Kinésithérapie',
            'Sciences et Techniques Pharmaceutiques',
            'Imagerie Médicale et Radiologie',
            'Odontostomatologie',
            'Opticien-Lunetier',
            'Medical Laboratory Sciences',
            'Physiotherapy',
            'Pharmaceutical Sciences and Techniques',
            'Medical Imaging and Radiology',
            'Odontostomatology',
            'Optician-Eye wear',
            'Ultrasonography and Echography'
        ];

        $this->createClassesForINSSAS($school, 'BTS', $btsFilieresGenerales, 'generale');
        $this->createClassesForINSSAS($school, 'BTS', $btsFilieresSpecialisees, 'specialisee');

        // BTS Santé - Filières générales (Anglophone)
        $btsFilieresGenerales = [
            'Nursing',
            'Midwifery'
        ];

        // BTS Santé - Filières spécialisées (Anglophone)
        $btsFilieresSpecialisees = [
            'Medical Laboratory Sciences',
            'Physiotherapy',
            'Pharmacy Technology',
            'Medical Imaging Technology',
            'Odontostomatology',
            'Optician-Eye wear',
            'Ultrasonography',
            'Echography',
            'Ophthalmic Technician',
            'Clinical Optometry',
            'Nutrition and Dietetics'
        ];

        $this->createClassesForINSSAS($school, 'HND', $btsFilieresGenerales, 'generale');
        $this->createClassesForINSSAS($school, 'HND', $btsFilieresSpecialisees, 'specialisee');

        // Licence Académique
        $licenceAcademique = [
            'Sciences Biomédicales',
            'Sciences Infirmières',
            'Sage-Femme/Maïeuticien',
            'Analyses Médicales',
            'Kinésithérapie',
            'Sciences et Techniques Pharmaceutiques',
            'Radiologie et Imagerie Médicale',
            'Odontostomatologie',
            'Lunetterie-Optique'
        ];
        $this->createClassesForINSSAS($school, 'LICENCE_ACA', $licenceAcademique, 'academique');

        // Double Diplomation - générale et spécialisée
        $ddGenerales = ['Sciences Infirmières', 'Sage-Femme/Maïeuticien'];
        $ddSpecialisees = [
            'Analyses Médicales',
            'Kinésithérapie',
            'Sciences et Techniques Pharmaceutiques',
            'Radiologie et Imagerie Médicale',
            'Odontostomatologie',
            'Lunetterie-Optique'
        ];

        $this->createClassesForINSSAS($school, 'DOUBLE_DIPLOMATION', $ddGenerales, 'dd_generale');
        $this->createClassesForINSSAS($school, 'DOUBLE_DIPLOMATION', $ddSpecialisees, 'dd_specialisee');

        // Licence Professionnelle
        $licenceProfessionnelle = [
            'Sciences Infirmières',
            'Sage-Femme/Maïeuticien',
            'Analyses Médicales',
            'Kinésithérapie',
            'Techniques Pharmaceutiques',
            'Radiologie et Imagerie Médicale',
            'Odontostomatologie',
            'Lunetterie-Optique'
        ];
        $this->createClassesForINSSAS($school, 'LICENCE_PRO', $licenceProfessionnelle, 'professionnelle');

        // Bachelor
        $bachelors = ['Sciences Infirmières', 'Sage-Femme/Maïeuticien', 'Analyses Médicales'];
        $this->createClassesForINSSAS($school, 'BACHELOR', $bachelors, 'generale');

        // Master
        $mastersgenerale = ['Sciences Infirmières', 'Sage-Femme/Maïeuticien', 'Bactériologie et Parasitologie'];
        $this->createClassesForINSSAS($school, 'MASTER', $mastersgenerale, 'master_generale');

        $mastersspecialisee = [
            'Sciences Biomédicales',
            'Santé Publique Option Santé Communautaire',
            'Santé Publique Option Epidémiologie',
            'Hématologie et Sérologie',
            'Contrôle des maladies infectieuses'
        ];
        $this->createClassesForINSSAS($school, 'MASTER', $mastersspecialisee, 'master_specialisee');

        $mastersspe = ['Biologie Clinique Option Médécine Moléculaire'];
        $this->createClassesForINSSAS($school, 'MASTER', $mastersspe, 'master_spe');

        // Professional License (Anglophone)
        $professionalLicenses = [
            'Nursing',
            'Midwifery',
            'Biomedical Sciences',
            'Physiotherapy',
            'Pharmaceutical Techniques',
            'Radiology And Medical Imaging',
            'Odontostomatology',
            'Optician-Eye wear'
        ];
        $this->createClassesForINSSAS($school, 'PROFESSIONAL_LICENSE', $professionalLicenses, 'professionnelle');

        // Professional Master (Anglophone)
        $professionalMastersgenerale = [
            'Nursing',
            'Midwifery',
            'Public Health Option Community Health',
            'Public Health Option Epidemiology',
            'Infectious Disease Control',
            'Hematology And Serology',
            'Bacteriology And Parasitology',
            'Clinical Biology',
            'Medical Biology',
            'Pharmacology And Toxicology',
            'Pharmaceutical Sciences',
            'General Pharmacy Practice',
            'Pharmaceutical Management'
        ];
        $this->createClassesForINSSAS($school, 'PROFESSIONAL_MASTER', $professionalMastersgenerale, 'master_generale');
    }

    private function createClassesForINSSAS($school, $levelType, $specialties, $category)
    {
        $levels = Level::where('school_id', $school->id)->where('level_type', $levelType)->get();

        foreach ($specialties as $specialty) {
            foreach ($levels as $level) {
                $class = SchoolClass::updateOrCreate(
                    ['name' => $specialty, 'level_id' => $level->id],
                    [
                        'description' => "$specialty - {$level->name}",
                        'speciality_code' => strtoupper(str_replace([' ', '\'', '/'], '_', $specialty)),
                        'category' => $category,
                        'is_active' => true
                    ]
                );

                // Configurer les montants selon la catégorie
                $this->configureINSSASPayments($class, $category, $level);

                // Créer les séries
                ClassSeries::updateOrCreate(
                    ['class_id' => $class->id, 'name' => 'A'],
                    ['capacity' => 40, 'is_active' => true]
                );
            }
        }
    }

    private function configureINSSASPayments($class, $category, $level)
    {
        $tranches = PaymentTranche::all()->keyBy('name');

        // Montants de base INSSAS
        $baseAmounts = [
            'Étude de dossier' => 10000,
            'Inscription' => 40000,
            'Blouse' => 7500,
            'Rames de papier' => 22500
        ];

        $baseAmounts2 = [
            'Inscription' => 50000,
            'Rames de papier' => 22500
        ];

        $baseAmounts3 = [
            'Inscription' => 150000
        ];

        // Configuration selon la catégorie
        $trancheAmounts = match ($category) {
            'generale' => [
                '1ère Tranche' => 200000,
                '2ème Tranche' => 150000,
                '3ème Tranche' => 150000
            ],
            'specialisee' => [
                '1ère Tranche' => 250000,
                '2ème Tranche' => 150000,
                '3ème Tranche' => 150000
            ],
            'academique' => [
                '1ère Tranche' => 300000,
                '2ème Tranche' => 150000,
                '3ème Tranche' => 150000,
                'Frais de tutelle académique' => 50000,
                'Frais d\'établissement de diplôme' => ($level->order === 3) ? 15000 : 0
            ],
            'professionnelle' => [
                '1ère Tranche' => 300000,
                '2ème Tranche' => 250000,
                '3ème Tranche' => 150000,
                'Frais de tutelle académique' => 50000
            ],
            'dd_generale' => [
                '1ère Tranche' => 400000,
                '2ème Tranche' => 200000,
                '3ème Tranche' => 100000,
                'Frais de tutelle académique' => 50000,
                'Frais d\'établissement de diplôme' => ($level->order === 3) ? 15000 : 0
            ],
            'dd_specialisee' => [
                '1ère Tranche' => 450000,
                '2ème Tranche' => 150000,
                '3ème Tranche' => 150000,
                'Frais de tutelle académique' => 50000,
                'Frais d\'établissement de diplôme' => ($level->order === 3) ? 15000 : 0
            ],
            'master_generale' => [
                '1ère Tranche' => 300000,
                '2ème Tranche' => 300000,
                '3ème Tranche' => 250000
            ],
            'master_specialisee'  => [
                '1ère Tranche' => 350000,
                '2ème Tranche' => 350000,
                '3ème Tranche' => 200000
            ],

            'master_spe'  => [
                '1ère Tranche' => 400000,
                '2ème Tranche' => 350000,
                '3ème Tranche' => 200000
            ],
        };

        if ($category == 'master_generale' || $category == 'master_specialisee' || $category == 'master_spe') {
            $allAmounts = array_merge($baseAmounts3, $trancheAmounts);
        } elseif ($category == 'professionnelle') {
            $allAmounts = array_merge($baseAmounts2, $trancheAmounts);
        } else {
            $allAmounts = array_merge($baseAmounts, $trancheAmounts);
        }


        foreach ($allAmounts as $trancheName => $amount) {
            if (isset($tranches[$trancheName]) && $amount > 0) {
                ClassPaymentAmount::updateOrCreate(
                    ['class_id' => $class->id, 'payment_tranche_id' => $tranches[$trancheName]->id],
                    ['amount' => $amount, 'is_required' => true]
                );
            }
        }
    }


    private function createESGITClasses()
    {
        $school = School::where('code', 'ESGIT')->first();
        if (!$school) return;

        // BTS Informatique - Filières générales
        $btsInformatiqueGenerales = [
            'Génie Logiciel',
            'Infographie et Web Design',
            'Maintenance de Système Informatique',
            'Informatique Industrielle et Automatisme',
            'Télécommunications',
            'Réseaux et Sécurité'
        ];

        // BTS - Filière avec tarification particulière
        $btsMarketing = ['E-Commerce et Marketing Numérique'];

        // Licence Professionnelle
        $licenceProfessionnelle = [
            'Génie Logiciel',
            'Infographie et Web Design',
            'Maintenance de Système Informatique',
            'Informatique Industrielle et Automatisme',
            'Télécommunications',
            'Réseaux et Sécurité',
            'E-Commerce et Marketing Numérique'
        ];

        // Cycle Préparatoire Intégré
        $cyclePreparatoire = [
            'Génie Logiciel',
            'Infographie et Web Design',
            'Maintenance de Système Informatique',
            'Informatique Industrielle et Automatisme',
            'Télécommunications',
            'Réseaux et Sécurité'
        ];

        // Ingénierie
        $ingenierie = [
            'Génie Logiciel',
            'Infographie et Web Design',
            'Maintenance de Système Informatique',
            'Informatique Industrielle et Automatisme',
            'Télécommunications',
            'Réseaux et Sécurité'
        ];

        $this->createClassesForESGIT($school, 'BTS', $btsInformatiqueGenerales, 'generale');
        $this->createClassesForESGIT($school, 'BTS', $btsMarketing, 'marketing');
        $this->createClassesForESGIT($school, 'LICENCE_PRO', $licenceProfessionnelle, 'professionnelle');
        $this->createClassesForESGIT($school, 'CYCLE_PREPA', $cyclePreparatoire, 'prepa');
        $this->createClassesForESGIT($school, 'INGENIERIE', $ingenierie, 'ingenierie');
    }

    private function createClassesForESGIT($school, $levelType, $specialties, $category)
    {
        $levels = Level::where('school_id', $school->id)->where('level_type', $levelType)->get();

        foreach ($specialties as $specialty) {
            foreach ($levels as $level) {
                $class = SchoolClass::updateOrCreate(
                    ['name' => $specialty, 'level_id' => $level->id],
                    [
                        'description' => "$specialty - {$level->name}",
                        'speciality_code' => strtoupper(str_replace([' ', '\'', '/'], '_', $specialty)),
                        'category' => $category,
                        'is_active' => true
                    ]
                );

                // Configurer les montants selon la catégorie
                $this->configureESGITPayments($class, $category, $level);

                // Créer les séries
                ClassSeries::updateOrCreate(
                    ['class_id' => $class->id, 'name' => 'A'],
                    ['capacity' => 40, 'is_active' => true]
                );
            }
        }
    }

    private function configureESGITPayments($class, $category, $level)
    {
        $tranches = PaymentTranche::all()->keyBy('name');

        // Montants de base ESGIT
        $baseAmounts = [
            'Étude de dossier' => 10000,
            'Inscription' => 40000,
            'Polo' => 6500,
            'Rames de papier' => 22500
        ];

        $baseAmountsLP = [
            'Étude de dossier' => 10000,
            'Inscription' => 50000,
            'Polo' => 6500,
            'Rames de papier' => 15000
        ];

        $baseAmountsPrepa = [
            'Étude de dossier' => 10000,
            'Inscription' => 40000,
            'Polo' => 6500,
            'Rames de papier' => 22500
        ];

        $baseAmountsIngenierie3 = [
            'Frais de concours' => 25000,
            'Inscription' => 200000,
            'Polo' => 6500,
            'Rames de papier' => 15000
        ];

        $baseAmountsIngenierie45 = [];

        // Configuration selon la catégorie et le niveau
        $trancheAmounts = match ($category) {
            'generale' => [
                '1ère Tranche' => 150000,
                '2ème Tranche' => 100000,
                '3ème Tranche' => 50000
            ],
            'marketing' => [
                '1ère Tranche' => 150000,
                '2ème Tranche' => 150000, // Tarif spécial pour E-Commerce et Marketing
                '3ème Tranche' => 50000
            ],
            'professionnelle' => [
                'Frais de tutelle académique' => 50000,
                'Frais d\'établissement de diplôme' => 15000,
                '1ère Tranche' => 250000,
                '2ème Tranche' => 150000,
                '3ème Tranche' => 100000
            ],
            'prepa' => [
                '1ère Tranche' => 250000,
                '2ème Tranche' => 200000,
                '3ème Tranche' => 200000
            ],
            'ingenierie' => match ($level->order) {
                6 => [ // ING3 - 3ème année
                    '1ère Tranche' => 500000,
                    '2ème Tranche' => 200000,
                    '3ème Tranche' => 200000
                ],
                7, 8 => [ // ING4 et ING5 - 4ème et 5ème année au Maroc
                    '1ère Tranche' => 600000,
                    '2ème Tranche' => 600000,
                    '3ème Tranche' => 450000
                ],
                default => []
            }
        };

        // Sélectionner les montants de base appropriés
        $baseToUse = match ($category) {
            'professionnelle' => $baseAmountsLP,
            'prepa' => $baseAmountsPrepa,
            'ingenierie' => match ($level->order) {
                6 => $baseAmountsIngenierie3,
                7, 8 => $baseAmountsIngenierie45,
                default => $baseAmounts
            },
            default => $baseAmounts
        };

        $allAmounts = array_merge($baseToUse, $trancheAmounts);

        foreach ($allAmounts as $trancheName => $amount) {
            if (isset($tranches[$trancheName]) && $amount > 0) {
                ClassPaymentAmount::updateOrCreate(
                    ['class_id' => $class->id, 'payment_tranche_id' => $tranches[$trancheName]->id],
                    ['amount' => $amount, 'is_required' => true]
                );
            }
        }
    }

    private function createESJECClasses()
    {
        $school = School::where('code', 'ESJEC')->first();
        if (!$school) return;

        // Carrières Juridiques
        $carriereJuridiques = [
            'Assistant Judiciaire',
            'Droit des Affaires et de l\'Entreprise',
            'Droit Foncier et Domanial'
        ];

        // Filières spécialisées
        $filieresSpecialisees = [
            'Douane et Transit',
            'Métier de la Bourse',
            'Gestion Fiscale',
            'Gestion Logistique et Transport',
            'Administration des Collectivités Territoriales',
            'Fiscalité des Collectivités Territoriales',
            'Comptabilité et Finances Publiques'
        ];

        // Gestion des Systèmes d'Information (tarif spécial)
        $gsi = ['Gestion des Systèmes d\'Information'];

        // Autres filières de gestion
        $autresGestion = [
            'Commerce International',
            'Marketing Commerce Vente',
            'Assistant Manager',
            'Assurance',
            'Banque et Finance',
            'Comptabilité et Gestion des Entreprises',
            'Gestion des ONG',
            'Gestion des Projets',
            'Gestion des Ressources Humaines',
            'Gestion de la Qualité',
            'Management du Sport',
            'Statistique',
            'Microfinance',
            'Management Événementiel'
        ];

        // Licence Professionnelle - Toutes les filières
        $licenceProfessionnelle = array_merge($carriereJuridiques, $filieresSpecialisees, $gsi, $autresGestion);

        $this->createClassesForESJEC($school, 'BTS', $carriereJuridiques, 'juridique');
        $this->createClassesForESJEC($school, 'BTS', $filieresSpecialisees, 'specialisee');
        $this->createClassesForESJEC($school, 'BTS', $gsi, 'gsi');
        $this->createClassesForESJEC($school, 'BTS', $autresGestion, 'gestion');
        $this->createClassesForESJEC($school, 'LICENCE_PRO', $licenceProfessionnelle, 'professionnelle');
    }

    private function createClassesForESJEC($school, $levelType, $specialties, $category)
    {
        $levels = Level::where('school_id', $school->id)->where('level_type', $levelType)->get();

        foreach ($specialties as $specialty) {
            foreach ($levels as $level) {
                $class = SchoolClass::updateOrCreate(
                    ['name' => $specialty, 'level_id' => $level->id],
                    [
                        'description' => "$specialty - {$level->name}",
                        'speciality_code' => strtoupper(str_replace([' ', '\'', '/'], '_', $specialty)),
                        'category' => $category,
                        'is_active' => true
                    ]
                );

                // Configurer les montants selon la catégorie
                $this->configureESJECPayments($class, $category, $level);

                // Créer les séries
                ClassSeries::updateOrCreate(
                    ['class_id' => $class->id, 'name' => 'A'],
                    ['capacity' => 40, 'is_active' => true]
                );
            }
        }
    }

    private function configureESJECPayments($class, $category, $level)
    {
        $tranches = PaymentTranche::all()->keyBy('name');

        // Montants de base ESJEC
        $baseAmounts = [
            'Étude de dossier' => 10000,
            'Inscription' => 40000,
            'Polo' => 6500,
            'Rames de papier' => 22500
        ];

        $baseAmountsLP = [
            'Étude de dossier' => 10000,
            'Inscription' => 50000,
            'Polo' => 6500,
            'Rames de papier' => 15000
        ];

        // Configuration selon la catégorie
        $trancheAmounts = match ($category) {
            'juridique' => [
                '1ère Tranche' => 100000,
                '2ème Tranche' => 130000,
                '3ème Tranche' => 50000
            ],
            'specialisee' => [
                '1ère Tranche' => 150000,
                '2ème Tranche' => 100000,
                '3ème Tranche' => 50000
            ],
            'gsi' => [
                '1ère Tranche' => 145000,
                '2ème Tranche' => 100000,
                '3ème Tranche' => 50000
            ],
            'gestion' => [
                '1ère Tranche' => 100000,
                '2ème Tranche' => 100000,
                '3ème Tranche' => 50000
            ],
            'professionnelle' => [
                'Frais de tutelle académique' => 50000,
                'Frais d\'établissement de diplôme' => 15000,
                '1ère Tranche' => 250000,
                '2ème Tranche' => 150000,
                '3ème Tranche' => 100000
            ],
        };

        // Sélectionner les montants de base appropriés
        $baseToUse = ($category === 'professionnelle') ? $baseAmountsLP : $baseAmounts;
        $allAmounts = array_merge($baseToUse, $trancheAmounts);

        foreach ($allAmounts as $trancheName => $amount) {
            if (isset($tranches[$trancheName]) && $amount > 0) {
                ClassPaymentAmount::updateOrCreate(
                    ['class_id' => $class->id, 'payment_tranche_id' => $tranches[$trancheName]->id],
                    ['amount' => $amount, 'is_required' => true]
                );
            }
        }
    }

    private function createESSITClasses()
    {
        $school = School::where('code', 'ESSIT')->first();
        if (!$school) return;

        // BTS Génie Civil
        $btsGenieCivil = [
            'Bâtiment',
            'Urbanisme',
            'Travaux Publiques',
            'Installation Sanitaire',
            'Géomètre Topographe',
            'Menuiserie et Ébénisterie',
            'Géotechnique et Géologie Appliquée'
        ];

        // BTS Électrotechnique
        $btsElectrotechnique = [
            'Électrotechnique',
            'Maintenance des Appareils Biomédicaux',
            'Maintenance des Systèmes Électroniques',
            'Contrôle, Instrumentation et Régulation'
        ];

        // BTS Génie Mécanique et Productique
        $btsGenieMecanique = [
            'Mécanique et Électronique Automobiles (option: Mécatronique)',
            'Mécanique et Électronique Automobiles (option: Maintenance Après-vente Automobile)',
            'Construction et Fabrication Mécanique (Option : Fabrication Mécanique)',
            'Construction et Fabrication Mécanique (Option: Construction Mécanique)',
            'Construction Métallique',
            'Chaudronnerie et Soudure',
            'Maintenance des Systèmes Industriels (option : Maintenance Industrielle et Productive)'
        ];

        // BTS Génie Thermique
        $btsGenieThermique = [
            'Énergies Renouvelables',
            'Froid et climatisation'
        ];

        // BTS Agriculture et Élevage
        $btsAgriculture = [
            'Aquaculture',
            'Agroéquipement',
            'Production Végétale',
            'Production Animale',
            'Conseiller Agropastoral',
            'Entrepreneuriat Agropastoral',
            'Technique Commerciale Agricole'
        ];

        // BTS Génie Biologique (tranche 3 = 40000)
        $btsGenieBiologique = [
            'Diététique',
            'Industries Alimentaires',
            'Biotechnologie Agricole',
            'Phytothérapie et Aromathérapie',
            'Analyse Biologique et Biochimique'
        ];

        // BTS Génie Géologique et Pétrolier
        $btsGenieGeologique = [
            'Ingénierie Pétrolière',
            'Mines et Géologie Appliquée'
        ];

        // BTS Fabrication Mécanique
        $btsFabricationMecanique = [
            'Fabrication Mécanique',
            'Construction Mécanique'
        ];

        // BTS Informatique et Communication (tranche 3 = 40000)
        $btsInformatique = [
            'Journalisme',
            'Communication des Organisations',
            'Hôtelier et restauration'
        ];

        // BTS Hôtellerie et Restauration
        $btsHotellerie = [
            'Gestion et management hôteliers',
            'Commercialisation et service de restauration'
        ];

        // BTS Arts et Métiers de la Culture
        $btsArts = [
            'Art culinaire',
            'Industrie d\'habillement',
            'Industrie du textile'
        ];

        // Cycle Préparatoire Intégré
        $cyclePreparatoire = [
            'Mécatronique',
            'Technologie De Construction Industrielle',
            'Construction Mécanique Et Productique',
            'Ingénierie De L\'énergie Électrique',
            'Énergie Renouvelable',
            'Ingénierie Des Systèmes Automatisés',
            'Bâtiment Et Construction Industrielles',
            'Travaux Publics Et Ouvrages'
        ];

        // Ingénierie
        $ingenierie = [
            'Mécatronique',
            'Technologie De Construction Industrielle',
            'Construction Mécanique Et Productique',
            'Ingénierie De L\'énergie Électrique',
            'Énergie Renouvelable',
            'Ingénierie Des Systèmes Automatisés',
            'Bâtiment Et Construction Industrielles',
            'Travaux Publics Et Ouvrages'
        ];

        $this->createClassesForESSIT($school, 'BTS', $btsGenieCivil, 'standard');
        $this->createClassesForESSIT($school, 'BTS', $btsElectrotechnique, 'standard');
        $this->createClassesForESSIT($school, 'BTS', $btsGenieMecanique, 'standard');
        $this->createClassesForESSIT($school, 'BTS', $btsGenieThermique, 'standard');
        $this->createClassesForESSIT($school, 'BTS', $btsAgriculture, 'standard');
        $this->createClassesForESSIT($school, 'BTS', $btsGenieBiologique, 'special');
        $this->createClassesForESSIT($school, 'BTS', $btsGenieGeologique, 'standard');
        $this->createClassesForESSIT($school, 'BTS', $btsFabricationMecanique, 'standard');
        $this->createClassesForESSIT($school, 'BTS', $btsInformatique, 'special');
        $this->createClassesForESSIT($school, 'BTS', $btsHotellerie, 'standard');
        $this->createClassesForESSIT($school, 'BTS', $btsArts, 'standard');
        $this->createClassesForESSIT($school, 'CYCLE_PREPA', $cyclePreparatoire, 'prepa');
        $this->createClassesForESSIT($school, 'INGENIERIE', $ingenierie, 'ingenierie');
    }

    private function createClassesForESSIT($school, $levelType, $specialties, $category)
    {
        $levels = Level::where('school_id', $school->id)->where('level_type', $levelType)->get();

        foreach ($specialties as $specialty) {
            foreach ($levels as $level) {
                $class = SchoolClass::updateOrCreate(
                    ['name' => $specialty, 'level_id' => $level->id],
                    [
                        'description' => "$specialty - {$level->name}",
                        'speciality_code' => strtoupper(str_replace([' ', '\'', '/'], '_', $specialty)),
                        'category' => $category,
                        'is_active' => true
                    ]
                );

                // Configurer les montants selon la catégorie
                $this->configureESSITPayments($class, $category, $level);

                // Créer les séries
                ClassSeries::updateOrCreate(
                    ['class_id' => $class->id, 'name' => 'A'],
                    ['capacity' => 40, 'is_active' => true]
                );
            }
        }
    }

    private function configureESSITPayments($class, $category, $level)
    {
        $tranches = PaymentTranche::all()->keyBy('name');

        // Montants de base ESSIT
        $baseAmounts = [
            'Étude de dossier' => 10000,
            'Inscription' => 40000,
            'Polo' => 6500,
            'Rames de papier' => 22500
        ];

        $baseAmountsPrepa = [
            'Inscription' => 40000
        ];

        $baseAmountsIngenierie = [];

        // Configuration selon la catégorie
        $trancheAmounts = match ($category) {
            'standard' => [
                '1ère Tranche' => 150000,
                '2ème Tranche' => 100000,
                '3ème Tranche' => 50000
            ],
            'special' => [
                '1ère Tranche' => 150000,
                '2ème Tranche' => 100000,
                '3ème Tranche' => 40000
            ],
            'prepa' => [
                '1ère Tranche' => 300000,
                '2ème Tranche' => 200000,
                '3ème Tranche' => 200000
            ],
            'ingenierie' => match ($level->order) {
                5, 6, 7, 8, 9 => [ // ING1 à ING5
                    '1ère Tranche' => 300000,
                    '2ème Tranche' => 250000,
                    '3ème Tranche' => 200000
                ],
                default => []
            }
        };

        // Sélectionner les montants de base appropriés
        $baseToUse = match ($category) {
            'prepa' => $baseAmountsPrepa,
            'ingenierie' => $baseAmountsIngenierie,
            default => $baseAmounts
        };

        $allAmounts = array_merge($baseToUse, $trancheAmounts);

        foreach ($allAmounts as $trancheName => $amount) {
            if (isset($tranches[$trancheName]) && $amount > 0) {
                ClassPaymentAmount::updateOrCreate(
                    ['class_id' => $class->id, 'payment_tranche_id' => $tranches[$trancheName]->id],
                    ['amount' => $amount, 'is_required' => true]
                );
            }
        }
    }

    private function createISTPMClasses()
    {
        $school = School::where('code', 'ISTPM')->first();
        if (!$school) return;

        // CQP - Filières santé
        $cqpSante = [
            'Technicien Adjoint de Laboratoire/Aide Chimiste Biologiste',
            'Auxiliaire de Puériculture',
            'Assistant en Cabinet Médical',
            'Auxiliaire de Vie',
            'Massothérapie'
        ];

        // CQP - Filières informatique
        $cqpInformatique = [
            'Développement d\'Application',
            'Maintenance Réseaux',
            'Maintenance Informatique',
            'Web Master',
            'Graphisme de Production',
            'Infographie'
        ];

        // CQP - Filières gestion
        $cqpGestion = [
            'Comptabilité Informatisé et Gestion',
            'Secrétariat Comptable',
            'Secrétariat Bureautique',
            'Douane et Transit',
            'Déclarant en Douane',
            'Marketing Digital'
        ];

        // DQP - Toutes filières
        $dqpFilieres = [
            'Délégué Médical',
            'Vendeur en Pharmacie',
            'Secrétariat Médical',
            'Maintenance Réseaux'
        ];

        $this->createClassesForISTPM($school, 'CQP', $cqpSante, 'cqp_sante');
        $this->createClassesForISTPM($school, 'CQP', $cqpInformatique, 'cqp_informatique');
        $this->createClassesForISTPM($school, 'CQP', $cqpGestion, 'cqp_gestion');
        $this->createClassesForISTPM($school, 'DQP', $dqpFilieres, 'dqp');
    }

    private function createClassesForISTPM($school, $levelType, $specialties, $category)
    {
        $levels = Level::where('school_id', $school->id)->where('level_type', $levelType)->get();

        foreach ($specialties as $specialty) {
            foreach ($levels as $level) {
                $class = SchoolClass::updateOrCreate(
                    ['name' => $specialty, 'level_id' => $level->id],
                    [
                        'description' => "$specialty - {$level->name}",
                        'speciality_code' => strtoupper(str_replace([' ', '\'', '/'], '_', $specialty)),
                        'category' => $category,
                        'is_active' => true
                    ]
                );

                // Configurer les montants selon la catégorie
                $this->configureISTPMPayments($class, $category, $level);

                // Créer les séries
                ClassSeries::updateOrCreate(
                    ['class_id' => $class->id, 'name' => 'A'],
                    ['capacity' => 30, 'is_active' => true]
                );
            }
        }
    }

    private function configureISTPMPayments($class, $category, $level)
    {
        $tranches = PaymentTranche::all()->keyBy('name');

        // Montants de base ISTPM pour CQP
        $baseAmountsCQP = [
            'Étude de dossier' => 5000,
            'Inscription' => 20000,
            'Rames de papier' => 18500
        ];

        // Configuration selon la catégorie
        if (str_starts_with($category, 'cqp')) {
            // Ajouter blouse ou polo selon la filière
            if ($category === 'cqp_sante') {
                $baseAmountsCQP['Blouse'] = 7500;
            } else {
                $baseAmountsCQP['Polo'] = 6500;
            }

            // Les montants des tranches varient selon les spécialités (à définir précisément)
            // Pour l'instant, montants génériques
            $trancheAmounts = [
                '1ère Tranche' => 150000,
                '2ème Tranche' => 100000,
                '3ème Tranche' => 50000
            ];

            $allAmounts = array_merge($baseAmountsCQP, $trancheAmounts);
        } else { // DQP
            $baseAmountsDQP = [
                'Étude de dossier' => 5000,
                'Inscription' => 20000,
                'Rames de papier' => 18500
            ];

            // Ajouter blouse ou polo selon la filière
            if (in_array($class->name, ['Délégué Médical', 'Vendeur en Pharmacie', 'Secrétariat Médical'])) {
                $baseAmountsDQP['Blouse'] = 7500;
            } else {
                $baseAmountsDQP['Polo'] = 6500;
            }

            $trancheAmounts = [
                '1ère Tranche' => 200000,
                '2ème Tranche' => 150000,
                '3ème Tranche' => 100000
            ];

            $allAmounts = array_merge($baseAmountsDQP, $trancheAmounts);
        }

        foreach ($allAmounts as $trancheName => $amount) {
            if (isset($tranches[$trancheName]) && $amount > 0) {
                ClassPaymentAmount::updateOrCreate(
                    ['class_id' => $class->id, 'payment_tranche_id' => $tranches[$trancheName]->id],
                    ['amount' => $amount, 'is_required' => true]
                );
            }
        }
    }

    private function createISTMSClasses()
    {
        $school = School::where('code', 'ISTMS')->first();
        if (!$school) return;

        // TMS - Analyses Médicales
        $tmsSpecialties = ['Analyses Médicales'];

        $this->createClassesForISTMS($school, 'TMS', $tmsSpecialties, 'tms');
    }

    private function createClassesForISTMS($school, $levelType, $specialties, $category)
    {
        $levels = Level::where('school_id', $school->id)->where('level_type', $levelType)->get();

        foreach ($specialties as $specialty) {
            foreach ($levels as $level) {
                $class = SchoolClass::updateOrCreate(
                    ['name' => $specialty, 'level_id' => $level->id],
                    [
                        'description' => "$specialty - {$level->name}",
                        'speciality_code' => strtoupper(str_replace([' ', '\'', '/'], '_', $specialty)),
                        'category' => $category,
                        'is_active' => true
                    ]
                );

                // Configurer les montants selon la catégorie
                $this->configureISTMSPayments($class, $category, $level);

                // Créer les séries
                ClassSeries::updateOrCreate(
                    ['class_id' => $class->id, 'name' => 'A'],
                    ['capacity' => 25, 'is_active' => true]
                );
            }
        }
    }

    private function configureISTMSPayments($class, $category, $level)
    {
        $tranches = PaymentTranche::all()->keyBy('name');

        // Montants de base ISTMS (sans rames de papier)
        $baseAmounts = [
            'Inscription' => 10000,
            'Blouse' => 7500
        ];

        // Configuration TMS
        $trancheAmounts = [
            '1ère Tranche' => 250000,
            '2ème Tranche' => 150000,
            '3ème Tranche' => 100000
        ];

        $allAmounts = array_merge($baseAmounts, $trancheAmounts);

        foreach ($allAmounts as $trancheName => $amount) {
            if (isset($tranches[$trancheName]) && $amount > 0) {
                ClassPaymentAmount::updateOrCreate(
                    ['class_id' => $class->id, 'payment_tranche_id' => $tranches[$trancheName]->id],
                    ['amount' => $amount, 'is_required' => true]
                );
            }
        }
    }

    // Fonction principale pour créer toutes les bourses universitaires (CORRIGÉE)
    private function createUniversityScholarships()
    {
        $scholarshipConfigs = [
            // ==================== INSSAS - Section Francophone ====================
            [
                'school_code' => 'INSSAS',
                'level_type' => 'BTS',
                'formation_name' => 'BTS Santé (toutes filières)',
                'scholarship_amount' => 50000,
                'level_1_amount' => 50000,
                'level_2_plus_amount' => 100000,
                'laptop_included' => false,
                'conditions' => 'Bourse niveau 1: 50k, niveaux 2+: 100k'
            ],

            [
                'school_code' => 'INSSAS',
                'level_type' => 'LICENCE_ACA',
                'formation_name' => 'Licence Académique Santé',
                'scholarship_amount' => 100000,
                'laptop_included' => false,
                'conditions' => 'Bourse fixe 100k par an'
            ],

            [
                'school_code' => 'INSSAS',
                'level_type' => 'DOUBLE_DIPLOMATION',
                'formation_name' => 'Double Diplomation Santé',
                'scholarship_amount' => 50000,
                'level_1_amount' => 50000,
                'level_2_plus_amount' => 100000,
                'laptop_included' => true,
                'conditions' => 'Bourse niveau 1: 50k, niveaux 2+: 100k + laptop'
            ],

            [
                'school_code' => 'INSSAS',
                'level_type' => 'LICENCE_PRO',
                'formation_name' => 'Licence Professionnelle',
                'scholarship_amount' => 100000,
                'laptop_included' => true,
                'conditions' => 'Bourse fixe 100k + laptop'
            ],

            [
                'school_code' => 'INSSAS',
                'level_type' => 'BACHELOR',
                'formation_name' => 'Bachelor Santé',
                'scholarship_amount' => 100000,
                'laptop_included' => true,
                'conditions' => 'Bourse fixe 100k + laptop'
            ],

            [
                'school_code' => 'INSSAS',
                'level_type' => 'MASTER',
                'formation_name' => 'Master Professionnel',
                'scholarship_amount' => 150000,
                'laptop_included' => false,
                'conditions' => 'Bourse 150k niveaux 1-2 seulement'
            ],

            // ==================== INSSAS - Section Anglophone (NOUVELLEMENT AJOUTÉ) ====================
            [
                'school_code' => 'INSSAS',
                'level_type' => 'HND',
                'formation_name' => 'Health HND (toutes filières)',
                'scholarship_amount' => 50000,
                'level_1_amount' => 50000,
                'level_2_plus_amount' => 100000,
                'laptop_included' => false,
                'conditions' => 'Bourse niveau 1: 50k, niveaux 2+: 100k'
            ],

            [
                'school_code' => 'INSSAS',
                'level_type' => 'PROFESSIONAL_LICENSE',
                'formation_name' => 'Professional License',
                'scholarship_amount' => 100000,
                'laptop_included' => true,
                'conditions' => 'Bourse fixe 100k + laptop'
            ],

            [
                'school_code' => 'INSSAS',
                'level_type' => 'PROFESSIONAL_MASTER',
                'formation_name' => 'Professional Master',
                'scholarship_amount' => 150000,
                'laptop_included' => false,
                'conditions' => 'Bourse 150k niveaux 1-2 seulement'
            ],

            // ==================== ESGIT ====================
            [
                'school_code' => 'ESGIT',
                'level_type' => 'LICENCE_PRO',
                'formation_name' => 'Licence Pro (selon mention BTS)',
                'scholarship_amount' => 0,
                'laptop_included' => false,
                'conditions' => 'Selon mention BTS: Passable=50k, Assez Bien=100k, Bien=120k, Très Bien=150k+laptop'
            ],

            [
                'school_code' => 'ESGIT',
                'level_type' => 'INGENIERIE',
                'formation_name' => 'Ingénierie 3ème année seulement',
                'scholarship_amount' => 50000,
                'laptop_included' => false,
                'conditions' => 'Bourse fixe 50k par an (3ème année uniquement, pas 4ème/5ème au Maroc)'
            ],

            // ==================== ESSIT ====================
            [
                'school_code' => 'ESSIT',
                'level_type' => 'INGENIERIE',
                'formation_name' => 'Ingénierie Second Cycle',
                'scholarship_amount' => 50000,
                'laptop_included' => false,
                'conditions' => 'Bourse fixe 50k par an (niveaux 3,4,5 seulement - pas 1,2)'
            ],

            // ==================== ISTPM ====================
            [
                'school_code' => 'ISTPM',
                'level_type' => 'CQP',
                'formation_name' => 'Certificat de Qualification Professionnelle',
                'scholarship_amount' => 25000,
                'laptop_included' => false,
                'conditions' => 'Bourse automatique 25k par an'
            ],

            [
                'school_code' => 'ISTPM',
                'level_type' => 'DQP',
                'formation_name' => 'Diplôme de Qualification Professionnelle',
                'scholarship_amount' => 25000,
                'laptop_included' => false,
                'conditions' => 'Bourse automatique 25k par an'
            ],

            // ==================== ESJEC et ISTMS ====================
            // PAS DE BOURSES - Confirmé selon vos spécifications
        ];

        foreach ($scholarshipConfigs as $config) {
            $school = School::where('code', $config['school_code'])->first();
            if ($school) {
                UniversityScholarship::updateOrCreate(
                    ['school_id' => $school->id, 'level_type' => $config['level_type']],
                    [
                        'formation_name' => $config['formation_name'],
                        'scholarship_amount' => $config['scholarship_amount'],
                        'level_1_amount' => $config['level_1_amount'] ?? $config['scholarship_amount'],
                        'level_2_plus_amount' => $config['level_2_plus_amount'] ?? $config['scholarship_amount'],
                        'laptop_included' => $config['laptop_included'] ?? false,
                        'conditions' => $config['conditions'],
                        'is_active' => true
                    ]
                );
            }
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
