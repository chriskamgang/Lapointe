<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Teacher;
use App\Models\TeacherAttendance;
use App\Models\SchoolYear;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Str;

class TeacherAttendanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtenir l'année scolaire actuelle ou la première disponible
        $schoolYear = SchoolYear::where('is_current', true)->first() ?: SchoolYear::first();
        if (!$schoolYear) {
            $this->command->error('Aucune année scolaire trouvée. Veuillez d\'abord créer une année scolaire.');
            return;
        }

        // Créer ou obtenir un superviseur
        $supervisor = User::where('role', 'surveillant_general')->first();
        if (!$supervisor) {
            $supervisor = User::create([
                'name' => 'Surveillant Test',
                'email' => 'surveillant@test.com',
                'password' => bcrypt('password'),
                'role' => 'surveillant_general'
            ]);
        }

        // Utiliser les enseignants existants et les mettre à jour avec QR codes
        $teachers = Teacher::where('is_active', true)->get();
        
        if ($teachers->isEmpty()) {
            $this->command->error('Aucun enseignant trouvé. Veuillez d\'abord créer des enseignants.');
            return;
        }

        // Mettre à jour les enseignants avec QR codes et horaires
        foreach ($teachers as $index => $teacher) {
            if (!$teacher->qr_code) {
                $teacher->update([
                    'qr_code' => 'TCH_' . strtoupper(Str::random(8)) . '_' . $teacher->id,
                    'expected_arrival_time' => $teacher->expected_arrival_time ?: '08:00:00',
                    'expected_departure_time' => $teacher->expected_departure_time ?: '17:00:00',
                    'daily_work_hours' => $teacher->daily_work_hours ?: 8.0
                ]);
            }
        }

        // Générer des présences pour les 30 derniers jours
        $startDate = Carbon::now()->subDays(30);
        $endDate = Carbon::now();

        foreach ($teachers as $teacherIndex => $teacher) {
            $currentDate = $startDate->copy();
            
            while ($currentDate->lte($endDate)) {
                // Ignorer les weekends
                if ($currentDate->isWeekend()) {
                    $currentDate->addDay();
                    continue;
                }

                // Probabilité de présence selon l'enseignant
                $attendanceRate = match($teacherIndex % 3) {
                    0 => 0.95, // Très ponctuel (95%)
                    1 => 0.85, // Souvent en retard (85%)
                    2 => 0.80, // Irrégulier (80%)
                    default => 0.90
                };

                if (rand(1, 100) <= ($attendanceRate * 100)) {
                    // L'enseignant est présent ce jour
                    $this->createDayAttendance($teacher, $supervisor, $schoolYear, $currentDate, $teacherIndex % 3);
                }

                $currentDate->addDay();
            }
        }

        $this->command->info('Données de présences fictives créées avec succès !');
        $this->command->info('Enseignants créés :');
        foreach ($teachers as $teacher) {
            $this->command->info("- {$teacher->full_name} (QR: {$teacher->qr_code})");
        }
    }

    private function createDayAttendance($teacher, $supervisor, $schoolYear, $date, $teacherIndex)
    {
        $expectedArrival = Carbon::parse($teacher->expected_arrival_time);
        $expectedDeparture = Carbon::parse($teacher->expected_departure_time);

        // Calculer les variations selon le profil de l'enseignant
        [$entryDelay, $exitVariation, $extraMovements] = match($teacherIndex) {
            0 => [rand(-5, 5), rand(-10, 10), rand(0, 1)], // Ponctuel
            1 => [rand(5, 45), rand(-20, 30), rand(1, 3)], // Souvent en retard
            2 => [rand(-15, 60), rand(-30, 45), rand(0, 4)], // Irrégulier
            default => [rand(-5, 15), rand(-15, 15), rand(0, 2)]
        };

        // Heure d'entrée
        $entryTime = $date->copy()
            ->setHour($expectedArrival->hour)
            ->setMinute($expectedArrival->minute)
            ->addMinutes($entryDelay);

        $lateMinutes = max(0, $entryDelay);

        // Créer l'entrée
        TeacherAttendance::create([
            'teacher_id' => $teacher->id,
            'supervisor_id' => $supervisor->id,
            'school_year_id' => $schoolYear->id,
            'attendance_date' => $date->toDateString(),
            'scanned_at' => $entryTime,
            'is_present' => true,
            'event_type' => 'entry',
            'work_hours' => 0,
            'late_minutes' => $lateMinutes,
            'early_departure_minutes' => 0,
            'notes' => $lateMinutes > 0 ? "Retard de {$lateMinutes} minutes" : null
        ]);

        // Créer des mouvements supplémentaires (pauses, sorties temporaires)
        $lastMovementTime = $entryTime->copy();
        $totalExtraTime = 0;

        for ($i = 0; $i < $extraMovements; $i++) {
            // Sortie temporaire
            $tempExitTime = $lastMovementTime->copy()->addMinutes(rand(60, 240));
            TeacherAttendance::create([
                'teacher_id' => $teacher->id,
                'supervisor_id' => $supervisor->id,
                'school_year_id' => $schoolYear->id,
                'attendance_date' => $date->toDateString(),
                'scanned_at' => $tempExitTime,
                'is_present' => true,
                'event_type' => 'exit',
                'work_hours' => 0,
                'late_minutes' => 0,
                'early_departure_minutes' => 0,
                'notes' => 'Sortie temporaire'
            ]);

            // Retour
            $tempReturnTime = $tempExitTime->copy()->addMinutes(rand(15, 90));
            $totalExtraTime += $tempReturnTime->diffInMinutes($tempExitTime);
            
            TeacherAttendance::create([
                'teacher_id' => $teacher->id,
                'supervisor_id' => $supervisor->id,
                'school_year_id' => $schoolYear->id,
                'attendance_date' => $date->toDateString(),
                'scanned_at' => $tempReturnTime,
                'is_present' => true,
                'event_type' => 'entry',
                'work_hours' => 0,
                'late_minutes' => 0,
                'early_departure_minutes' => 0,
                'notes' => 'Retour de sortie temporaire'
            ]);

            $lastMovementTime = $tempReturnTime;
        }

        // Heure de sortie finale
        $exitTime = $date->copy()
            ->setHour($expectedDeparture->hour)
            ->setMinute($expectedDeparture->minute)
            ->addMinutes($exitVariation);

        // S'assurer que la sortie est après le dernier mouvement
        if ($exitTime->lt($lastMovementTime)) {
            $exitTime = $lastMovementTime->copy()->addMinutes(rand(30, 120));
        }

        $earlyDepartureMinutes = 0;
        if ($exitTime->lt($date->copy()->setHour($expectedDeparture->hour)->setMinute($expectedDeparture->minute))) {
            $earlyDepartureMinutes = $date->copy()
                ->setHour($expectedDeparture->hour)
                ->setMinute($expectedDeparture->minute)
                ->diffInMinutes($exitTime);
        }

        // Calculer les heures travaillées totales
        $totalWorkMinutes = $exitTime->diffInMinutes($entryTime) - $totalExtraTime;
        $workHours = round($totalWorkMinutes / 60, 2);

        // Créer la sortie finale
        TeacherAttendance::create([
            'teacher_id' => $teacher->id,
            'supervisor_id' => $supervisor->id,
            'school_year_id' => $schoolYear->id,
            'attendance_date' => $date->toDateString(),
            'scanned_at' => $exitTime,
            'is_present' => true,
            'event_type' => 'exit',
            'work_hours' => $workHours,
            'late_minutes' => 0,
            'early_departure_minutes' => $earlyDepartureMinutes,
            'notes' => $earlyDepartureMinutes > 0 ? "Départ anticipé de {$earlyDepartureMinutes} minutes" : null
        ]);
    }
}