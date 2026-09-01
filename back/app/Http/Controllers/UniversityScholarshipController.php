<?php

namespace App\Http\Controllers;

use App\Models\UniversityScholarship;
use App\Models\School;
use App\Models\Student;
use App\Services\ScholarshipService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UniversityScholarshipController extends Controller
{
    /**
     * Lister toutes les bourses universitaires
     */
    public function index(Request $request)
    {
        try {
            $query = UniversityScholarship::with(['school']);

            // Filtrer par école si spécifié
            if ($request->has('school_id')) {
                $query->where('school_id', $request->school_id);
            }

            // Filtrer par type de niveau
            if ($request->has('level_type')) {
                $query->where('level_type', $request->level_type);
            }

            // Filtrer par statut actif
            if ($request->has('active')) {
                $isActive = filter_var($request->active, FILTER_VALIDATE_BOOLEAN);
                $query->where('is_active', $isActive);
            }

            $scholarships = $query->orderBy('school_id')
                ->orderBy('level_type')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $scholarships
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des bourses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer une nouvelle bourse universitaire
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'school_id' => 'required|exists:schools,id',
            'level_type' => 'required|string|max:50',
            'formation_name' => 'required|string|max:255',
            'scholarship_amount' => 'required|numeric|min:0',
            'laptop_included' => 'boolean',
            'conditions' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $scholarship = UniversityScholarship::create($request->all());
            $scholarship->load(['school']);

            return response()->json([
                'success' => true,
                'data' => $scholarship,
                'message' => 'Bourse créée avec succès'
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la bourse',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Afficher une bourse spécifique
     */
    public function show($id)
    {
        try {
            $scholarship = UniversityScholarship::with(['school'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $scholarship
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Bourse non trouvée',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Mettre à jour une bourse
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'school_id' => 'required|exists:schools,id',
            'level_type' => 'required|string|max:50',
            'formation_name' => 'required|string|max:255',
            'scholarship_amount' => 'required|numeric|min:0',
            'laptop_included' => 'boolean',
            'conditions' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $scholarship = UniversityScholarship::findOrFail($id);
            $scholarship->update($request->all());
            $scholarship->load(['school']);

            return response()->json([
                'success' => true,
                'data' => $scholarship,
                'message' => 'Bourse mise à jour avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de la bourse',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer une bourse
     */
    public function destroy($id)
    {
        try {
            $scholarship = UniversityScholarship::findOrFail($id);
            $scholarship->delete();

            return response()->json([
                'success' => true,
                'message' => 'Bourse supprimée avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la bourse',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les bourses d'une école spécifique
     */
    public function getBySchool($schoolId)
    {
        try {
            $scholarships = UniversityScholarship::active()
                ->where('school_id', $schoolId)
                ->with('school')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $scholarships
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des bourses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculer la bourse d'un étudiant spécifique
     */
    public function calculateStudentScholarship($studentId)
    {
        try {
            $student = Student::with(['classSeries.schoolClass.level.school'])->findOrFail($studentId);
            $scholarshipService = new ScholarshipService();

            $scholarshipData = $scholarshipService->calculateScholarship($student);

            return response()->json([
                'success' => true,
                'data' => [
                    'student' => [
                        'id' => $student->id,
                        'nom' => $student->nom,
                        'prenom' => $student->prenom,
                        'bts_mention' => $student->bts_mention
                    ],
                    'school' => $student->classSeries->schoolClass->level->school->name,
                    'school_code' => $student->classSeries->schoolClass->level->school->code,
                    'level_type' => $student->classSeries->schoolClass->level->level_type,
                    'scholarship' => $scholarshipData
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du calcul de la bourse',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Appliquer automatiquement la bourse à un étudiant
     */
    public function applyScholarshipToStudent($studentId)
    {
        try {
            $student = Student::with(['classSeries.schoolClass.level.school'])->findOrFail($studentId);
            $scholarshipService = new ScholarshipService();

            $result = $scholarshipService->applyScholarshipToStudent($student);

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => $result['data']
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'application de la bourse',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour les bourses pour tous les étudiants d'une école
     */
    public function updateSchoolScholarships($schoolId)
    {
        try {
            $scholarshipService = new ScholarshipService();
            $result = $scholarshipService->updateScholarshipsForSchool($schoolId);

            return response()->json([
                'success' => true,
                'message' => "Bourses mises à jour pour {$result['updated']} étudiants sur {$result['total_students']}",
                'data' => $result
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour des bourses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les bourses par code d'école (plus simple à utiliser)
     */
    public function getBySchoolCode($schoolCode)
    {
        try {
            $school = School::where('code', $schoolCode)->firstOrFail();
            $scholarships = UniversityScholarship::active()
                ->where('school_id', $school->id)
                ->orderBy('level_type')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'school' => [
                        'id' => $school->id,
                        'name' => $school->name,
                        'code' => $school->code
                    ],
                    'scholarships' => $scholarships,
                    'summary' => [
                        'total_scholarships' => $scholarships->count(),
                        'total_amount' => $scholarships->sum('scholarship_amount'),
                        'with_laptop' => $scholarships->where('laptop_included', true)->count(),
                        'level_types' => $scholarships->pluck('level_type')->unique()->values()
                    ]
                ],
                'message' => 'Bourses récupérées avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des bourses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les informations de bourse pour un étudiant spécifique
     * Route: GET /scholarships/student/{studentId}/info
     */
    public function getStudentInfo($studentId)
    {
        try {
            $student = Student::with([
                'classSeries.schoolClass.level.school',
                'classSeries.schoolClass.classScholarships' => function ($query) {
                    $query->where('is_active', true);
                }
            ])->findOrFail($studentId);

            $scholarshipInfo = [
                'eligible' => false,
                'amount' => 0,
                'type' => null,
                'conditions' => [],
                'school_code' => $student->classSeries->schoolClass->level->school->code,
                'level_type' => $student->classSeries->schoolClass->level->level_type,
                'current_level' => $student->current_level ?? 1,
                'bts_mention' => $student->bts_mention ?? null,
                'details' => null
            ];

            $schoolCode = $student->classSeries->schoolClass->level->school->code;
            $levelType = $student->classSeries->schoolClass->level->level_type;
            $currentLevel = $student->current_level ?? 1;

            // Vérifier l'éligibilité selon les règles spécifiées
            if ($this->isEligibleForScholarship($student, $schoolCode, $levelType)) {
                $scholarshipAmount = $this->calculateScholarshipAmount(
                    $schoolCode,
                    $levelType,
                    $currentLevel,
                    $student
                );

                $scholarshipInfo = [
                    'eligible' => true,
                    'amount' => $scholarshipAmount,
                    'type' => $this->getScholarshipType($schoolCode, $levelType),
                    'conditions' => $this->getScholarshipConditions($schoolCode, $levelType),
                    'school_code' => $schoolCode,
                    'level_type' => $levelType,
                    'current_level' => $currentLevel,
                    'bts_mention' => $student->bts_mention,
                    'details' => [
                        'school_name' => $student->classSeries->schoolClass->level->school->name,
                        'class_name' => $student->classSeries->schoolClass->name,
                        'series_name' => $student->classSeries->name,
                        'student_name' => $student->first_name . ' ' . $student->last_name
                    ]
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $scholarshipInfo,
                'message' => 'Informations de bourse récupérées avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des informations de bourse',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Appliquer une bourse à un étudiant
     * Route: POST /scholarships/apply
     */
    public function applyScholarship(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'scholarship_amount' => 'nullable|numeric|min:0',
            'auto_calculate' => 'boolean',
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
            $student = Student::with([
                'classSeries.schoolClass.level.school'
            ])->findOrFail($request->student_id);

            $scholarshipAmount = $request->scholarship_amount;

            // Si auto-calcul demandé ou pas de montant fourni
            if ($request->auto_calculate || !$scholarshipAmount) {
                $schoolCode = $student->classSeries->schoolClass->level->school->code;
                $levelType = $student->classSeries->schoolClass->level->level_type;
                $currentLevel = $student->current_level ?? 1;

                $scholarshipAmount = $this->calculateScholarshipAmount(
                    $schoolCode,
                    $levelType,
                    $currentLevel,
                    $student
                );
            }

            if ($scholarshipAmount <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cet étudiant n\'est pas éligible aux bourses'
                ], 422);
            }

            // Mettre à jour le montant de bourse de l'étudiant
            $student->update([
                'scholarship_amount' => $scholarshipAmount,
                'has_scholarship_enabled' => true
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'student' => $student->fresh(),
                    'scholarship_amount' => $scholarshipAmount,
                    'applied_date' => now()->format('Y-m-d H:i:s')
                ],
                'message' => 'Bourse appliquée avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'application de la bourse',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir la liste des étudiants éligibles aux bourses
     * Route: GET /scholarships/eligible-students
     */
    public function getEligibleStudents(Request $request)
    {
        try {
            $query = Student::with([
                'classSeries.schoolClass.level.school'
            ])->where('is_active', true);

            // Filtrer par école si spécifié
            if ($request->has('school_id')) {
                $query->whereHas('classSeries.schoolClass.level', function ($q) use ($request) {
                    $q->where('school_id', $request->school_id);
                });
            }

            // Filtrer par code école si spécifié
            if ($request->has('school_code')) {
                $query->whereHas('classSeries.schoolClass.level.school', function ($q) use ($request) {
                    $q->where('code', $request->school_code);
                });
            }

            // Filtrer par type de niveau
            if ($request->has('level_type')) {
                $query->whereHas('classSeries.schoolClass.level', function ($q) use ($request) {
                    $q->where('level_type', $request->level_type);
                });
            }

            $students = $query->get();
            $eligibleStudents = [];

            foreach ($students as $student) {
                $schoolCode = $student->classSeries->schoolClass->level->school->code;
                $levelType = $student->classSeries->schoolClass->level->level_type;

                if ($this->isEligibleForScholarship($student, $schoolCode, $levelType)) {
                    $scholarshipAmount = $this->calculateScholarshipAmount(
                        $schoolCode,
                        $levelType,
                        $student->current_level ?? 1,
                        $student
                    );

                    $eligibleStudents[] = [
                        'id' => $student->id,
                        'student_number' => $student->student_number,
                        'first_name' => $student->first_name,
                        'last_name' => $student->last_name,
                        'school_name' => $student->classSeries->schoolClass->level->school->name,
                        'school_code' => $schoolCode,
                        'class_name' => $student->classSeries->schoolClass->name,
                        'series_name' => $student->classSeries->name,
                        'level_type' => $levelType,
                        'current_level' => $student->current_level ?? 1,
                        'calculated_scholarship' => $scholarshipAmount,
                        'current_scholarship' => $student->scholarship_amount ?? 0,
                        'has_scholarship_enabled' => $student->has_scholarship_enabled ?? false,
                        'bts_mention' => $student->bts_mention
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'eligible_students' => $eligibleStudents,
                    'total_eligible' => count($eligibleStudents),
                    'total_students' => $students->count()
                ],
                'message' => 'Étudiants éligibles récupérés avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des étudiants éligibles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Vérifier l'éligibilité aux bourses
     */
    private function isEligibleForScholarship($student, $schoolCode, $levelType)
    {
        // INSSAS : BTS, Double Diplomation, Licence Pro, Master Pro
        if ($schoolCode === 'INSSAS') {
            return in_array($levelType, ['BTS', 'HND', 'DOUBLE_DIPLOMATION', 'LICENCE_PRO', 'MASTER_PRO']);
        }

        // ESGIT : Licence Pro (selon mention BTS), Ingénierie 3ème année
        if ($schoolCode === 'ESGIT') {
            return in_array($levelType, ['LICENCE_PRO', 'INGENIERIE']);
        }

        // ESSIT : Ingénierie Second Cycle seulement
        if ($schoolCode === 'ESSIT') {
            return ($levelType === 'INGENIERIE_SC');
        }

        // ISTPM : CQP et DQP
        if ($schoolCode === 'ISTPM') {
            return in_array($levelType, ['CQP', 'DQP']);
        }

        return false;
    }

    /**
     * Calculer le montant de la bourse
     */
    private function calculateScholarshipAmount($schoolCode, $levelType, $currentLevel, $student)
    {
        switch ($schoolCode) {
            case 'INSSAS':
                if (in_array($levelType, ['BTS', 'HND'])) {
                    return $currentLevel === 1 ? 50000 : 100000;
                }
                if ($levelType === 'DOUBLE_DIPLOMATION') {
                    return $currentLevel === 1 ? 50000 : 100000;
                }
                if ($levelType === 'LICENCE_PRO') {
                    return 100000;
                }
                if ($levelType === 'MASTER_PRO') {
                    return $currentLevel <= 2 ? 150000 : 0;
                }
                break;

            case 'ESGIT':
                if ($levelType === 'LICENCE_PRO') {
                    // Bourses selon mention BTS
                    $btsMention = $student->bts_mention ?? 'passable';
                    $scholarships = [
                        'passable' => 50000,
                        'assez_bien' => 100000,
                        'bien' => 120000,
                        'tres_bien' => 150000
                    ];
                    return $scholarships[$btsMention] ?? 50000;
                }
                if ($levelType === 'INGENIERIE') {
                    return 50000; // 3ème année
                }
                break;

            case 'ESSIT':
                if ($levelType === 'INGENIERIE_SC') {
                    return 50000; // Niveaux 3, 4, 5
                }
                break;

            case 'ISTPM':
                return 25000; // CQP et DQP
                break;
        }

        return 0;
    }

    /**
     * Obtenir le type de bourse
     */
    private function getScholarshipType($schoolCode, $levelType)
    {
        if ($schoolCode === 'ESGIT' && $levelType === 'LICENCE_PRO') {
            return 'bourse_mention_bts';
        }

        if (in_array($schoolCode, ['INSSAS', 'ESSIT', 'ISTPM'])) {
            return 'bourse_automatique';
        }

        return 'autre';
    }

    /**
     * Obtenir les conditions de bourse
     */
    private function getScholarshipConditions($schoolCode, $levelType)
    {
        $conditions = [];

        switch ($schoolCode) {
            case 'INSSAS':
                $conditions[] = 'Bourse automatique selon le niveau d\'études';
                $conditions[] = 'Montants: 50 000 FCFA (niveau 1), 100 000 FCFA (niveaux 2+)';
                break;

            case 'ESGIT':
                if ($levelType === 'LICENCE_PRO') {
                    $conditions[] = 'Bourse selon mention obtenue au BTS';
                    $conditions[] = 'Passable: 50 000 FCFA, Assez Bien: 100 000 FCFA';
                    $conditions[] = 'Bien: 120 000 FCFA, Très Bien: 150 000 FCFA + laptop';
                } else {
                    $conditions[] = 'Bourse de 50 000 FCFA par an pour Ingénierie 3ème année';
                }
                break;

            case 'ESSIT':
                $conditions[] = 'Bourse de 50 000 FCFA par an pour Ingénierie Second Cycle';
                $conditions[] = 'Niveaux 3, 4 et 5 éligibles';
                break;

            case 'ISTPM':
                $conditions[] = 'Bourse automatique de 25 000 FCFA par an';
                $conditions[] = 'Applicable à tous les CQP et DQP';
                break;
        }

        return $conditions;
    }
}
