<?php

namespace App\Http\Controllers;

use App\Exports\ClassesSeriesImportableExport;
use App\Imports\ClassesSeriesImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Response;

class ClassesSeriesController extends Controller
{
    /**
     * Export classes and series to CSV (importable format)
     */
    public function exportCsv(Request $request)
    {
        try {
            $filters = [
                'section_id' => $request->get('section_id'),
                'level_id' => $request->get('level_id')
            ];
            
            $filename = 'classes_series_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new ClassesSeriesImportableExport($filters), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export classes and series to Excel
     */
    public function exportExcel(Request $request)
    {
        try {
            $filters = [
                'section_id' => $request->get('section_id'),
                'level_id' => $request->get('level_id')
            ];
            
            $filename = 'classes_series_' . date('Y-m-d_H-i-s') . '.xlsx';
            return Excel::download(new ClassesSeriesImportableExport($filters), $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export Excel',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export classes and series to PDF
     */
    public function exportPdf(Request $request)
    {
        try {
            $filters = [
                'section_id' => $request->get('section_id'),
                'level_id' => $request->get('level_id')
            ];
            
            $filename = 'classes_series_' . date('Y-m-d_H-i-s') . '.pdf';
            return Excel::download(new ClassesSeriesImportableExport($filters), $filename, \Maatwebsite\Excel\Excel::DOMPDF);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import classes and series from CSV
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
            
            $import = new ClassesSeriesImport();
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
     * Download CSV template for classes and series import
     */
    public function downloadTemplate()
    {
        try {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="template_classes_series.csv"'
            ];

            $csvData = "class_id,class_nom,level_id,class_description,class_statut,series\n";
            $csvData .= ",6ème A,8,Classe de Sixième,1,\":6A1:6A1:35:1|:6A2:6A2:35:1\"\n";
            $csvData .= ",CM1,6,Cours Moyen 1ère année,1,\":CM1A:CM1A:30:1\"\n";
            $csvData .= "1,6ème A MODIFIÉE,8,Classe modifiée,1,\"3:6A1MOD:6A1MOD:40:0\"\n";

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