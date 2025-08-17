<?php

namespace App\Http\Controllers;

use App\Models\TeacherAssignment;
use App\Models\Teacher;
use App\Models\SeriesSubject;
use App\Models\MainTeacher;
use App\Models\SchoolYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class TeacherAssignmentController extends Controller
{
    /**
     * Lister toutes les affectations
     */
    public function index(Request $request)
    {
        try {
            $query = TeacherAssignment::with([
                'teacher',
                'seriesSubject.subject',
                'seriesSubject.schoolClass.level',
                'schoolYear'
            ]);

            // Filtrer par enseignant
            if ($request->has('teacher_id')) {
                $query->where('teacher_id', $request->teacher_id);
            }

            // Filtrer par année scolaire
            if ($request->has('school_year_id')) {
                $query->where('school_year_id', $request->school_year_id);
            } else {
                // Par défaut, filtrer par l'année scolaire courante
                $currentYear = SchoolYear::where('is_current', true)->first();
                if ($currentYear) {
                    $query->where('school_year_id', $currentYear->id);
                }
            }

            // Filtrer par matière
            if ($request->has('subject_id')) {
                $query->whereHas('seriesSubject', function($q) use ($request) {
                    $q->where('subject_id', $request->subject_id);
                });
            }

            // Filtrer par classe
            if ($request->has('school_class_id')) {
                $query->whereHas('seriesSubject', function($q) use ($request) {
                    $q->where('school_class_id', $request->school_class_id);
                });
            }

            // Filtrer par statut actif
            if ($request->has('active')) {
                $isActive = filter_var($request->active, FILTER_VALIDATE_BOOLEAN);
                $query->where('is_active', $isActive);
            }

            $assignments = $query->orderBy('teacher_id')
                                ->orderBy('series_subject_id')
                                ->get();

            return response()->json([
                'success' => true,
                'data' => $assignments
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des affectations',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les affectations d'un enseignant
     */
    public function getByTeacher(Teacher $teacher, Request $request)
    {
        try {
            $schoolYearId = $request->school_year_id ?? SchoolYear::where('is_current', true)->first()?->id;

            $assignments = TeacherAssignment::where('teacher_id', $teacher->id)
                ->where('school_year_id', $schoolYearId)
                ->where('is_active', true)
                ->with([
                    'seriesSubject.subject',
                    'seriesSubject.schoolClass.level',
                    'schoolYear'
                ])
                ->get();

            // Ajouter les informations sur les classes où il est professeur principal
            $mainTeacherClasses = MainTeacher::where('teacher_id', $teacher->id)
                ->where('school_year_id', $schoolYearId)
                ->where('is_active', true)
                ->with(['schoolClass.level'])
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'assignments' => $assignments,
                    'main_teacher_classes' => $mainTeacherClasses
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des affectations de l\'enseignant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Affecter un enseignant à une matière dans une série
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'teacher_id' => 'required|exists:teachers,id',
                'series_subject_id' => 'required|exists:series_subjects,id',
                'school_year_id' => 'nullable|exists:school_years,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Utiliser l'année scolaire courante si non spécifiée
            $schoolYearId = $request->school_year_id ?? SchoolYear::where('is_current', true)->first()?->id;
            
            if (!$schoolYearId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Année scolaire non trouvée'
                ], 422);
            }

            // Vérifier si l'affectation existe déjà
            $existingAssignment = TeacherAssignment::where('teacher_id', $request->teacher_id)
                ->where('series_subject_id', $request->series_subject_id)
                ->where('school_year_id', $schoolYearId)
                ->first();

            if ($existingAssignment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cet enseignant est déjà affecté à cette matière dans cette série'
                ], 422);
            }

            $assignment = TeacherAssignment::create([
                'teacher_id' => $request->teacher_id,
                'series_subject_id' => $request->series_subject_id,
                'school_year_id' => $schoolYearId,
                'is_active' => true
            ]);

            $assignment->load([
                'teacher',
                'seriesSubject.subject',
                'seriesSubject.schoolClass.level',
                'schoolYear'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Enseignant affecté avec succès',
                'data' => $assignment
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'affectation de l\'enseignant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer une affectation
     */
    public function destroy(TeacherAssignment $assignment)
    {
        try {
            $assignment->delete();

            return response()->json([
                'success' => true,
                'message' => 'Affectation supprimée avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de l\'affectation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activer/désactiver une affectation
     */
    public function toggleStatus(TeacherAssignment $assignment)
    {
        try {
            $assignment->update([
                'is_active' => !$assignment->is_active
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Statut de l\'affectation mis à jour avec succès',
                'data' => $assignment
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du statut',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Affecter un enseignant à plusieurs matières en lot
     */
    public function bulkAssign(Request $request, Teacher $teacher)
    {
        try {
            $validator = Validator::make($request->all(), [
                'school_year_id' => 'nullable|exists:school_years,id',
                'series_subjects' => 'required|array',
                'series_subjects.*' => 'exists:series_subjects,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Utiliser l'année scolaire courante si non spécifiée
            $schoolYearId = $request->school_year_id ?? SchoolYear::where('is_current', true)->first()?->id;
            
            if (!$schoolYearId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Année scolaire non trouvée'
                ], 422);
            }

            DB::beginTransaction();

            $assignments = [];

            foreach ($request->series_subjects as $seriesSubjectId) {
                // Vérifier si l'affectation existe déjà
                $existingAssignment = TeacherAssignment::where('teacher_id', $teacher->id)
                    ->where('series_subject_id', $seriesSubjectId)
                    ->where('school_year_id', $schoolYearId)
                    ->first();

                if (!$existingAssignment) {
                    $assignment = TeacherAssignment::create([
                        'teacher_id' => $teacher->id,
                        'series_subject_id' => $seriesSubjectId,
                        'school_year_id' => $schoolYearId,
                        'is_active' => true
                    ]);
                    $assignments[] = $assignment;
                }
            }

            DB::commit();

            // Charger les relations
            foreach ($assignments as $assignment) {
                $assignment->load([
                    'teacher',
                    'seriesSubject.subject',
                    'seriesSubject.schoolClass.level',
                    'schoolYear'
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Affectations créées avec succès',
                'data' => $assignments
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors des affectations en lot',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les matières disponibles pour un enseignant (matières configurées mais non affectées)
     */
    public function getAvailableSubjects(Teacher $teacher, Request $request)
    {
        try {
            $schoolYearId = $request->school_year_id ?? SchoolYear::where('is_current', true)->first()?->id;

            // Obtenir les matières déjà affectées à cet enseignant
            $assignedSeriesSubjectIds = TeacherAssignment::where('teacher_id', $teacher->id)
                ->where('school_year_id', $schoolYearId)
                ->where('is_active', true)
                ->pluck('series_subject_id');

            // Obtenir toutes les matières configurées mais non affectées
            $availableSeriesSubjects = SeriesSubject::whereNotIn('id', $assignedSeriesSubjectIds)
                ->where('is_active', true)
                ->with(['subject', 'schoolClass.level'])
                ->get();

            return response()->json([
                'success' => true,
                'data' => $availableSeriesSubjects
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des matières disponibles',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}