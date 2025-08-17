<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\TeacherAttendance;
use App\Models\SchoolYear;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TeacherAttendanceController extends Controller
{
    /**
     * Scan QR code d'un enseignant pour enregistrer sa présence
     */
    public function scanQR(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'teacher_qr_code' => 'required|string',
                'supervisor_id' => 'required|exists:users,id',
                'event_type' => 'sometimes|in:entry,exit,auto'
            ]);

            // Trouver l'enseignant par son QR code
            $teacher = Teacher::where('qr_code', $request->teacher_qr_code)
                            ->where('is_active', true)
                            ->first();

            if (!$teacher) {
                return response()->json([
                    'success' => false,
                    'message' => 'QR Code enseignant non trouvé ou enseignant inactif'
                ], 404);
            }

            // Obtenir l'année scolaire actuelle
            $currentSchoolYear = SchoolYear::where('is_current', true)->first();
            if (!$currentSchoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire active trouvée'
                ], 400);
            }

            $now = Carbon::now();
            $today = $now->toDateString();
            $eventType = $request->event_type ?? 'auto';

            // Auto-détection du type d'événement si nécessaire
            if ($eventType === 'auto') {
                $lastAttendance = TeacherAttendance::forTeacher($teacher->id)
                    ->forDate($today)
                    ->latest('scanned_at')
                    ->first();

                if (!$lastAttendance || $lastAttendance->event_type === 'exit') {
                    $eventType = 'entry';
                } else {
                    $eventType = 'exit';
                }
            }

            // Vérifier les doublons récents (dans les 5 dernières minutes)
            $recentScan = TeacherAttendance::forTeacher($teacher->id)
                ->where('event_type', $eventType)
                ->where('scanned_at', '>=', $now->subMinutes(5))
                ->exists();

            if ($recentScan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Scan déjà enregistré récemment pour ce type d\'événement'
                ], 400);
            }

            // Calculer les données de ponctualité
            $lateMinutes = 0;
            $earlyDepartureMinutes = 0;
            $workHours = 0;

            if ($eventType === 'entry') {
                // Calculer le retard pour l'entrée
                $expectedArrival = Carbon::createFromFormat('H:i:s', $teacher->expected_arrival_time ?: '08:00:00');
                $actualArrival = $now;
                
                if ($actualArrival->gt($expectedArrival)) {
                    $lateMinutes = $actualArrival->diffInMinutes($expectedArrival);
                }
            } elseif ($eventType === 'exit') {
                // Calculer le départ anticipé et les heures travaillées
                $expectedDeparture = Carbon::createFromFormat('H:i:s', $teacher->expected_departure_time ?: '17:00:00');
                $actualDeparture = $now;
                
                if ($actualDeparture->lt($expectedDeparture)) {
                    $earlyDepartureMinutes = $expectedDeparture->diffInMinutes($actualDeparture);
                }

                // Calculer les heures travaillées basées sur l'entrée du jour
                $todayEntry = TeacherAttendance::forTeacher($teacher->id)
                    ->forDate($today)
                    ->where('event_type', 'entry')
                    ->latest('scanned_at')
                    ->first();

                if ($todayEntry) {
                    $workHours = Carbon::parse($todayEntry->scanned_at)->diffInHours($now, true);
                }
            }

            // Créer l'enregistrement de présence
            $attendance = TeacherAttendance::create([
                'teacher_id' => $teacher->id,
                'supervisor_id' => $request->supervisor_id,
                'school_year_id' => $currentSchoolYear->id,
                'attendance_date' => $today,
                'scanned_at' => $now,
                'is_present' => true,
                'event_type' => $eventType,
                'work_hours' => $workHours,
                'late_minutes' => $lateMinutes,
                'early_departure_minutes' => $earlyDepartureMinutes,
                'notes' => null
            ]);

            // Charger les relations pour la réponse
            $attendance->load(['teacher', 'supervisor']);

            // Message de confirmation
            $message = $eventType === 'entry' 
                ? "Entrée enregistrée pour {$teacher->full_name}"
                : "Sortie enregistrée pour {$teacher->full_name}";

            if ($lateMinutes > 0) {
                $message .= " (Retard: {$lateMinutes} min)";
            }
            if ($earlyDepartureMinutes > 0) {
                $message .= " (Départ anticipé: {$earlyDepartureMinutes} min)";
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'attendance' => $attendance,
                    'teacher' => [
                        'id' => $teacher->id,
                        'full_name' => $teacher->full_name,
                        'email' => $teacher->email
                    ],
                    'event_type' => $eventType,
                    'punctuality_info' => [
                        'late_minutes' => $lateMinutes,
                        'early_departure_minutes' => $earlyDepartureMinutes,
                        'work_hours' => $workHours,
                        'status' => $attendance->punctuality_status
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement de la présence: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Générer un QR code pour un enseignant
     */
    public function generateQRCode(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'teacher_id' => 'required|exists:teachers,id'
            ]);

            $teacher = Teacher::findOrFail($request->teacher_id);

            // Générer un code QR unique s'il n'en a pas
            if (!$teacher->qr_code) {
                $qrCode = 'TCH_' . strtoupper(Str::random(8)) . '_' . $teacher->id;
                $teacher->update(['qr_code' => $qrCode]);
            }

            // Générer l'image QR code
            $qrCodeImage = QrCode::format('png')
                ->size(300)
                ->margin(1)
                ->generate($teacher->qr_code);

            // Sauvegarder l'image
            $fileName = "teacher_qr_codes/teacher_{$teacher->id}_qr.png";
            Storage::disk('public')->put($fileName, $qrCodeImage);

            return response()->json([
                'success' => true,
                'message' => 'QR Code généré avec succès',
                'data' => [
                    'teacher' => $teacher,
                    'qr_code' => $teacher->qr_code,
                    'qr_image_url' => Storage::disk('public')->url($fileName)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du QR code: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les présences quotidiennes des enseignants
     */
    public function getDailyAttendance(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'date' => 'sometimes|date',
                'supervisor_id' => 'sometimes|exists:users,id'
            ]);

            $date = $request->date ?? now()->toDateString();
            $query = TeacherAttendance::with(['teacher', 'supervisor'])
                ->forDate($date);

            if ($request->supervisor_id) {
                $query->where('supervisor_id', $request->supervisor_id);
            }

            $attendances = $query->latest('scanned_at')->get();

            // Grouper par enseignant et calculer les statistiques
            $teacherStats = [];
            foreach ($attendances->groupBy('teacher_id') as $teacherId => $teacherAttendances) {
                $teacher = $teacherAttendances->first()->teacher;
                $entryTime = $teacherAttendances->where('event_type', 'entry')->first();
                $exitTime = $teacherAttendances->where('event_type', 'exit')->first();
                
                $teacherStats[] = [
                    'teacher' => $teacher,
                    'entry_time' => $entryTime?->scanned_at,
                    'exit_time' => $exitTime?->scanned_at,
                    'is_present' => !$exitTime || $entryTime && $entryTime->scanned_at > $exitTime->scanned_at,
                    'late_minutes' => $entryTime?->late_minutes ?? 0,
                    'work_hours' => $exitTime?->work_hours ?? 0,
                    'punctuality_status' => $entryTime?->punctuality_status ?? 'absent'
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'date' => $date,
                    'attendances' => $attendances,
                    'teacher_stats' => $teacherStats,
                    'summary' => [
                        'total_scans' => $attendances->count(),
                        'present_teachers' => collect($teacherStats)->where('is_present', true)->count(),
                        'late_teachers' => collect($teacherStats)->where('late_minutes', '>', 0)->count()
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des présences: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques d'entrée/sortie des enseignants
     */
    public function getEntryExitStats(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'date' => 'sometimes|date',
                'supervisor_id' => 'sometimes|exists:users,id'
            ]);

            $date = $request->date ?? now()->toDateString();
            $query = TeacherAttendance::forDate($date);

            if ($request->supervisor_id) {
                $query->where('supervisor_id', $request->supervisor_id);
            }

            $entries = $query->clone()->entries()->count();
            $exits = $query->clone()->exits()->count();
            $lateTeachers = $query->clone()->late()->distinct('teacher_id')->count();
            $presentTeachers = $query->clone()->present()->distinct('teacher_id')->count();

            // Calculs pour les graphiques par heure
            $hourlyStats = [];
            for ($hour = 6; $hour <= 18; $hour++) {
                $hourStart = Carbon::createFromFormat('Y-m-d H:i:s', $date . ' ' . sprintf('%02d:00:00', $hour));
                $hourEnd = $hourStart->copy()->addHour();
                
                $hourlyEntries = TeacherAttendance::forDate($date)
                    ->entries()
                    ->whereBetween('scanned_at', [$hourStart, $hourEnd])
                    ->count();
                    
                $hourlyExits = TeacherAttendance::forDate($date)
                    ->exits()
                    ->whereBetween('scanned_at', [$hourStart, $hourEnd])
                    ->count();

                $hourlyStats[] = [
                    'hour' => $hour . 'h',
                    'entries' => $hourlyEntries,
                    'exits' => $hourlyExits
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'date' => $date,
                    'totals' => [
                        'entries' => $entries,
                        'exits' => $exits,
                        'late_teachers' => $lateTeachers,
                        'present_teachers' => $presentTeachers
                    ],
                    'hourly_stats' => $hourlyStats
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des statistiques: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir le rapport de présence d'un enseignant
     */
    public function getTeacherReport(Request $request, $teacherId): JsonResponse
    {
        try {
            $request->validate([
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date'
            ]);

            $teacher = Teacher::findOrFail($teacherId);
            $startDate = $request->start_date;
            $endDate = $request->end_date;

            // Obtenir les statistiques générales
            $stats = TeacherAttendance::getTeacherStats($teacherId, $startDate, $endDate);

            // Obtenir les présences détaillées
            $attendances = TeacherAttendance::forTeacher($teacherId)
                ->forDateRange($startDate, $endDate)
                ->with(['supervisor'])
                ->orderBy('attendance_date', 'desc')
                ->orderBy('scanned_at', 'desc')
                ->get();

            // Grouper par date
            $dailyAttendances = $attendances->groupBy('attendance_date')->map(function ($dayAttendances) {
                $entry = $dayAttendances->where('event_type', 'entry')->first();
                $exit = $dayAttendances->where('event_type', 'exit')->first();
                
                return [
                    'date' => $dayAttendances->first()->attendance_date,
                    'entry' => $entry,
                    'exit' => $exit,
                    'is_present' => $dayAttendances->where('is_present', true)->isNotEmpty(),
                    'work_hours' => $exit?->work_hours ?? 0,
                    'late_minutes' => $entry?->late_minutes ?? 0,
                    'early_departure_minutes' => $exit?->early_departure_minutes ?? 0,
                    'punctuality_status' => $entry?->punctuality_status ?? 'absent'
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'teacher' => $teacher,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate
                    ],
                    'statistics' => $stats,
                    'daily_attendances' => $dailyAttendances->values(),
                    'raw_attendances' => $attendances
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour les heures de travail attendues d'un enseignant
     */
    public function updateWorkSchedule(Request $request, $teacherId): JsonResponse
    {
        try {
            $request->validate([
                'expected_arrival_time' => 'sometimes|date_format:H:i',
                'expected_departure_time' => 'sometimes|date_format:H:i',
                'daily_work_hours' => 'sometimes|numeric|min:0|max:24'
            ]);

            $teacher = Teacher::findOrFail($teacherId);
            
            $updateData = [];
            if ($request->has('expected_arrival_time')) {
                $updateData['expected_arrival_time'] = $request->expected_arrival_time . ':00';
            }
            if ($request->has('expected_departure_time')) {
                $updateData['expected_departure_time'] = $request->expected_departure_time . ':00';
            }
            if ($request->has('daily_work_hours')) {
                $updateData['daily_work_hours'] = $request->daily_work_hours;
            }

            $teacher->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Horaires de travail mis à jour avec succès',
                'data' => [
                    'teacher' => $teacher->fresh()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour des horaires: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir la liste des enseignants avec leurs QR codes
     */
    public function getTeachersWithQR(): JsonResponse
    {
        try {
            $teachers = Teacher::active()
                ->select(['id', 'first_name', 'last_name', 'email', 'qr_code', 'expected_arrival_time', 'expected_departure_time', 'daily_work_hours'])
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'teachers' => $teachers,
                    'total' => $teachers->count(),
                    'with_qr_code' => $teachers->whereNotNull('qr_code')->count()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des enseignants: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques détaillées d'un enseignant avec timeline
     */
    public function getDetailedTeacherStats(Request $request, $teacherId): JsonResponse
    {
        try {
            $request->validate([
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date'
            ]);

            $teacher = Teacher::with(['attendances' => function ($query) use ($request) {
                $query->whereBetween('attendance_date', [$request->start_date, $request->end_date])
                      ->orderBy('attendance_date', 'desc')
                      ->orderBy('scanned_at', 'asc');
            }])->findOrFail($teacherId);

            $startDate = $request->start_date;
            $endDate = $request->end_date;

            // Obtenir toutes les présences pour la période
            $attendances = TeacherAttendance::forTeacher($teacherId)
                ->forDateRange($startDate, $endDate)
                ->with(['supervisor'])
                ->orderBy('attendance_date', 'desc')
                ->orderBy('scanned_at', 'asc')
                ->get();

            // Regrouper par date pour calculer les heures de travail quotidiennes
            $dailyDetails = [];
            $totalWorkHours = 0;
            $totalLateMinutes = 0;
            $totalEarlyDepartures = 0;
            $presentDays = 0;

            $attendancesByDate = $attendances->groupBy('attendance_date');

            foreach ($attendancesByDate as $date => $dayAttendances) {
                $entries = $dayAttendances->where('event_type', 'entry');
                $exits = $dayAttendances->where('event_type', 'exit');
                
                $firstEntry = $entries->first();
                $lastExit = $exits->last();
                
                $workHours = 0;
                $actualWorkStart = null;
                $actualWorkEnd = null;
                
                if ($firstEntry && $lastExit) {
                    $entryTime = Carbon::parse($firstEntry->scanned_at);
                    $exitTime = Carbon::parse($lastExit->scanned_at);
                    $workHours = $exitTime->diffInHours($entryTime, true);
                    $actualWorkStart = $entryTime->format('H:i:s');
                    $actualWorkEnd = $exitTime->format('H:i:s');
                }

                // Timeline des mouvements du jour
                $movements = $dayAttendances->map(function ($attendance) {
                    return [
                        'time' => Carbon::parse($attendance->scanned_at)->format('H:i:s'),
                        'type' => $attendance->event_type,
                        'late_minutes' => $attendance->late_minutes,
                        'early_departure_minutes' => $attendance->early_departure_minutes,
                        'supervisor' => $attendance->supervisor->name ?? 'N/A',
                        'notes' => $attendance->notes
                    ];
                })->toArray();

                $dayStats = [
                    'date' => $date,
                    'is_present' => $entries->isNotEmpty(),
                    'expected_start' => $teacher->expected_arrival_time,
                    'expected_end' => $teacher->expected_departure_time,
                    'actual_start' => $actualWorkStart,
                    'actual_end' => $actualWorkEnd,
                    'work_hours' => round($workHours, 2),
                    'expected_hours' => $teacher->daily_work_hours ?? 8,
                    'late_minutes' => $firstEntry?->late_minutes ?? 0,
                    'early_departure_minutes' => $lastExit?->early_departure_minutes ?? 0,
                    'total_movements' => $dayAttendances->count(),
                    'entries_count' => $entries->count(),
                    'exits_count' => $exits->count(),
                    'movements_timeline' => $movements,
                    'punctuality_status' => $this->calculatePunctualityStatus($firstEntry, $lastExit)
                ];

                $dailyDetails[] = $dayStats;

                if ($dayStats['is_present']) {
                    $presentDays++;
                    $totalWorkHours += $workHours;
                    $totalLateMinutes += $dayStats['late_minutes'];
                    if ($dayStats['early_departure_minutes'] > 0) {
                        $totalEarlyDepartures++;
                    }
                }
            }

            // Calculer les statistiques globales
            $totalDays = Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate)) + 1;
            $absentDays = $totalDays - $presentDays;
            $attendanceRate = $totalDays > 0 ? round(($presentDays / $totalDays) * 100, 2) : 0;
            $averageWorkHours = $presentDays > 0 ? round($totalWorkHours / $presentDays, 2) : 0;
            $averageLateMinutes = $presentDays > 0 ? round($totalLateMinutes / $presentDays, 1) : 0;

            // Statistiques par jour de la semaine
            $weekdayStats = [];
            foreach ($dailyDetails as $day) {
                $dayOfWeek = Carbon::parse($day['date'])->locale('fr')->dayName;
                if (!isset($weekdayStats[$dayOfWeek])) {
                    $weekdayStats[$dayOfWeek] = [
                        'total_days' => 0,
                        'present_days' => 0,
                        'total_hours' => 0,
                        'late_count' => 0
                    ];
                }
                $weekdayStats[$dayOfWeek]['total_days']++;
                if ($day['is_present']) {
                    $weekdayStats[$dayOfWeek]['present_days']++;
                    $weekdayStats[$dayOfWeek]['total_hours'] += $day['work_hours'];
                    if ($day['late_minutes'] > 0) {
                        $weekdayStats[$dayOfWeek]['late_count']++;
                    }
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'teacher' => $teacher,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'total_days' => $totalDays
                    ],
                    'summary_stats' => [
                        'total_days' => $totalDays,
                        'present_days' => $presentDays,
                        'absent_days' => $absentDays,
                        'attendance_rate' => $attendanceRate,
                        'total_work_hours' => round($totalWorkHours, 2),
                        'average_work_hours' => $averageWorkHours,
                        'expected_total_hours' => $totalDays * ($teacher->daily_work_hours ?? 8),
                        'total_late_minutes' => $totalLateMinutes,
                        'average_late_minutes' => $averageLateMinutes,
                        'early_departures_count' => $totalEarlyDepartures,
                        'total_movements' => $attendances->count()
                    ],
                    'daily_details' => $dailyDetails,
                    'weekday_analysis' => $weekdayStats,
                    'recent_movements' => $attendances->take(20)->map(function ($attendance) {
                        return [
                            'date' => $attendance->attendance_date,
                            'time' => Carbon::parse($attendance->scanned_at)->format('H:i:s'),
                            'type' => $attendance->event_type,
                            'late_minutes' => $attendance->late_minutes,
                            'supervisor' => $attendance->supervisor->name ?? 'N/A'
                        ];
                    })
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des statistiques: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculer le statut de ponctualité
     */
    private function calculatePunctualityStatus($entry, $exit)
    {
        $lateMinutes = $entry?->late_minutes ?? 0;
        $earlyDeparture = $exit?->early_departure_minutes ?? 0;

        if ($lateMinutes > 0 && $earlyDeparture > 0) {
            return 'late_and_early';
        } elseif ($lateMinutes > 0) {
            return 'late';
        } elseif ($earlyDeparture > 0) {
            return 'early_departure';
        } else {
            return 'punctual';
        }
    }

    /**
     * Obtenir la timeline des mouvements pour un enseignant sur une journée
     */
    public function getDayMovements(Request $request, $teacherId): JsonResponse
    {
        try {
            $request->validate([
                'date' => 'required|date'
            ]);

            $movements = TeacherAttendance::forTeacher($teacherId)
                ->forDate($request->date)
                ->with(['supervisor'])
                ->orderBy('scanned_at', 'asc')
                ->get();

            $timeline = $movements->map(function ($movement, $index) use ($movements) {
                $nextMovement = $movements->get($index + 1);
                $timeSpent = null;
                
                if ($nextMovement) {
                    $current = Carbon::parse($movement->scanned_at);
                    $next = Carbon::parse($nextMovement->scanned_at);
                    $timeSpent = $current->diffInMinutes($next);
                }

                return [
                    'id' => $movement->id,
                    'time' => Carbon::parse($movement->scanned_at)->format('H:i:s'),
                    'type' => $movement->event_type,
                    'type_label' => $movement->event_type === 'entry' ? 'Entrée' : 'Sortie',
                    'late_minutes' => $movement->late_minutes,
                    'early_departure_minutes' => $movement->early_departure_minutes,
                    'supervisor' => $movement->supervisor->name ?? 'N/A',
                    'notes' => $movement->notes,
                    'time_until_next' => $timeSpent,
                    'status' => [
                        'is_late' => $movement->late_minutes > 0,
                        'is_early_departure' => $movement->early_departure_minutes > 0,
                        'punctuality' => $movement->punctuality_status
                    ]
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'date' => $request->date,
                    'teacher_id' => $teacherId,
                    'movements_count' => $timeline->count(),
                    'timeline' => $timeline
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des mouvements: ' . $e->getMessage()
            ], 500);
        }
    }
}