<?php

namespace App\Http\Controllers;

use App\Models\SupervisorClassAssignment;
use App\Models\Attendance;
use App\Models\Student;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\User;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class SupervisorController extends Controller
{
    public function __construct()
    {
        // Middleware JWT sera appliqué dans les routes
    }

    public function assignSupervisorToClass(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'supervisor_id' => 'required|exists:users,id',
            'school_class_id' => 'required|exists:school_classes,id',
            'school_year_id' => 'required|exists:school_years,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        // Vérifier que l'utilisateur est bien un surveillant général
        $supervisor = User::find($request->supervisor_id);
        if ($supervisor->role !== 'surveillant_general') {
            return response()->json([
                'success' => false,
                'message' => 'L\'utilisateur n\'est pas un surveillant général'
            ], 403);
        }

        try {
            $assignment = SupervisorClassAssignment::create([
                'supervisor_id' => $request->supervisor_id,
                'school_class_id' => $request->school_class_id,
                'school_year_id' => $request->school_year_id,
                'is_active' => true
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Surveillant affecté à la classe avec succès',
                'data' => $assignment->load(['supervisor', 'schoolClass', 'schoolYear'])
            ]);
        } catch (\Exception $e) {
            if ($e->getCode() == '23000') {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce surveillant est déjà affecté à cette classe pour cette année scolaire'
                ], 422);
            }

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'affectation'
            ], 500);
        }
    }

    public function getSupervisorAssignments($supervisorId)
    {
        $assignments = SupervisorClassAssignment::with(['schoolClass', 'schoolYear'])
            ->forSupervisor($supervisorId)
            ->active()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $assignments
        ]);
    }

    public function scanStudentQR(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_qr_code' => 'required|string',
            'supervisor_id' => 'required|exists:users,id',
            'event_type' => 'nullable|in:entry,exit,auto'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        // Décoder le QR code pour obtenir l'ID de l'étudiant
        $studentId = $this->decodeStudentQR($request->student_qr_code);
        
        if (!$studentId) {
            return response()->json([
                'success' => false,
                'message' => 'Code QR invalide'
            ], 422);
        }

        $student = Student::find($studentId);
        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Étudiant introuvable'
            ], 404);
        }

        // Obtenir l'année scolaire active
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        if (!$currentSchoolYear) {
            return response()->json([
                'success' => false,
                'message' => 'Aucune année scolaire active trouvée'
            ], 422);
        }

        // Obtenir la school_class_id via la relation classSeries
        $student->load('classSeries');
        $schoolClassId = $student->classSeries ? $student->classSeries->class_id : null;
        
        if (!$schoolClassId) {
            return response()->json([
                'success' => false,
                'message' => 'Classe de l\'étudiant introuvable',
                'student_name' => $student->full_name
            ], 422);
        }

        // Vérifier si l'utilisateur est bien un surveillant général
        $supervisor = User::find($request->supervisor_id);
        if ($supervisor->role !== 'surveillant_general') {
            return response()->json([
                'success' => false,
                'message' => 'Vous n\'êtes pas autorisé à marquer la présence',
                'student_name' => $student->full_name,
                'class_name' => $student->classSeries->name ?? 'Classe inconnue'
            ], 403);
        }

        // Un surveillant général a accès à tous les élèves de l'établissement

        $today = Carbon::today();
        $eventType = $request->event_type;

        // Si mode automatique, déterminer le type d'événement selon le dernier scan
        if ($eventType === 'auto' || $eventType === null) {
            // Obtenir la dernière activité de l'élève aujourd'hui (entrée ou sortie)
            $lastActivity = Attendance::where('student_id', $studentId)
                ->forDate($today)
                ->whereIn('event_type', ['entry', 'exit'])
                ->orderBy('scanned_at', 'desc')
                ->first();
            
            // Logique automatique basée sur la dernière activité :
            // - Si aucune activité aujourd'hui -> entrée
            // - Si dernière activité = entrée -> sortie
            // - Si dernière activité = sortie -> entrée (re-entrée)
            if (!$lastActivity) {
                $eventType = 'entry';
            } elseif ($lastActivity->event_type === 'entry') {
                $eventType = 'exit';
            } else {
                // Dernière activité était une sortie, donc prochaine sera une entrée
                $eventType = 'entry';
            }
        }

        // Validation basée sur la dernière activité
        $lastActivity = Attendance::where('student_id', $studentId)
            ->forDate($today)
            ->whereIn('event_type', ['entry', 'exit'])
            ->orderBy('scanned_at', 'desc')
            ->first();

        if ($eventType === 'entry') {
            // Pour une entrée, vérifier que la dernière activité n'était pas déjà une entrée
            if ($lastActivity && $lastActivity->event_type === 'entry') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cet élève est déjà entré aujourd\'hui à ' . $lastActivity->scanned_at->format('H:i') . '. Il doit d\'abord sortir avant de pouvoir rentrer.',
                    'student_name' => $student->full_name,
                    'marked_at' => $lastActivity->scanned_at->format('H:i')
                ], 422);
            }
        } else {
            // Pour une sortie, vérifier qu'il y a eu une entrée et que la dernière activité n'était pas déjà une sortie
            if (!$lastActivity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune entrée trouvée pour cet élève aujourd\'hui. Il doit d\'abord entrer.',
                    'student_name' => $student->full_name
                ], 422);
            }

            if ($lastActivity->event_type === 'exit') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cet élève est déjà sorti aujourd\'hui à ' . $lastActivity->scanned_at->format('H:i') . '.',
                    'student_name' => $student->full_name,
                    'marked_at' => $lastActivity->scanned_at->format('H:i')
                ], 422);
            }
        }

        try {
            $attendance = Attendance::create([
                'student_id' => $studentId,
                'supervisor_id' => $request->supervisor_id,
                'school_class_id' => $schoolClassId,
                'school_year_id' => $currentSchoolYear->id,
                'attendance_date' => $today,
                'scanned_at' => Carbon::now(),
                'is_present' => $eventType === 'entry', // true pour entrée, false pour sortie
                'event_type' => $eventType
            ]);

            // Envoyer notification WhatsApp aux parents (ne pas faire échouer si erreur notification)
            try {
                $whatsAppService = new WhatsAppService();
                $whatsAppService->sendAttendanceNotification($attendance);
            } catch (\Exception $notificationError) {
                // Log l'erreur mais continue le processus
                \Log::warning('Erreur notification WhatsApp: ' . $notificationError->getMessage());
            }

            $eventLabel = $eventType === 'entry' ? 'Entrée' : 'Sortie';
            
            return response()->json([
                'success' => true,
                'message' => $eventLabel . ' enregistrée avec succès',
                'data' => [
                    'student_name' => $student->full_name,
                    'class_name' => $student->classSeries->name ?? 'Classe inconnue',
                    'event_type' => $eventType,
                    'event_label' => $eventLabel,
                    'marked_at' => $attendance->scanned_at->format('H:i'),
                    'date' => $attendance->attendance_date->format('d/m/Y')
                ]
            ]);
        } catch (\Exception $e) {
            // Log l'erreur pour debugging
            \Log::error('Erreur enregistrement attendance: ' . $e->getMessage(), [
                'student_id' => $studentId,
                'event_type' => $eventType,
                'supervisor_id' => $request->supervisor_id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement de la ' . ($eventType === 'entry' ? 'entrée' : 'sortie') . ': ' . $e->getMessage(),
                'error_details' => $e->getMessage()
            ], 500);
        }
    }

    public function getDailyAttendance(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'supervisor_id' => 'required|exists:users,id',
            'date' => 'nullable|date',
            'class_id' => 'nullable|exists:school_classes,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $supervisorId = $request->supervisor_id;
        $date = $request->date ? Carbon::parse($request->date) : Carbon::today();
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();

        // Vérifier si le superviseur connecté correspond au superviseur demandé
        if (auth()->user()->id != $supervisorId && auth()->user()->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez voir que vos propres présences'
            ], 403);
        }

        // Vérifier que l'utilisateur est bien un surveillant général
        $supervisor = User::find($supervisorId);
        if ($supervisor->role !== 'surveillant_general') {
            return response()->json([
                'success' => false,
                'message' => 'Vous n\'êtes pas autorisé à consulter les présences'
            ], 403);
        }

        // Un surveillant général a accès à toutes les classes de l'établissement
        $query = Attendance::with(['student', 'schoolClass'])
            ->forDate($date)
            ->forSchoolYear($currentSchoolYear->id);

        if ($request->class_id) {
            $query->forClass($request->class_id);
        }

        $attendances = $query->orderBy('scanned_at')->get();

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $date->format('d/m/Y'),
                'total_present' => $attendances->count(),
                'attendances' => $attendances
            ]
        ]);
    }

    public function getAttendanceRange(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'supervisor_id' => 'required|exists:users,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'class_id' => 'nullable|exists:school_classes,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $supervisorId = $request->supervisor_id;
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();

        // Vérifier si le superviseur connecté correspond au superviseur demandé
        if (auth()->user()->id != $supervisorId && auth()->user()->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Vous ne pouvez voir que vos propres présences'
            ], 403);
        }

        // Vérifier que l'utilisateur est bien un surveillant général
        $supervisor = User::find($supervisorId);
        if ($supervisor->role !== 'surveillant_general') {
            return response()->json([
                'success' => false,
                'message' => 'Vous n\'êtes pas autorisé à consulter les présences'
            ], 403);
        }

        // Un surveillant général a accès à toutes les classes de l'établissement
        $query = Attendance::with(['student', 'schoolClass', 'supervisor'])
            ->forDateRange($request->start_date, $request->end_date)
            ->forSchoolYear($currentSchoolYear->id);

        if ($request->class_id) {
            $query->forClass($request->class_id);
        }

        $attendances = $query->orderBy('attendance_date', 'desc')
            ->orderBy('scanned_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'total_records' => $attendances->count(),
                'attendances' => $attendances
            ]
        ]);
    }

    public function markAbsentStudents(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'supervisor_id' => 'required|exists:users,id',
            'school_class_id' => 'required|exists:school_classes,id',
            'attendance_date' => 'required|date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $supervisorId = $request->supervisor_id;
        $classId = $request->school_class_id;
        $attendanceDate = $request->attendance_date;
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();

        // Vérifier que l'utilisateur est bien un surveillant général
        $supervisor = User::find($supervisorId);
        if ($supervisor->role !== 'surveillant_general') {
            return response()->json([
                'success' => false,
                'message' => 'Vous n\'êtes pas autorisé à marquer les absences'
            ], 403);
        }

        // Un surveillant général a accès à toutes les classes de l'établissement

        // Obtenir tous les étudiants actifs de cette classe
        $allStudents = Student::whereHas('classSeries', function($query) use ($classId) {
            $query->where('class_id', $classId);
        })
        ->where('is_active', true)
        ->get();

        // Obtenir les étudiants qui sont entrés aujourd'hui (ont au moins une entrée)
        // Un élève est considéré comme présent s'il est entré au moins une fois, même s'il est sorti
        $presentStudentIds = Attendance::where('school_class_id', $classId)
            ->where('attendance_date', $attendanceDate)
            ->where('event_type', 'entry') // Seules les entrées comptent comme présences
            ->where('is_present', true) // S'assurer que c'est une vraie entrée (pas une absence marquée)
            ->pluck('student_id')
            ->unique()
            ->toArray();

        // Étudiants absents = tous les étudiants - ceux présents
        $absentStudents = $allStudents->whereNotIn('id', $presentStudentIds);

        $createdCount = 0;
        $whatsAppService = new WhatsAppService();

        foreach ($absentStudents as $student) {
            // Vérifier si l'étudiant n'a pas déjà un enregistrement d'absence
            $existingRecord = Attendance::where('student_id', $student->id)
                ->where('attendance_date', $attendanceDate)
                ->first();

            if (!$existingRecord) {
                try {
                    $attendance = Attendance::create([
                        'student_id' => $student->id,
                        'supervisor_id' => $supervisorId,
                        'school_class_id' => $classId,
                        'school_year_id' => $currentSchoolYear->id,
                        'attendance_date' => $attendanceDate,
                        'scanned_at' => now()->format('H:i:s'),
                        'is_present' => false,
                        'event_type' => 'entry', // Marqué comme absence d'entrée
                        'parent_notified' => false,
                        'notified_at' => null,
                    ]);

                    // Envoyer notification WhatsApp aux parents pour absence
                    try {
                        $whatsAppService->sendAttendanceNotification($attendance);
                        $attendance->update([
                            'parent_notified' => true,
                            'notified_at' => now()
                        ]);
                    } catch (\Exception $e) {
                        // Log l'erreur mais ne pas faire échouer l'opération
                        \Log::warning('Erreur notification WhatsApp absence: ' . $e->getMessage());
                    }

                    $createdCount++;
                } catch (\Exception $e) {
                    // Log l'erreur mais continuer avec les autres étudiants
                    \Log::error('Erreur création attendance absence: ' . $e->getMessage());
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => "{$createdCount} étudiant(s) marqué(s) comme absent(s)",
            'data' => [
                'total_students' => $allStudents->count(),
                'present_students' => count($presentStudentIds),
                'absent_students_marked' => $createdCount,
                'attendance_date' => $attendanceDate
            ]
        ]);
    }

    public function markAllAbsentStudents(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'supervisor_id' => 'required|exists:users,id',
            'attendance_date' => 'required|date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $supervisorId = $request->supervisor_id;
        $attendanceDate = $request->attendance_date;
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();

        // Vérifier que l'utilisateur est bien un surveillant général
        $supervisor = User::find($supervisorId);
        if ($supervisor->role !== 'surveillant_general') {
            return response()->json([
                'success' => false,
                'message' => 'Vous n\'êtes pas autorisé à marquer les absences'
            ], 403);
        }

        // Obtenir tous les étudiants actifs de l'établissement
        $allStudents = Student::where('is_active', true)->get();

        // Obtenir les étudiants qui sont entrés aujourd'hui (ont au moins une entrée)
        // Un élève est considéré comme présent s'il est entré au moins une fois, même s'il est sorti
        $presentStudentIds = Attendance::where('attendance_date', $attendanceDate)
            ->where('event_type', 'entry') // Seules les entrées comptent comme présences
            ->where('is_present', true) // S'assurer que c'est une vraie entrée (pas une absence marquée)
            ->pluck('student_id')
            ->unique()
            ->toArray();

        // Étudiants absents = tous les étudiants - ceux présents
        $absentStudents = $allStudents->whereNotIn('id', $presentStudentIds);

        $createdCount = 0;
        $whatsAppService = new WhatsAppService();
        $classStats = [];

        foreach ($absentStudents as $student) {
            // Vérifier si l'étudiant n'a pas déjà un enregistrement d'absence
            $existingRecord = Attendance::where('student_id', $student->id)
                ->where('attendance_date', $attendanceDate)
                ->first();

            if (!$existingRecord) {
                // Obtenir la classe de l'étudiant
                $student->load('classSeries');
                $schoolClassId = $student->classSeries ? $student->classSeries->class_id : null;
                
                if ($schoolClassId) {
                    try {
                        $attendance = Attendance::create([
                            'student_id' => $student->id,
                            'supervisor_id' => $supervisorId,
                            'school_class_id' => $schoolClassId,
                            'school_year_id' => $currentSchoolYear->id,
                            'attendance_date' => $attendanceDate,
                            'scanned_at' => now()->format('H:i:s'),
                            'is_present' => false,
                            'event_type' => 'entry', // Marqué comme absence d'entrée
                            'parent_notified' => false,
                            'notified_at' => null,
                        ]);

                        // Envoyer notification WhatsApp aux parents pour absence
                        try {
                            $whatsAppService->sendAttendanceNotification($attendance);
                            $attendance->update([
                                'parent_notified' => true,
                                'notified_at' => now()
                            ]);
                        } catch (\Exception $e) {
                            // Log l'erreur mais ne pas faire échouer l'opération
                            \Log::warning('Erreur notification WhatsApp absence: ' . $e->getMessage());
                        }

                        $createdCount++;
                        
                        // Statistiques par classe
                        $className = $student->classSeries->name ?? 'Classe inconnue';
                        if (!isset($classStats[$className])) {
                            $classStats[$className] = 0;
                        }
                        $classStats[$className]++;
                        
                    } catch (\Exception $e) {
                        // Log l'erreur mais continuer avec les autres étudiants
                        \Log::error('Erreur création attendance absence: ' . $e->getMessage());
                    }
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => "{$createdCount} étudiant(s) marqué(s) comme absent(s) dans l'établissement",
            'data' => [
                'total_students' => $allStudents->count(),
                'present_students' => count($presentStudentIds),
                'absent_students_marked' => $createdCount,
                'attendance_date' => $attendanceDate,
                'class_statistics' => $classStats
            ]
        ]);
    }

    public function getAllAssignments()
    {
        $assignments = SupervisorClassAssignment::with(['supervisor', 'schoolClass', 'schoolYear'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $assignments
        ]);
    }

    /**
     * Obtenir toutes les classes disponibles pour un surveillant général
     */
    public function getAvailableClasses($supervisorId)
    {
        // Vérifier que l'utilisateur est bien un surveillant général
        $supervisor = User::find($supervisorId);
        if (!$supervisor || $supervisor->role !== 'surveillant_general') {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non autorisé'
            ], 403);
        }

        // Un surveillant général a accès à toutes les classes de l'établissement
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();
        $classes = SchoolClass::with(['level', 'series'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'classes' => $classes,
                'school_year' => $currentSchoolYear,
                'message' => 'En tant que surveillant général, vous avez accès à toutes les classes'
            ]
        ]);
    }

    public function deleteAssignment($assignmentId)
    {
        try {
            $assignment = SupervisorClassAssignment::findOrFail($assignmentId);
            $assignment->delete();

            return response()->json([
                'success' => true,
                'message' => 'Affectation supprimée avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression'
            ], 500);
        }
    }

    public function generateStudentQR($studentId)
    {
        $student = Student::find($studentId);
        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Étudiant introuvable'
            ], 404);
        }

        // Generate QR code content
        $qrContent = "STUDENT_ID_" . $student->id;
        
        return response()->json([
            'success' => true,
            'data' => [
                'student_id' => $student->id,
                'student_name' => $student->full_name,
                'qr_content' => $qrContent,
                'qr_url' => "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . urlencode($qrContent)
            ]
        ]);
    }

    public function generateAllStudentQRs()
    {
        $students = Student::where('is_active', true)->get();
        $qrCodes = [];

        foreach ($students as $student) {
            $qrContent = "STUDENT_ID_" . $student->id;
            $qrCodes[] = [
                'student_id' => $student->id,
                'student_name' => $student->full_name,
                'student_number' => $student->student_number,
                'class_name' => $student->classSeries->name ?? 'N/A',
                'qr_content' => $qrContent,
                'qr_url' => "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . urlencode($qrContent)
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_students' => count($qrCodes),
                'qr_codes' => $qrCodes
            ]
        ]);
    }

    private function decodeStudentQR($qrCode)
    {
        // Format attendu du QR code: "STUDENT_ID_123" ou simplement "123"
        if (str_starts_with($qrCode, 'STUDENT_ID_')) {
            return (int) str_replace('STUDENT_ID_', '', $qrCode);
        }
        
        // Si c'est juste un nombre
        if (is_numeric($qrCode)) {
            return (int) $qrCode;
        }
        
        return null;
    }

    public function getEntryExitStats(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'supervisor_id' => 'required|exists:users,id',
            'date' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        $supervisorId = $request->supervisor_id;
        $date = $request->date ? Carbon::parse($request->date) : Carbon::today();
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();

        // Vérifier que l'utilisateur est bien un surveillant général
        $supervisor = User::find($supervisorId);
        if ($supervisor->role !== 'surveillant_general') {
            return response()->json([
                'success' => false,
                'message' => 'Vous n\'êtes pas autorisé à consulter les statistiques'
            ], 403);
        }

        // Statistiques globales du jour
        $totalEntries = Attendance::forDate($date)
            ->forSchoolYear($currentSchoolYear->id)
            ->where('event_type', 'entry')
            ->count();

        $totalExits = Attendance::forDate($date)
            ->forSchoolYear($currentSchoolYear->id)
            ->where('event_type', 'exit')
            ->count();

        // Élèves qui sont entrés au moins une fois aujourd'hui (présents, même s'ils sont sortis)
        $studentsWhoEntered = Attendance::forDate($date)
            ->forSchoolYear($currentSchoolYear->id)
            ->where('event_type', 'entry')
            ->where('is_present', true) // Vraies entrées seulement
            ->pluck('student_id')
            ->unique();

        // Élèves actuellement dans l'établissement (entrés mais pas encore sortis)
        $exitedStudentIds = Attendance::forDate($date)
            ->forSchoolYear($currentSchoolYear->id)
            ->where('event_type', 'exit')
            ->pluck('student_id')
            ->unique();

        $currentlyPresent = $studentsWhoEntered->diff($exitedStudentIds)->count();

        // Détails par classe
        $classStats = Attendance::with(['schoolClass'])
            ->forDate($date)
            ->forSchoolYear($currentSchoolYear->id)
            ->selectRaw('school_class_id, event_type, COUNT(*) as count')
            ->groupBy('school_class_id', 'event_type')
            ->get()
            ->groupBy('school_class_id')
            ->map(function($classAttendances) {
                $entries = $classAttendances->where('event_type', 'entry')->sum('count');
                $exits = $classAttendances->where('event_type', 'exit')->sum('count');
                $className = $classAttendances->first()->schoolClass->name ?? 'Classe inconnue';
                
                return [
                    'class_name' => $className,
                    'entries' => $entries,
                    'exits' => $exits,
                    'currently_present' => $entries - $exits
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $date->format('d/m/Y'),
                'global_stats' => [
                    'total_entries' => $totalEntries,
                    'total_exits' => $totalExits,
                    'currently_present' => $currentlyPresent
                ],
                'class_stats' => $classStats->values()
            ]
        ]);
    }

    public function getStudentCurrentStatus(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_qr_code' => 'required|string',
            'supervisor_id' => 'required|exists:users,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        // Décoder le QR code pour obtenir l'ID de l'étudiant
        $studentId = $this->decodeStudentQR($request->student_qr_code);
        
        if (!$studentId) {
            return response()->json([
                'success' => false,
                'message' => 'Code QR invalide'
            ], 422);
        }

        $student = Student::with('classSeries')->find($studentId);
        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Étudiant introuvable'
            ], 404);
        }

        $today = Carbon::today();
        $currentSchoolYear = SchoolYear::where('is_active', true)->first();

        // Vérifier les entrées et sorties du jour
        $todayEntry = Attendance::where('student_id', $studentId)
            ->forDate($today)
            ->forSchoolYear($currentSchoolYear->id)
            ->where('event_type', 'entry')
            ->first();

        $todayExit = Attendance::where('student_id', $studentId)
            ->forDate($today)
            ->forSchoolYear($currentSchoolYear->id)
            ->where('event_type', 'exit')
            ->first();

        // Déterminer le statut actuel
        $currentStatus = 'not_entered'; // pas encore entré
        $nextAction = 'entry';
        $statusMessage = 'Pas encore entré aujourd\'hui';

        if ($todayEntry && !$todayExit) {
            $currentStatus = 'present';
            $nextAction = 'exit';
            $statusMessage = 'Présent (entré à ' . $todayEntry->scanned_at->format('H:i') . ')';
        } elseif ($todayEntry && $todayExit) {
            $currentStatus = 'exited';
            $nextAction = 'entry';
            $statusMessage = 'Sorti (à ' . $todayExit->scanned_at->format('H:i') . ')';
        }

        return response()->json([
            'success' => true,
            'data' => [
                'student_name' => $student->full_name,
                'class_name' => $student->classSeries->name ?? 'Classe inconnue',
                'current_status' => $currentStatus,
                'status_message' => $statusMessage,
                'next_action' => $nextAction,
                'entry_time' => $todayEntry ? $todayEntry->scanned_at->format('H:i') : null,
                'exit_time' => $todayExit ? $todayExit->scanned_at->format('H:i') : null
            ]
        ]);
    }
}