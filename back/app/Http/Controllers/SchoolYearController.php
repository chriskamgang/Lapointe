<?php

namespace App\Http\Controllers;

use App\Models\SchoolYear;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class SchoolYearController extends Controller
{
    /**
     * Liste toutes les années scolaires (Admin seulement)
     */
    public function index()
    {
        try {
            $schoolYears = SchoolYear::orderBy('start_date', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $schoolYears
            ]);
        } catch (\Exception $e) {
            Log::error('Error in SchoolYearController@index: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des années scolaires',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Liste les années scolaires actives pour sélection
     */
    public function getActiveYears()
    {
        try {
            $schoolYears = SchoolYear::where('is_active', true)
                ->orderBy('start_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $schoolYears
            ]);
        } catch (\Exception $e) {
            Log::error('Error in SchoolYearController@getActiveYears: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des années scolaires actives',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer une nouvelle année scolaire (Admin seulement)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:school_years,name',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'is_current' => 'boolean',
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
            // Si cette année est marquée comme courante, démarquer les autres
            if ($request->get('is_current', false)) {
                SchoolYear::where('is_current', true)->update(['is_current' => false]);
            }

            $schoolYear = SchoolYear::create([
                'name' => $request->name,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'is_current' => $request->get('is_current', false),
                'is_active' => $request->get('is_active', true)
            ]);

            return response()->json([
                'success' => true,
                'data' => $schoolYear,
                'message' => 'Année scolaire créée avec succès'
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error in SchoolYearController@store: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de l\'année scolaire',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour une année scolaire (Admin seulement)
     */
    public function update(Request $request, SchoolYear $schoolYear)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:school_years,name,' . $schoolYear->id,
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'is_current' => 'boolean',
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
            // Si cette année est marquée comme courante, démarquer les autres
            if ($request->get('is_current', false)) {
                SchoolYear::where('is_current', true)
                    ->where('id', '!=', $schoolYear->id)
                    ->update(['is_current' => false]);
            }

            $schoolYear->update([
                'name' => $request->name,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
                'is_current' => $request->get('is_current', false),
                'is_active' => $request->get('is_active', true)
            ]);

            return response()->json([
                'success' => true,
                'data' => $schoolYear,
                'message' => 'Année scolaire mise à jour avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Error in SchoolYearController@update: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de l\'année scolaire',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Définir une année comme courante
     */
    public function setCurrent(SchoolYear $schoolYear)
    {
        try {
            // Démarquer toutes les autres années
            SchoolYear::where('is_current', true)->update(['is_current' => false]);
            
            // Marquer cette année comme courante
            $schoolYear->update(['is_current' => true]);

            return response()->json([
                'success' => true,
                'data' => $schoolYear,
                'message' => 'Année scolaire définie comme courante'
            ]);
        } catch (\Exception $e) {
            Log::error('Error in SchoolYearController@setCurrent: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la définition de l\'année courante',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Définir l'année de travail de l'utilisateur connecté
     */
    public function setUserWorkingYear(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'school_year_id' => 'required|exists:school_years,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = Auth::user();
            $schoolYear = SchoolYear::find($request->school_year_id);

            if (!$schoolYear->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cette année scolaire n\'est pas active'
                ], 422);
            }

            // Mettre à jour l'année de travail de l'utilisateur
            $user->update(['working_school_year_id' => $request->school_year_id]);

            return response()->json([
                'success' => true,
                'data' => $schoolYear,
                'message' => 'Année de travail définie avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Error in SchoolYearController@setUserWorkingYear: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la définition de l\'année de travail',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir l'année de travail de l'utilisateur connecté
     */
    public function getUserWorkingYear()
    {
        try {
            $user = Auth::user();
            
            if ($user->working_school_year_id) {
                $workingYear = SchoolYear::find($user->working_school_year_id);
            } else {
                // Par défaut, utiliser l'année courante
                $workingYear = SchoolYear::where('is_current', true)->first();
                if (!$workingYear) {
                    $workingYear = SchoolYear::where('is_active', true)->first();
                }
            }

            return response()->json([
                'success' => true,
                'data' => $workingYear
            ]);
        } catch (\Exception $e) {
            Log::error('Error in SchoolYearController@getUserWorkingYear: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'année de travail',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}