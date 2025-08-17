<?php

namespace App\Http\Controllers;

use App\Models\Level;
use App\Models\Section;
use App\Exports\LevelsExport;
use App\Exports\LevelsImportableExport;
use App\Imports\LevelsImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Response;

class LevelController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = Level::with(['section', 'schoolClasses']);
            
            // Filtrer par section si spécifié
            if ($request->has('section_id')) {
                $query->where('section_id', $request->section_id);
            }
            
            $levels = $query->ordered()->get();
            
            return response()->json([
                'success' => true,
                'data' => $levels,
                'message' => 'Niveaux récupérés avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des niveaux',
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
                'total_levels' => Level::count(),
                'active_levels' => Level::where('is_active', true)->count(),
                'inactive_levels' => Level::where('is_active', false)->count(),
                'levels_with_classes' => Level::has('schoolClasses')->count(),
            ];

            $recentLevels = Level::with('section')
                ->latest()
                ->take(5)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'recent_levels' => $recentLevels
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
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'section_id' => 'required|exists:sections,id',
            'description' => 'nullable|string',
            'order' => 'nullable|integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Si aucun ordre n'est spécifié, mettre à la fin pour cette section
            if (!$request->has('order')) {
                $lastOrder = Level::where('section_id', $request->section_id)->max('order') ?? 0;
                $request->merge(['order' => $lastOrder + 1]);
            }

            $level = Level::create($request->all());
            $level->load(['section', 'schoolClasses']);

            return response()->json([
                'success' => true,
                'data' => $level,
                'message' => 'Niveau créé avec succès'
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du niveau',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Level $level)
    {
        try {
            $level->load(['section', 'schoolClasses.series', 'schoolClasses.paymentAmounts.paymentTranche']);
            
            return response()->json([
                'success' => true,
                'data' => $level,
                'message' => 'Niveau récupéré avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du niveau',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Level $level)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'section_id' => 'required|exists:sections,id',
            'description' => 'nullable|string',
            'order' => 'nullable|integer|min:0',
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
            $level->update($request->all());
            $level->load(['section', 'schoolClasses']);

            return response()->json([
                'success' => true,
                'data' => $level,
                'message' => 'Niveau mis à jour avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du niveau',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Level $level)
    {
        try {
            // Vérifier si le niveau a des classes
            if ($level->schoolClasses()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de supprimer ce niveau car il contient des classes'
                ], 400);
            }

            $level->delete();

            return response()->json([
                'success' => true,
                'message' => 'Niveau supprimé avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du niveau',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle status of a level
     */
    public function toggleStatus(Level $level)
    {
        try {
            $level->is_active = !$level->is_active;
            $level->save();

            return response()->json([
                'success' => true,
                'data' => $level,
                'message' => $level->is_active ? 'Niveau activé avec succès' : 'Niveau désactivé avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du changement de statut',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export levels to Excel
     */
    public function exportExcel(Request $request)
    {
        try {
            $sectionId = $request->get('section_id');
            $filename = 'niveaux_' . date('Y-m-d_H-i-s') . '.xlsx';
            return Excel::download(new LevelsExport($sectionId), $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export Excel',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export levels to CSV
     */
    public function exportCsv(Request $request)
    {
        try {
            $sectionId = $request->get('section_id');
            $filename = 'niveaux_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new LevelsImportableExport($sectionId), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export levels to PDF
     */
    public function exportPdf(Request $request)
    {
        try {
            $sectionId = $request->get('section_id');
            $filename = 'niveaux_' . date('Y-m-d_H-i-s') . '.pdf';
            return Excel::download(new LevelsExport($sectionId), $filename, \Maatwebsite\Excel\Excel::DOMPDF);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import levels from CSV
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

            $import = new LevelsImport();
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
     * Export levels in importable CSV format
     */
    public function exportImportable(Request $request)
    {
        try {
            $sectionId = $request->get('section_id');
            $filename = 'niveaux_importable_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new LevelsImportableExport($sectionId), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV importable',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download CSV template for levels import
     */
    public function downloadTemplate()
    {
        try {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="template_niveaux.csv"'
            ];

            $csvData = "id,nom,section_id,description,statut\n";
            $csvData .= ",CP1,13,Cours Préparatoire 1,1\n";
            $csvData .= ",6ème,14,Classe de Sixième,1\n";
            $csvData .= "1,CE1,13,Cours Élémentaire 1,0\n";

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