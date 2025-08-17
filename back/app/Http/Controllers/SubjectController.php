<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Models\ClassSeries;
use App\Models\ClassSeriesSubject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class SubjectController extends Controller
{
    /**
     * Lister toutes les matières
     */
    public function index(Request $request)
    {
        try {
            $query = Subject::query();

            // Filtrer par statut si spécifié
            if ($request->has('active')) {
                $isActive = filter_var($request->active, FILTER_VALIDATE_BOOLEAN);
                $query->where('is_active', $isActive);
            }

            // Recherche par nom ou code
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%");
                });
            }

            // Inclure les relations si demandé
            if ($request->has('with_series')) {
                $query->with(['classSeries' => function($q) {
                    $q->with('schoolClass');
                }]);
            }

            $subjects = $query->orderBy('name')->get();

            return response()->json([
                'success' => true,
                'data' => $subjects
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des matières',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer une nouvelle matière
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'code' => 'required|string|max:10|unique:subjects,code',
                'description' => 'nullable|string',
                'is_active' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $subject = Subject::create($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Matière créée avec succès',
                'data' => $subject
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la matière',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Afficher une matière spécifique
     */
    public function show(Subject $subject)
    {
        try {
            $subject->load(['classSeries' => function($q) {
                $q->with('schoolClass');
            }]);

            return response()->json([
                'success' => true,
                'data' => $subject
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de la matière',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour une matière
     */
    public function update(Request $request, Subject $subject)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'code' => 'required|string|max:10|unique:subjects,code,' . $subject->id,
                'description' => 'nullable|string',
                'is_active' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $subject->update($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Matière mise à jour avec succès',
                'data' => $subject
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de la matière',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer une matière
     */
    public function destroy(Subject $subject)
    {
        try {
            // Vérifier si la matière est utilisée dans des séries
            if ($subject->isUsedInSeries()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette matière ne peut pas être supprimée car elle est utilisée dans des séries de classe'
                ], 400);
            }

            $subject->delete();

            return response()->json([
                'success' => true,
                'message' => 'Matière supprimée avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la matière',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Basculer le statut actif/inactif d'une matière
     */
    public function toggleStatus(Subject $subject)
    {
        try {
            $subject->is_active = !$subject->is_active;
            $subject->save();

            return response()->json([
                'success' => true,
                'message' => 'Statut de la matière mis à jour avec succès',
                'data' => $subject
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
     * Configurer les matières pour une série de classe
     */
    public function configureForSeries(Request $request, ClassSeries $classSeries)
    {
        try {
            $validator = Validator::make($request->all(), [
                'subjects' => 'required|array',
                'subjects.*.subject_id' => 'required|exists:subjects,id',
                'subjects.*.coefficient' => 'required|numeric|min:0.1|max:10',
                'subjects.*.is_active' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Supprimer les anciennes configurations
            ClassSeriesSubject::where('class_series_id', $classSeries->id)->delete();

            // Ajouter les nouvelles configurations
            foreach ($request->subjects as $subjectConfig) {
                ClassSeriesSubject::create([
                    'class_series_id' => $classSeries->id,
                    'subject_id' => $subjectConfig['subject_id'],
                    'coefficient' => $subjectConfig['coefficient'],
                    'is_active' => $subjectConfig['is_active'] ?? true
                ]);
            }

            DB::commit();

            // Recharger les relations
            $classSeries->load(['subjects' => function($q) {
                $q->orderBy('name');
            }]);

            return response()->json([
                'success' => true,
                'message' => 'Configuration des matières mise à jour avec succès',
                'data' => $classSeries
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la configuration des matières',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les matières configurées pour une série
     */
    public function getForSeries(ClassSeries $classSeries)
    {
        try {
            $subjects = $classSeries->subjects()
                                   ->orderBy('name')
                                   ->get();

            return response()->json([
                'success' => true,
                'data' => $subjects
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des matières de la série',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}