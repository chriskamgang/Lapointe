<?php

namespace App\Http\Controllers;

use App\Models\ClassSeries;
use App\Exports\SeriesExport;
use App\Exports\SeriesImportableExport;
use App\Imports\SeriesImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Response;

class SeriesController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = ClassSeries::with(['schoolClass.level.section']);
            
            // Filtrer par classe si spécifié
            if ($request->has('class_id')) {
                $query->where('class_id', $request->class_id);
            }
            
            // Filtrer par section si spécifié
            if ($request->has('section_id')) {
                $query->whereHas('schoolClass.level.section', function($q) use ($request) {
                    $q->where('id', $request->section_id);
                });
            }
            
            $series = $query->get();
            
            return response()->json([
                'success' => true,
                'data' => $series,
                'message' => 'Séries récupérées avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des séries',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export series to Excel
     */
    public function exportExcel(Request $request)
    {
        try {
            $filters = [
                'class_id' => $request->get('class_id'),
                'section_id' => $request->get('section_id')
            ];
            $filename = 'series_' . date('Y-m-d_H-i-s') . '.xlsx';
            return Excel::download(new SeriesExport($filters), $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export Excel',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export series to CSV
     */
    public function exportCsv(Request $request)
    {
        try {
            $filters = [
                'class_id' => $request->get('class_id'),
                'section_id' => $request->get('section_id')
            ];
            $filename = 'series_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new SeriesImportableExport($filters), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export series to PDF
     */
    public function exportPdf(Request $request)
    {
        try {
            $filters = [
                'class_id' => $request->get('class_id'),
                'section_id' => $request->get('section_id')
            ];
            $filename = 'series_' . date('Y-m-d_H-i-s') . '.pdf';
            return Excel::download(new SeriesExport($filters), $filename, \Maatwebsite\Excel\Excel::DOMPDF);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export series in importable CSV format
     */
    public function exportImportable(Request $request)
    {
        try {
            $filters = [
                'class_id' => $request->get('class_id'),
                'section_id' => $request->get('section_id')
            ];
            $filename = 'series_importable_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new SeriesImportableExport($filters), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV importable',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import series from CSV
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

            $import = new SeriesImport();
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
     * Download CSV template for series import
     */
    public function downloadTemplate()
    {
        try {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="template_series.csv"'
            ];

            $csvData = "id,nom,code,classe,niveau,section,capacite,statut\n";
            $csvData .= ",6ème A,6A,6ème A,6ème,Section Secondaire,40,actif\n";
            $csvData .= ",CP1 B,CP1B,CP1 B,CP1,Section Primaire,35,actif\n";
            $csvData .= "1,5ème A,5A,5ème A,5ème,Section Secondaire,38,actif\n";

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