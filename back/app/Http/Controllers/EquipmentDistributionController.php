<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentEquipmentStatus;
use App\Models\SchoolYear;
use App\Models\School;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class EquipmentDistributionController extends Controller
{
    /**
     * Obtenir l'année scolaire de travail de l'utilisateur connecté
     * (Copié depuis StudentController pour cohérence)
     */
    private function getUserWorkingYear()
    {
        $user = Auth::user();

        // Si l'utilisateur a une année de travail définie, l'utiliser
        if ($user && $user->working_school_year_id) {
            $workingYear = SchoolYear::find($user->working_school_year_id);
            if ($workingYear && $workingYear->is_active) {
                return $workingYear;
            }
        }

        // Sinon, utiliser l'année courante par défaut
        $currentYear = SchoolYear::where('is_current', true)->first();

        if (!$currentYear) {
            // Si aucune année courante, prendre la première année active
            $currentYear = SchoolYear::where('is_active', true)->first();
        }

        return $currentYear;
    }

    /**
     * Obtenir l'historique de distribution des équipements
     */
    public function getDistributionHistory(Request $request)
    {
        try {
            $schoolYear = $this->getUserWorkingYear();
            
            if (!$schoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $query = StudentEquipmentStatus::with(['student.classSeries.schoolClass.level.school'])
                ->where('school_year_id', $schoolYear->id);

            // Filtrer par école si spécifié
            if ($request->has('school_id') && $request->school_id) {
                $query->whereHas('student.classSeries.schoolClass.level', function ($q) use ($request) {
                    $q->where('school_id', $request->school_id);
                });
            }

            // Filtrer par type d'équipement
            if ($request->has('equipment_type') && $request->equipment_type) {
                $query->where('equipment_type', $request->equipment_type);
            }

            $distributions = $query->orderBy('created_at', 'desc')->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $distributions,
                'message' => 'Historique récupéré avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getDistributionHistory: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'historique',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques de distribution par école
     */
    public function getDistributionStatistics(Request $request)
    {
        try {
            $schoolYear = $this->getUserWorkingYear();
            
            if (!$schoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $stats = [];
            $schools = School::with(['levels.schoolClasses.classSeries.students' => function ($q) use ($schoolYear) {
                $q->where('school_year_id', $schoolYear->id)->where('is_active', true);
            }])->get();

            foreach ($schools as $school) {
                $totalStudents = 0;
                $equipmentStats = [
                    'polo' => ['required' => 0, 'paid' => 0, 'received' => 0],
                    'blouse' => ['required' => 0, 'paid' => 0, 'received' => 0],
                    'laptop' => ['required' => 0, 'received' => 0],
                    'rame' => ['required' => 0, 'paid' => 0, 'physical' => 0]
                ];

                foreach ($school->levels as $level) {
                    foreach ($level->schoolClasses as $class) {
                        foreach ($class->classSeries as $series) {
                            $studentsInSeries = $series->students->count();
                            $totalStudents += $studentsInSeries;

                            // Déterminer quels équipements sont requis selon l'école et la filière
                            $requiredEquipment = $this->getRequiredEquipmentForClass($school->code, $class->name, $level->level_type);

                            if ($requiredEquipment['polo']) $equipmentStats['polo']['required'] += $studentsInSeries;
                            if ($requiredEquipment['blouse']) $equipmentStats['blouse']['required'] += $studentsInSeries;
                            if ($requiredEquipment['laptop']) $equipmentStats['laptop']['required'] += $studentsInSeries;
                            if ($requiredEquipment['rame']) $equipmentStats['rame']['required'] += $studentsInSeries;
                        }
                    }
                }

                // Calculer les statistiques réelles de distribution
                $schoolStudentIds = collect($school->levels)
                    ->flatMap(fn($level) => $level->schoolClasses)
                    ->flatMap(fn($class) => $class->classSeries)
                    ->flatMap(fn($series) => $series->students->pluck('id'))
                    ->toArray();

                if (!empty($schoolStudentIds)) {
                    $distributions = StudentEquipmentStatus::whereIn('student_id', $schoolStudentIds)
                        ->where('school_year_id', $schoolYear->id)
                        ->get()
                        ->groupBy('equipment_type');

                    foreach ($distributions as $equipmentType => $typeDistributions) {
                        if (isset($equipmentStats[$equipmentType])) {
                            $equipmentStats[$equipmentType]['paid'] = $typeDistributions->where('has_paid_for', true)->count();
                            $equipmentStats[$equipmentType]['received'] = $typeDistributions->where('has_received', true)->count();

                            if ($equipmentType === 'rame') {
                                $equipmentStats[$equipmentType]['physical'] = $typeDistributions->where('brought_physical', true)->count();
                            }
                        }
                    }
                }

                $stats[] = [
                    'school' => [
                        'id' => $school->id,
                        'name' => $school->name,
                        'code' => $school->code
                    ],
                    'total_students' => $totalStudents,
                    'equipment_stats' => $equipmentStats
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'Statistiques récupérées avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getDistributionStatistics: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marquer un équipement comme distribué
     */
    public function markEquipmentAsDistributed(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'equipment_type' => 'required|in:polo,blouse,laptop',
            'notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $schoolYear = $this->getUserWorkingYear();
            
            if (!$schoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $equipmentStatus = StudentEquipmentStatus::where([
                'student_id' => $request->student_id,
                'school_year_id' => $schoolYear->id,
                'equipment_type' => $request->equipment_type
            ])->first();

            if (!$equipmentStatus) {
                return response()->json([
                    'success' => false,
                    'message' => 'Statut d\'équipement non trouvé'
                ], 404);
            }

            if (!$equipmentStatus->has_paid_for) {
                return response()->json([
                    'success' => false,
                    'message' => 'L\'étudiant n\'a pas encore payé pour cet équipement'
                ], 422);
            }

            if ($equipmentStatus->has_received) {
                return response()->json([
                    'success' => false,
                    'message' => 'L\'étudiant a déjà reçu cet équipement'
                ], 422);
            }

            $equipmentStatus->update([
                'has_received' => true,
                'received_date' => Carbon::now(),
                'notes' => $equipmentStatus->notes . ($request->notes ? "\nDistribution: " . $request->notes : '')
            ]);

            return response()->json([
                'success' => true,
                'data' => $equipmentStatus->load('student'),
                'message' => 'Équipement marqué comme distribué avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Error in markEquipmentAsDistributed: ' . $e->getMessage(), [
                'student_id' => $request->student_id,
                'equipment_type' => $request->equipment_type,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marquer les rames comme apportées physiquement
     */
    public function markRamesAsPhysical(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $schoolYear = $this->getUserWorkingYear();
            
            if (!$schoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $rameStatus = StudentEquipmentStatus::updateOrCreate([
                'student_id' => $request->student_id,
                'school_year_id' => $schoolYear->id,
                'equipment_type' => 'rame'
            ], [
                'brought_physical' => true,
                'has_paid_for' => true, // Considéré comme payé
                'paid_date' => Carbon::now(),
                'notes' => $request->notes ?? 'Rames apportées physiquement'
            ]);

            return response()->json([
                'success' => true,
                'data' => $rameStatus->load('student'),
                'message' => 'Rames marquées comme apportées physiquement'
            ]);
        } catch (\Exception $e) {
            Log::error('Error in markRamesAsPhysical: ' . $e->getMessage(), [
                'student_id' => $request->student_id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les étudiants en attente de distribution
     */
    public function getPendingDistributions(Request $request)
    {
        try {
            $schoolYear = $this->getUserWorkingYear();
            
            if (!$schoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $query = StudentEquipmentStatus::with([
                'student.classSeries.schoolClass.level.school'
            ])
                ->where('school_year_id', $schoolYear->id)
                ->where('has_paid_for', true)
                ->where('has_received', false);

            if ($request->has('equipment_type') && $request->equipment_type) {
                $query->where('equipment_type', $request->equipment_type);
            }

            if ($request->has('school_id') && $request->school_id) {
                $query->whereHas('student.classSeries.schoolClass.level', function ($q) use ($request) {
                    $q->where('school_id', $request->school_id);
                });
            }

            $pending = $query->orderBy('paid_date', 'asc')->paginate(20);

            return response()->json([
                'success' => true,
                'data' => $pending,
                'message' => 'Distributions en attente récupérées avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getPendingDistributions: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des distributions en attente',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Déterminer les équipements requis pour une classe donnée
     */
    private function getRequiredEquipmentForClass($schoolCode, $className, $levelType)
    {
        $equipment = [
            'polo' => false,
            'blouse' => false,
            'laptop' => false,
            'rame' => true // Toutes les écoles ont les rames sauf ISTMS
        ];

        // Cas spécial ISTMS - pas de rames
        if ($schoolCode === 'ISTMS') {
            $equipment['rame'] = false;
            $equipment['blouse'] = true; // Toutes les filières ISTMS ont des blouses
            return $equipment;
        }

        // Déterminer blouse vs polo selon l'école
        if ($schoolCode === 'INSSAS') {
            $equipment['blouse'] = true; // Toutes les filières INSSAS ont des blouses
        } elseif ($schoolCode === 'ISTPM') {
            // ISTPM : blouse pour filières santé, polo pour autres
            $healthSpecialties = ['Aide-soignant', 'Auxiliaire', 'Technicien', 'Assistant Médical'];
            $equipment['blouse'] = collect($healthSpecialties)->some(
                fn($specialty) =>
                str_contains(strtolower($className), strtolower($specialty))
            );
            $equipment['polo'] = !$equipment['blouse'];
        } else {
            $equipment['polo'] = true; // ESGIT, ESJEC, ESSIT ont des polos
        }

        // Déterminer laptop selon l'école et le niveau
        if ($schoolCode === 'INSSAS') {
            $equipment['laptop'] = in_array($levelType, ['LICENCE_ACA', 'DOUBLE_DIPLOMATION', 'LICENCE_PRO']);
        } elseif ($schoolCode === 'ESGIT') {
            $equipment['laptop'] = true; // Tous les niveaux ESGIT
        } elseif ($schoolCode === 'ESJEC') {
            $equipment['laptop'] = in_array($levelType, ['BTS']);
        } else {
            $equipment['laptop'] = false; // ESSIT, ISTPM, ISTMS n'ont pas de laptops
        }

        return $equipment;
    }

    /**
     * Obtenir le statut des équipements pour un étudiant spécifique
     * Route: GET /equipment/student/{studentId}/status
     * MÉTHODE CORRIGÉE avec gestion d'erreurs améliorée
     */
    public function getStudentStatus($studentId)
    {
        try {
            // Vérifier d'abord si l'étudiant existe
            $student = Student::with(['classSeries.schoolClass.level.school'])->find($studentId);
            
            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Étudiant non trouvé'
                ], 404);
            }

            // Vérifier les relations nécessaires
            if (!$student->classSeries || 
                !$student->classSeries->schoolClass || 
                !$student->classSeries->schoolClass->level || 
                !$student->classSeries->schoolClass->level->school) {
                return response()->json([
                    'success' => false,
                    'message' => 'Relations manquantes pour l\'étudiant (série, classe, niveau ou école)',
                    'debug_info' => [
                        'student_id' => $studentId,
                        'has_classSeries' => !!$student->classSeries,
                        'has_schoolClass' => !!optional($student->classSeries)->schoolClass,
                        'has_level' => !!optional($student->classSeries->schoolClass)->level,
                        'has_school' => !!optional($student->classSeries->schoolClass->level)->school
                    ]
                ], 400);
            }

            $schoolYear = $this->getUserWorkingYear();

            if (!$schoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            // Déterminer les équipements requis selon l'école et la filière
            $requiredEquipments = $this->getRequiredEquipmentForClass(
                $student->classSeries->schoolClass->level->school->code,
                $student->classSeries->schoolClass->name,
                $student->classSeries->schoolClass->level->level_type
            );

            $equipmentStatus = [];

            foreach ($requiredEquipments as $equipmentType => $isRequired) {
                if ($isRequired) {
                    $status = StudentEquipmentStatus::where([
                        'student_id' => $studentId,
                        'school_year_id' => $schoolYear->id,
                        'equipment_type' => $equipmentType
                    ])->first();

                    $equipmentStatus[] = [
                        'equipment_type' => $equipmentType,
                        'is_required' => true,
                        'has_paid_for' => $status ? $status->has_paid_for : false,
                        'has_received' => $status ? $status->has_received : false,
                        'brought_physical' => $status ? ($status->brought_physical ?? false) : false,
                        'paid_date' => $status ? $status->paid_date : null,
                        'received_date' => $status ? $status->received_date : null,
                        'notes' => $status ? $status->notes : null,
                        'status' => $this->getEquipmentStatusLabel($status, $equipmentType)
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => $equipmentStatus,
                'message' => 'Statut des équipements récupéré avec succès',
                'debug_info' => [
                    'student_id' => $studentId,
                    'school_year_id' => $schoolYear->id,
                    'school_code' => $student->classSeries->schoolClass->level->school->code
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in getStudentStatus: ' . $e->getMessage(), [
                'student_id' => $studentId,
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du statut des équipements',
                'error' => $e->getMessage(),
                'debug_info' => [
                    'student_id' => $studentId,
                    'error_line' => $e->getLine(),
                    'error_file' => basename($e->getFile())
                ]
            ], 500);
        }
    }

    /**
     * Traiter une action sur un équipement
     * Route: POST /equipment/process-action
     */
    public function processAction(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'equipment_type' => 'required|in:polo,blouse,laptop,rame',
            'action' => 'required|in:mark_as_received,mark_as_paid,mark_physical_rames',
            'notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $schoolYear = $this->getUserWorkingYear();
            
            if (!$schoolYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $equipmentStatus = StudentEquipmentStatus::updateOrCreate([
                'student_id' => $request->student_id,
                'school_year_id' => $schoolYear->id,
                'equipment_type' => $request->equipment_type
            ]);

            switch ($request->action) {
                case 'mark_as_received':
                    if (!$equipmentStatus->has_paid_for) {
                        return response()->json([
                            'success' => false,
                            'message' => 'L\'étudiant doit d\'abord payer pour cet équipement'
                        ], 422);
                    }

                    $equipmentStatus->update([
                        'has_received' => true,
                        'received_date' => Carbon::now(),
                        'notes' => $equipmentStatus->notes . ($request->notes ? "Réception:" . $request->notes : '')
                    ]);
                    break;

                case 'mark_as_paid':
                    $equipmentStatus->update([
                        'has_paid_for' => true,
                        'paid_date' => Carbon::now(),
                        'notes' => $equipmentStatus->notes . ($request->notes ? "Paiement:" . $request->notes : '')
                    ]);
                    break;

                case 'mark_physical_rames':
                    if ($request->equipment_type !== 'rame') {
                        return response()->json([
                            'success' => false,
                            'message' => 'Cette action n\'est applicable qu\'aux rames'
                        ], 422);
                    }

                    $equipmentStatus->update([
                        'brought_physical' => true,
                        'has_paid_for' => true,
                        'paid_date' => Carbon::now(),
                        'has_received' => true,
                        'received_date' => Carbon::now(),
                        'notes' => $request->notes ?? 'Rames apportées physiquement'
                    ]);
                    break;
            }

            return response()->json([
                'success' => true,
                'data' => $equipmentStatus->load('student'),
                'message' => 'Action effectuée avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Error in processAction: ' . $e->getMessage(), [
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du traitement de l\'action',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir le libellé du statut d'un équipement
     */
    private function getEquipmentStatusLabel($status, $equipmentType)
    {
        if (!$status) {
            return 'not_paid';
        }

        if ($equipmentType === 'rame' && $status->brought_physical) {
            return 'physical_received';
        }

        if ($status->has_received) {
            return 'paid_and_received';
        }

        if ($status->has_paid_for) {
            return 'paid_pending';
        }

        return 'not_paid';
    }
}