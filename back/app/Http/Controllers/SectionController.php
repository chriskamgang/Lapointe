<?php

namespace App\Http\Controllers;

use App\Models\School;
use App\Exports\SchoolsExport;
use App\Exports\SchoolsImportableExport;
use App\Imports\SchoolsImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Response;

class SectionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $schools = School::ordered()->get();
            
            return response()->json([
                'success' => true,
                'data' => $schools,
                'message' => 'Schools récupérées avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des schools',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255|unique:schools',
                'description' => 'nullable|string|max:500',
                'is_active' => 'boolean',
                'order' => 'integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreurs de validation',
                    'errors' => $validator->errors()
                ], 422);
            }

            $school = School::create($validator->validated());

            return response()->json([
                'success' => true,
                'data' => $school,
                'message' => 'School créée avec succès'
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la school',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(School $school)
    {
        try {
            $school->load('classes');
            
            return response()->json([
                'success' => true,
                'data' => $school,
                'message' => 'School récupérée avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de la school',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, School $school)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255|unique:schools,name,' . $school->id,
                'description' => 'nullable|string|max:500',
                'is_active' => 'boolean',
                'order' => 'integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreurs de validation',
                    'errors' => $validator->errors()
                ], 422);
            }

            $school->update($validator->validated());

            return response()->json([
                'success' => true,
                'data' => $school,
                'message' => 'School mise à jour avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de la school',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(School $school)
    {
        try {
            // Vérifier si la school a des classes associées
            if ($school->classes()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de supprimer une school qui contient des classes'
                ], 400);
            }

            $school->delete();

            return response()->json([
                'success' => true,
                'message' => 'School supprimée avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la school',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get dashboard statistics
     */
    public function dashboard()
    {
        try {
            $stats = [
                'total_schools' => School::count(),
                'active_schools' => School::active()->count(),
                'inactive_schools' => School::where('is_active', false)->count(),
                'schools_with_classes' => School::has('classes')->count(),
            ];

            $recent_schools = School::latest()->take(5)->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'recent_schools' => $recent_schools
                ],
                'message' => 'Statistiques récupérées avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle school status
     */
    public function toggleStatus(School $school)
    {
        try {
            $school->update(['is_active' => !$school->is_active]);

            return response()->json([
                'success' => true,
                'data' => $school,
                'message' => 'Statut de la school mis à jour avec succès'
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
     * Export schools to Excel
     */
    public function exportExcel(Request $request)
    {
        try {
            $filename = 'schools_' . date('Y-m-d_H-i-s') . '.xlsx';
            return Excel::download(new SchoolsExport(), $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export Excel',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export schools to CSV
     */
    public function exportCsv(Request $request)
    {
        try {
            $filename = 'schools_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new SchoolsImportableExport(), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export schools to PDF
     */
    public function exportPdf(Request $request)
    {
        try {
            $filename = 'schools_' . date('Y-m-d_H-i-s') . '.pdf';
            return Excel::download(new SchoolsExport(), $filename, \Maatwebsite\Excel\Excel::DOMPDF);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import schools from CSV
     */
    public function importCsv(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'file' => 'required|mimes:csv,txt|max:2048'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fichier invalide',
                    'errors' => $validator->errors()
                ], 422);
            }

            $import = new SchoolsImport();
            Excel::import($import, $request->file('file'));
            
            $results = $import->getResults();

            return response()->json([
                'success' => true,
                'data' => $results,
                'message' => 'Import terminé avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'import',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export schools in importable CSV format
     */
    public function exportImportable(Request $request)
    {
        try {
            $filename = 'schools_importable_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new SchoolsImportableExport(), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV importable',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download CSV template for schools import
     */
    public function downloadTemplate()
    {
        try {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="template_schools.csv"'
            ];

            $csvData = "id,nom,description,statut\n";
            $csvData .= ",School Primaire,School pour les classes primaires,1\n";
            $csvData .= ",School Secondaire,School pour les classes secondaires,1\n";
            $csvData .= "1,School Maternelle,School pour les classes maternelles,0\n";

            return Response::make($csvData, 200, $headers);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du téléchargement du template',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}