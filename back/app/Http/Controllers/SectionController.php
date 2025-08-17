<?php

namespace App\Http\Controllers;

use App\Models\Section;
use App\Exports\SectionsExport;
use App\Exports\SectionsImportableExport;
use App\Imports\SectionsImport;
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
            $sections = Section::ordered()->get();
            
            return response()->json([
                'success' => true,
                'data' => $sections,
                'message' => 'Sections récupérées avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des sections',
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
                'name' => 'required|string|max:255|unique:sections',
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

            $section = Section::create($validator->validated());

            return response()->json([
                'success' => true,
                'data' => $section,
                'message' => 'Section créée avec succès'
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la section',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Section $section)
    {
        try {
            $section->load('classes');
            
            return response()->json([
                'success' => true,
                'data' => $section,
                'message' => 'Section récupérée avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de la section',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Section $section)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255|unique:sections,name,' . $section->id,
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

            $section->update($validator->validated());

            return response()->json([
                'success' => true,
                'data' => $section,
                'message' => 'Section mise à jour avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de la section',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Section $section)
    {
        try {
            // Vérifier si la section a des classes associées
            if ($section->classes()->count() > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de supprimer une section qui contient des classes'
                ], 400);
            }

            $section->delete();

            return response()->json([
                'success' => true,
                'message' => 'Section supprimée avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la section',
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
                'total_sections' => Section::count(),
                'active_sections' => Section::active()->count(),
                'inactive_sections' => Section::where('is_active', false)->count(),
                'sections_with_classes' => Section::has('classes')->count(),
            ];

            $recent_sections = Section::latest()->take(5)->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'recent_sections' => $recent_sections
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
     * Toggle section status
     */
    public function toggleStatus(Section $section)
    {
        try {
            $section->update(['is_active' => !$section->is_active]);

            return response()->json([
                'success' => true,
                'data' => $section,
                'message' => 'Statut de la section mis à jour avec succès'
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
     * Export sections to Excel
     */
    public function exportExcel(Request $request)
    {
        try {
            $filename = 'sections_' . date('Y-m-d_H-i-s') . '.xlsx';
            return Excel::download(new SectionsExport(), $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export Excel',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export sections to CSV
     */
    public function exportCsv(Request $request)
    {
        try {
            $filename = 'sections_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new SectionsImportableExport(), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export sections to PDF
     */
    public function exportPdf(Request $request)
    {
        try {
            $filename = 'sections_' . date('Y-m-d_H-i-s') . '.pdf';
            return Excel::download(new SectionsExport(), $filename, \Maatwebsite\Excel\Excel::DOMPDF);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import sections from CSV
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

            $import = new SectionsImport();
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
     * Export sections in importable CSV format
     */
    public function exportImportable(Request $request)
    {
        try {
            $filename = 'sections_importable_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new SectionsImportableExport(), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV importable',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download CSV template for sections import
     */
    public function downloadTemplate()
    {
        try {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="template_sections.csv"'
            ];

            $csvData = "id,nom,description,statut\n";
            $csvData .= ",Section Primaire,Section pour les classes primaires,1\n";
            $csvData .= ",Section Secondaire,Section pour les classes secondaires,1\n";
            $csvData .= "1,Section Maternelle,Section pour les classes maternelles,0\n";

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