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
}