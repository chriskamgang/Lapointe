<?php

namespace App\Http\Controllers;

use App\Models\SeriesSubject;
use App\Models\SchoolClass;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class SeriesSubjectController extends Controller
{
    /**
     * Lister les configurations de matières par série
     */
    public function index(Request $request)
    {
        try {
            $query = SeriesSubject::with(['schoolClass.level', 'subject']);

            // Filtrer par série si spécifié
            if ($request->has('school_class_id')) {
                $query->where('school_class_id', $request->school_class_id);
            }

            // Filtrer par matière si spécifié
            if ($request->has('subject_id')) {
                $query->where('subject_id', $request->subject_id);
            }

            // Filtrer par statut actif
            if ($request->has('active')) {
                $isActive = filter_var($request->active, FILTER_VALIDATE_BOOLEAN);
                $query->where('is_active', $isActive);
            }

            $configurations = $query->orderBy('school_class_id')
                                   ->orderBy('subject_id')
                                   ->get();

            return response()->json([
                'success' => true,
                'data' => $configurations
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des configurations',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les matières configurées pour une série spécifique
     */
    public function getByClass(SchoolClass $schoolClass)
    {
        try {
            $configurations = SeriesSubject::where('school_class_id', $schoolClass->id)
                ->where('is_active', true)
                ->with(['subject'])
                ->get();

            return response()->json([
                'success' => true,
                'data' => $configurations
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des matières de la série',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ajouter une matière à une série
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'school_class_id' => 'required|exists:school_classes,id',
                'subject_id' => 'required|exists:subjects,id',
                'coefficient' => 'required|numeric|min:0.5|max:10'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Vérifier si la configuration existe déjà
            $existingConfig = SeriesSubject::where('school_class_id', $request->school_class_id)
                ->where('subject_id', $request->subject_id)
                ->first();

            if ($existingConfig) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette matière est déjà configurée pour cette série'
                ], 422);
            }

            $configuration = SeriesSubject::create([
                'school_class_id' => $request->school_class_id,
                'subject_id' => $request->subject_id,
                'coefficient' => $request->coefficient,
                'is_active' => true
            ]);

            $configuration->load(['schoolClass.level', 'subject']);

            return response()->json([
                'success' => true,
                'message' => 'Matière ajoutée à la série avec succès',
                'data' => $configuration
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'ajout de la matière à la série',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour une configuration
     */
    public function update(Request $request, SeriesSubject $seriesSubject)
    {
        try {
            $validator = Validator::make($request->all(), [
                'coefficient' => 'required|numeric|min:0.5|max:10',
                'is_active' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $seriesSubject->update([
                'coefficient' => $request->coefficient,
                'is_active' => $request->is_active ?? $seriesSubject->is_active
            ]);

            $seriesSubject->load(['schoolClass.level', 'subject']);

            return response()->json([
                'success' => true,
                'message' => 'Configuration mise à jour avec succès',
                'data' => $seriesSubject
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de la configuration',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer une matière d'une série
     */
    public function destroy(SeriesSubject $seriesSubject)
    {
        try {
            DB::beginTransaction();

            // Vérifier s'il y a des enseignants affectés à cette matière dans cette série
            $hasAssignments = $seriesSubject->teacherAssignments()->exists();

            if ($hasAssignments) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de supprimer cette configuration car des enseignants y sont affectés'
                ], 422);
            }

            $seriesSubject->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Matière retirée de la série avec succès'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la configuration',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activer/désactiver une configuration
     */
    public function toggleStatus(SeriesSubject $seriesSubject)
    {
        try {
            $seriesSubject->update([
                'is_active' => !$seriesSubject->is_active
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Statut mis à jour avec succès',
                'data' => $seriesSubject
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
     * Configurer plusieurs matières pour une série en lot
     */
    public function bulkConfigure(Request $request, SchoolClass $schoolClass)
    {
        try {
            $validator = Validator::make($request->all(), [
                'subjects' => 'required|array',
                'subjects.*.subject_id' => 'required|exists:subjects,id',
                'subjects.*.coefficient' => 'required|numeric|min:0.5|max:10'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $configurations = [];

            foreach ($request->subjects as $subjectData) {
                // Vérifier si la configuration existe déjà
                $existingConfig = SeriesSubject::where('school_class_id', $schoolClass->id)
                    ->where('subject_id', $subjectData['subject_id'])
                    ->first();

                if ($existingConfig) {
                    // Mettre à jour si elle existe
                    $existingConfig->update([
                        'coefficient' => $subjectData['coefficient'],
                        'is_active' => true
                    ]);
                    $configurations[] = $existingConfig;
                } else {
                    // Créer si elle n'existe pas
                    $configuration = SeriesSubject::create([
                        'school_class_id' => $schoolClass->id,
                        'subject_id' => $subjectData['subject_id'],
                        'coefficient' => $subjectData['coefficient'],
                        'is_active' => true
                    ]);
                    $configurations[] = $configuration;
                }
            }

            DB::commit();

            // Charger les relations
            foreach ($configurations as $config) {
                $config->load(['schoolClass.level', 'subject']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Configurations mises à jour avec succès',
                'data' => $configurations
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la configuration en lot',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}