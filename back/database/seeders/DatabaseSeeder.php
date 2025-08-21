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
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\Student;
use App\Models\Attendance;
use App\Models\TeacherAttendance;
use App\Models\SchoolYear;
use App\Models\SeriesSubject;
use App\Models\SupervisorClassAssignment;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class CompleteSchoolSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🚀 Démarrage du seeder complet...');

        // 1. Créer les utilisateurs de base
        $this->createUsers();
        
        // 2. Créer les schools
        $this->createSchools();
        
        // 3. Créer les niveaux
        $this->createLevels();
        
        // 4. Créer les tranches de paiement
        $this->createPaymentTranches();
        
        // 5. Créer les classes et séries
        $this->createClasses();
        
        // 6. Créer les matières
        $this->createSubjects();
        
        // 7. Créer l'année scolaire
        $this->createSchoolYear();
        
        // 8. Créer les enseignants
        $this->createTeachers();
        
        // 9. Créer quelques étudiants
        $this->createStudents();
        
        // 10. Créer les présences
        $this->createAttendances();

        $this->command->info('✅ Seeder complet terminé !');
        $this->displaySummary();
    }

    private function createUsers()
    {
        $this->command->info('👥 Création des utilisateurs...');
        
        $users = [
            [
                'username' => 'admin',
                'name' => 'Administrateur Principal',
                'email' => 'admin@school.com',
                'role' => 'admin'
            ],
            [
                'username' => 'surveillant',
                'name' => 'Surveillant Général',
                'email' => 'surveillant@school.com',
                'role' => 'surveillant_general'
            ],
            [
                'username' => 'comptable',
                'name' => 'Comptable École',
                'email' => 'comptable@school.com',
                'role' => 'accountant'
            ],
            [
                'username' => 'prof.martin',
                'name' => 'Professeur Martin',
                'email' => 'martin@school.com',
                'role' => 'teacher'
            ],
            [
                'username' => 'prof.dubois',
                'name' => 'Professeur Dubois',
                'email' => 'dubois@school.com',
                'role' => 'teacher'
            ],
            [
                'username' => 'prof.ngomo',
                'name' => 'Professeur Ngomo',
                'email' => 'ngomo@school.com',
                'role' => 'teacher'
            ]
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['username' => $userData['username']],
                array_merge($userData, ['password' => Hash::make('password123')])
            );
        }
    }

    private function createSchools()
    {
        $this->command->info('📚 Création des schools...');
        
        $schools = [
            ['name' => 'Maternelle', 'description' => 'School pour les enfants de 3 à 6 ans', 'order' => 1],
            ['name' => 'Primaire', 'description' => 'School pour les étudiants du CP au CM2', 'order' => 2],
            ['name' => 'Secondaire', 'description' => 'School pour les étudiants de la 6ème à la Terminale', 'order' => 3]
        ];

        foreach ($schools as $sectionData) {
            School::updateOrCreate(
                ['name' => $sectionData['name']],
                array_merge($sectionData, ['is_active' => true])
            );
        }
    }

    private function createLevels()
    {
        $this->command->info('📖 Création des niveaux...');
        
        $schools = School::all();
        
        foreach ($schools as $school) {
            $levels = match($school->name) {
                'Maternelle' => [
                    ['name' => 'Petite School', 'order' => 1],
                    ['name' => 'Moyenne School', 'order' => 2],
                    ['name' => 'Grande School', 'order' => 3]
                ],
                'Primaire' => [
                    ['name' => 'CP', 'order' => 1],
                    ['name' => 'CE1', 'order' => 2],
                    ['name' => 'CE2', 'order' => 3],
                    ['name' => 'CM1', 'order' => 4],
                    ['name' => 'CM2', 'order' => 5]
                ],
                'Secondaire' => [
                    ['name' => '6ème', 'order' => 1],
                    ['name' => '5ème', 'order' => 2],
                    ['name' => '4ème', 'order' => 3],
                    ['name' => '3ème', 'order' => 4],
                    ['name' => '2nde', 'order' => 5],
                    ['name' => '1ère', 'order' => 6],
                    ['name' => 'Terminale', 'order' => 7]
                ],
                default => [['name' => 'Niveau 1', 'order' => 1]]
            };

            foreach ($levels as $levelData) {
                Level::updateOrCreate(
                    ['name' => $levelData['name'], 'school_id' => $school->id],
                    array_merge($levelData, [
                        'description' => "Niveau {$levelData['name']} de la school {$school->name}",
                        'is_active' => true
                    ])
                );
            }
        }
    }

    private function createPaymentTranches()
    {
        $this->command->info('💰 Création des tranches de paiement...');
        
        $tranches = [
            ['name' => 'Inscription', 'description' => 'Frais d\'inscription annuelle', 'order' => 1],
            ['name' => '1ère Tranche', 'description' => 'Première tranche de scolarité', 'order' => 2],
            ['name' => '2ème Tranche', 'description' => 'Deuxième tranche de scolarité', 'order' => 3],
            ['name' => '3ème Tranche', 'description' => 'Troisième tranche de scolarité', 'order' => 4],
            ['name' => 'Examen', 'description' => 'Frais d\'examen', 'order' => 5]
        ];

        foreach ($tranches as $tranche) {
            PaymentTranche::updateOrCreate(
                ['name' => $tranche['name']],
                array_merge($tranche, ['is_active' => true])
            );
        }
    }

    private function createClasses()
    {
        $this->command->info('🏫 Création des classes et séries...');
        
        $levels = Level::all();
        $tranches = PaymentTranche::all();

        foreach ($levels as $level) {
            $schoolClass = SchoolClass::updateOrCreate(
                ['name' => $level->name, 'level_id' => $level->id],
                ['description' => "Classe de {$level->name}", 'is_active' => true]
            );

            // Créer les séries selon le niveau
            $series = $this->getSeriesForLevel($level->name);
            foreach ($series as $seriesName) {
                ClassSeries::updateOrCreate(
                    ['class_id' => $schoolClass->id, 'name' => $seriesName],
                    ['capacity' => 40, 'is_active' => true]
                );
            }

            // Configurer les montants de paiement
            $this->configurePayments($schoolClass, $tranches, $level);
        }
    }

    private function getSeriesForLevel($levelName)
    {
        return match($levelName) {
            'Petite School', 'Moyenne School', 'Grande School', 'CP', 'CE1', 'CE2' => ['A'],
            'CM1', 'CM2', '6ème', '5ème' => ['A', 'B'],
            '4ème', '3ème', '2nde' => ['A', 'B', 'C'],
            '1ère', 'Terminale' => ['A', 'C', 'D'],
            default => ['A']
        };
    }

    private function configurePayments($schoolClass, $tranches, $level)
    {
        $amounts = $this->getAmountsForLevel($level->name);
        
        foreach ($tranches as $tranche) {
            $config = match($tranche->name) {
                'Inscription' => ['amount' => $amounts['inscription'], 'required' => true],
                '1ère Tranche', '2ème Tranche', '3ème Tranche' => ['amount' => $amounts['tranche'], 'required' => true],
                'Examen' => ['amount' => 15000, 'required' => false],
                default => ['amount' => 25000, 'required' => true]
            };

            ClassPaymentAmount::updateOrCreate(
                ['class_id' => $schoolClass->id, 'payment_tranche_id' => $tranche->id],
                $config
            );
        }
    }

    private function getAmountsForLevel($levelName)
    {
        $baseAmounts = [
            'Petite School' => ['inscription' => 15000, 'tranche' => 35000],
            'Moyenne School' => ['inscription' => 15000, 'tranche' => 35000],
            'Grande School' => ['inscription' => 18000, 'tranche' => 40000],
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

        return $baseAmounts[$levelName] ?? ['inscription' => 20000, 'tranche' => 45000];
    }

    private function createSubjects()
    {
        $this->command->info('📝 Création des matières...');
        
        $subjects = [
            ['name' => 'Mathématiques', 'code' => 'MATH', 'description' => 'Mathématiques générales'],
            ['name' => 'Français', 'code' => 'FR', 'description' => 'Langue française'],
            ['name' => 'Anglais', 'code' => 'EN', 'description' => 'Langue anglaise'],
            ['name' => 'Sciences', 'code' => 'SCI', 'description' => 'Sciences naturelles'],
            ['name' => 'Histoire-Géographie', 'code' => 'HG', 'description' => 'Histoire et géographie'],
            ['name' => 'Physique-Chimie', 'code' => 'PC', 'description' => 'Physique et chimie'],
            ['name' => 'SVT', 'code' => 'SVT', 'description' => 'Sciences de la vie et de la terre']
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
        $this->command->info('📅 Création de l\'année scolaire...');
        
        SchoolYear::updateOrCreate(
            ['name' => '2024-2025'],
            [
                'start_date' => '2024-09-01',
                'end_date' => '2025-07-31',
                'is_current' => true,
                'is_active' => true
            ]
        );
    }

    private function createTeachers()
    {
        $this->command->info('👨‍🏫 Création des enseignants...');
        
        $teacherUsers = User::where('role', 'teacher')->get();
        $subjects = Subject::take(3)->get();

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
                    'specialization' => $subjects->random()->name ?? 'Généraliste',
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
        $this->command->info('👨‍🎓 Création d\'étudiants de test...');
        
        $classSeries = ClassSeries::take(5)->get();
        $schoolYear = SchoolYear::where('is_current', true)->first();

        $studentNames = [
            ['first_name' => 'Pierre', 'last_name' => 'Kamga'],
            ['first_name' => 'Marie', 'last_name' => 'Nkomo'],
            ['first_name' => 'Jean', 'last_name' => 'Fouda'],
            ['first_name' => 'Aisha', 'last_name' => 'Bello'],
            ['first_name' => 'Paul', 'last_name' => 'Mbeki'],
            ['first_name' => 'Grace', 'last_name' => 'Etindi'],
            ['first_name' => 'David', 'last_name' => 'Manga'],
            ['first_name' => 'Fatima', 'last_name' => 'Hassan'],
            ['first_name' => 'Michel', 'last_name' => 'Tchoumi'],
            ['first_name' => 'Esther', 'last_name' => 'Ndongo']
        ];

        foreach ($studentNames as $index => $studentData) {
            if ($classSeries->isNotEmpty()) {
                $series = $classSeries->random();
                
                Student::updateOrCreate(
                    ['registration_number' => 'STU' . str_pad($index + 1, 4, '0', STR_PAD_LEFT)],
                    array_merge($studentData, [
                        'class_series_id' => $series->id,
                        'school_year_id' => $schoolYear->id,
                        'qr_code' => 'STU_' . strtoupper(Str::random(8)) . '_' . ($index + 1),
                        'date_of_birth' => Carbon::now()->subYears(rand(6, 18))->format('Y-m-d'),
                        'place_of_birth' => 'Yaoundé',
                        'gender' => rand(0, 1) ? 'M' : 'F',
                        'parent_phone' => '+237650' . rand(100000, 999999),
                        'parent_email' => strtolower($studentData['last_name']) . '@parent.com',
                        'is_active' => true
                    ])
                );
            }
        }
    }

    private function createAttendances()
    {
        $this->command->info('📊 Création des présences...');
        
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

            // Présence aujourd'hui
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

            // Présence hier
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
            // Présence aujourd'hui
            if (rand(1, 100) <= 90) {
                $entryTime = $today->copy()->setTime(8, 0)->addMinutes(rand(-15, 30));
                $workHours = 8 + (rand(-60, 60) / 60); // Entre 7h et 9h
                
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

            // Présence hier
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
        $this->command->info('🎉 RÉSUMÉ DU SEEDING');
        $this->command->info('==========================================');
        
        $counts = [
            'Utilisateurs' => User::count(),
            'Schools' => School::count(),
            'Niveaux' => Level::count(),
            'Classes' => SchoolClass::count(),
            'Séries' => ClassSeries::count(),
            'Tranches de paiement' => PaymentTranche::count(),
            'Matières' => Subject::count(),
            'Enseignants' => Teacher::count(),
            'Étudiants' => Student::count(),
            'Présences étudiants' => Attendance::count(),
            'Présences enseignants' => TeacherAttendance::count(),
        ];

        foreach ($counts as $type => $count) {
            $this->command->info("• {$type}: {$count}");
        }
        
        $this->command->info('==========================================');
        $this->command->info('🔑 COMPTES DE TEST');
        $this->command->info('Username: admin       | Password: password123');
        $this->command->info('Username: surveillant | Password: password123');
        $this->command->info('Username: comptable   | Password: password123');
        $this->command->info('Username: prof.martin | Password: password123');
        $this->command->info('==========================================');
    }
}