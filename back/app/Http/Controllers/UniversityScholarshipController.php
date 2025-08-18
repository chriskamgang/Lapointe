<?php

namespace App\Http\Controllers;

use App\Models\UniversityScholarship;
use App\Models\School;
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
}