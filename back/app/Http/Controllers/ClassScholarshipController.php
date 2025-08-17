<?php

namespace App\Http\Controllers;

use App\Models\ClassScholarship;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ClassScholarshipController extends Controller
{
    /**
     * Lister toutes les bourses de classe
     */
    public function index()
    {
        try {
            $scholarships = ClassScholarship::with(['schoolClass', 'paymentTranche'])
                ->orderBy('school_class_id')
                ->orderBy('created_at', 'desc')
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
     * Créer une nouvelle bourse de classe
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'school_class_id' => 'required|exists:school_classes,id',
            'payment_tranche_id' => 'nullable|exists:payment_tranches,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'required|numeric|min:0',
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
            $scholarship = ClassScholarship::create($request->all());
            $scholarship->load(['schoolClass', 'paymentTranche']);

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
            $scholarship = ClassScholarship::with(['schoolClass', 'paymentTranche'])->findOrFail($id);

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
            'school_class_id' => 'required|exists:school_classes,id',
            'payment_tranche_id' => 'nullable|exists:payment_tranches,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'required|numeric|min:0',
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
            $scholarship = ClassScholarship::findOrFail($id);
            $scholarship->update($request->all());
            $scholarship->load(['schoolClass', 'paymentTranche']);

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
            $scholarship = ClassScholarship::findOrFail($id);
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
     * Obtenir les bourses d'une classe spécifique
     */
    public function getByClass($classId)
    {
        try {
            $scholarships = ClassScholarship::active()
                ->where('school_class_id', $classId)
                ->with('schoolClass')
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
