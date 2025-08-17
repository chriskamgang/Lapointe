<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use App\Models\ClassSeries;
use App\Models\ClassPaymentAmount;
use App\Models\PaymentTranche;
use App\Exports\SchoolClassesExport;
use App\Exports\SchoolClassesImportableExport;
use App\Exports\SchoolClassesDetailedExport;
use App\Imports\SchoolClassesImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Response;

class SchoolClassController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = SchoolClass::with(['level.section', 'series', 'paymentAmounts.paymentTranche']);
            
            // Filtrer par niveau si spécifié
            if ($request->has('level_id')) {
                $query->where('level_id', $request->level_id);
            }
            
            // Filtrer par section si spécifié
            if ($request->has('section_id')) {
                $query->whereHas('level', function($q) use ($request) {
                    $q->where('section_id', $request->section_id);
                });
            }
            
            $classes = $query->get();
            
            return response()->json([
                'success' => true,
                'data' => $classes,
                'message' => 'Classes récupérées avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des classes',
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
                'total_classes' => SchoolClass::count(),
                'active_classes' => SchoolClass::where('is_active', true)->count(),
                'inactive_classes' => SchoolClass::where('is_active', false)->count(),
                'classes_with_students' => SchoolClass::has('students')->count(),
                'total_series' => ClassSeries::count(),
            ];

            $recentClasses = SchoolClass::with(['level.section'])
                ->latest()
                ->take(5)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'recent_classes' => $recentClasses
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
            'level_id' => 'required|exists:levels,id',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'series' => 'required|array|min:1',
            'series.*.name' => 'required|string|max:50',
            'series.*.code' => 'nullable|string|max:10',
            'series.*.capacity' => 'nullable|integer|min:1|max:200',
            'series.*.is_active' => 'boolean',
            'payment_amounts' => 'nullable|array',
            'payment_amounts.*.payment_tranche_id' => 'required|exists:payment_tranches,id',
            'payment_amounts.*.amount' => 'nullable|numeric|min:0',
            'payment_amounts.*.is_required' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Créer la classe
            $schoolClass = SchoolClass::create([
                'name' => $request->name,
                'level_id' => $request->level_id,
                'description' => $request->description,
                'is_active' => $request->is_active ?? true
            ]);

            // Créer les séries
            foreach ($request->series as $seriesData) {
                ClassSeries::create([
                    'class_id' => $schoolClass->id,
                    'name' => $seriesData['name'],
                    'code' => $seriesData['code'] ?? null,
                    'capacity' => $seriesData['capacity'] ?? null,
                    'is_active' => $seriesData['is_active'] ?? true
                ]);
            }

            // Créer les montants de paiement si fournis
            if ($request->has('payment_amounts') && !empty($request->payment_amounts)) {
                foreach ($request->payment_amounts as $paymentData) {
                    // Ne créer que si un montant est défini
                    if (!empty($paymentData['amount'])) {
                        ClassPaymentAmount::create([
                            'class_id' => $schoolClass->id,
                            'payment_tranche_id' => $paymentData['payment_tranche_id'],
                            'amount' => $paymentData['amount'] ?? 0,
                            'is_required' => $paymentData['is_required'] ?? true
                        ]);
                    }
                }
            }

            DB::commit();

            // Recharger avec les relations
            $schoolClass->load([
                'level.section', 
                'series', 
                'paymentAmounts.paymentTranche'
            ]);

            return response()->json([
                'success' => true,
                'data' => $schoolClass,
                'message' => 'Classe créée avec succès'
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de la classe',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(SchoolClass $schoolClass)
    {
        try {
            $schoolClass->load([
                'level.section',
                'series.students',
                'paymentAmounts.paymentTranche'
            ]);
            
            return response()->json([
                'success' => true,
                'data' => $schoolClass,
                'message' => 'Classe récupérée avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de la classe',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, SchoolClass $schoolClass)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'level_id' => 'required|exists:levels,id',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'series' => 'nullable|array',
            'series.*.id' => 'nullable|exists:class_series,id',
            'series.*.name' => 'required|string|max:50',
            'series.*.code' => 'nullable|string|max:10',
            'series.*.capacity' => 'nullable|integer|min:1|max:200',
            'series.*.is_active' => 'boolean',
            'payment_amounts' => 'nullable|array',
            'payment_amounts.*.id' => 'nullable|exists:class_payment_amounts,id',
            'payment_amounts.*.payment_tranche_id' => 'required|exists:payment_tranches,id',
            'payment_amounts.*.amount' => 'nullable|numeric|min:0',
            'payment_amounts.*.is_required' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Mettre à jour les informations de base de la classe
            $schoolClass->update([
                'name' => $request->name,
                'level_id' => $request->level_id,
                'description' => $request->description,
                'is_active' => $request->is_active ?? $schoolClass->is_active
            ]);

            // Gérer les séries si elles sont fournies
            if ($request->has('series')) {
                // Obtenir les IDs des séries existantes
                $existingSeriesIds = $schoolClass->series->pluck('id')->toArray();
                $updatedSeriesIds = [];

                foreach ($request->series as $seriesData) {
                    if (isset($seriesData['id'])) {
                        // Mise à jour d'une série existante
                        $series = ClassSeries::find($seriesData['id']);
                        if ($series && $series->class_id === $schoolClass->id) {
                            $series->update([
                                'name' => $seriesData['name'],
                                'code' => $seriesData['code'] ?? null,
                                'capacity' => $seriesData['capacity'] ?? null,
                                'is_active' => $seriesData['is_active'] ?? true
                            ]);
                            $updatedSeriesIds[] = $series->id;
                        }
                    } else {
                        // Création d'une nouvelle série
                        $newSeries = ClassSeries::create([
                            'class_id' => $schoolClass->id,
                            'name' => $seriesData['name'],
                            'code' => $seriesData['code'] ?? null,
                            'capacity' => $seriesData['capacity'] ?? null,
                            'is_active' => $seriesData['is_active'] ?? true
                        ]);
                        $updatedSeriesIds[] = $newSeries->id;
                    }
                }

                // Supprimer les séries qui ne sont plus présentes
                $seriesToDelete = array_diff($existingSeriesIds, $updatedSeriesIds);
                if (!empty($seriesToDelete)) {
                    ClassSeries::whereIn('id', $seriesToDelete)->delete();
                }
            }

            // Gérer les montants de paiement si ils sont fournis
            if ($request->has('payment_amounts')) {
                // Obtenir les IDs des montants existants
                $existingPaymentIds = $schoolClass->paymentAmounts->pluck('id')->toArray();
                $updatedPaymentIds = [];

                foreach ($request->payment_amounts as $paymentData) {
                    // Ne traiter que si un montant est défini
                    if (!empty($paymentData['amount'])) {
                        if (isset($paymentData['id'])) {
                            // Mise à jour d'un montant existant
                            $payment = ClassPaymentAmount::find($paymentData['id']);
                            if ($payment && $payment->class_id === $schoolClass->id) {
                                $payment->update([
                                    'amount' => $paymentData['amount'] ?? 0,
                                    'is_required' => $paymentData['is_required'] ?? true
                                ]);
                                $updatedPaymentIds[] = $payment->id;
                            }
                        } else {
                            // Création d'un nouveau montant
                            $newPayment = ClassPaymentAmount::create([
                                'class_id' => $schoolClass->id,
                                'payment_tranche_id' => $paymentData['payment_tranche_id'],
                                'amount' => $paymentData['amount'] ?? 0,
                                'is_required' => $paymentData['is_required'] ?? true
                            ]);
                            $updatedPaymentIds[] = $newPayment->id;
                        }
                    }
                }

                // Supprimer les montants qui ne sont plus présents
                $paymentsToDelete = array_diff($existingPaymentIds, $updatedPaymentIds);
                if (!empty($paymentsToDelete)) {
                    ClassPaymentAmount::whereIn('id', $paymentsToDelete)->delete();
                }
            }

            DB::commit();

            // Recharger avec les relations
            $schoolClass->load(['level.section', 'series', 'paymentAmounts.paymentTranche']);

            return response()->json([
                'success' => true,
                'data' => $schoolClass,
                'message' => 'Classe mise à jour avec succès'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de la classe',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(SchoolClass $schoolClass)
    {
        try {
            // Vérifier s'il y a des étudiants dans les séries de cette classe
            if ($schoolClass->students()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible de supprimer cette classe car elle contient des étudiants'
                ], 400);
            }

            $schoolClass->delete();

            return response()->json([
                'success' => true,
                'message' => 'Classe supprimée avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de la classe',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle status of a class
     */
    public function toggleStatus(SchoolClass $schoolClass)
    {
        try {
            $schoolClass->is_active = !$schoolClass->is_active;
            $schoolClass->save();

            return response()->json([
                'success' => true,
                'data' => $schoolClass,
                'message' => $schoolClass->is_active ? 'Classe activée avec succès' : 'Classe désactivée avec succès'
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
     * Configurer les montants de paiement pour une classe
     */
    public function configurePayments(Request $request, SchoolClass $schoolClass)
    {
        $validator = Validator::make($request->all(), [
            'payment_amounts' => 'required|array',
            'payment_amounts.*.payment_tranche_id' => 'required|exists:payment_tranches,id',
            'payment_amounts.*.amount' => 'required|numeric|min:0',
            'payment_amounts.*.is_required' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Supprimer les anciens montants
            $schoolClass->paymentAmounts()->delete();

            // Créer les nouveaux montants
            foreach ($request->payment_amounts as $paymentData) {
                ClassPaymentAmount::create([
                    'class_id' => $schoolClass->id,
                    'payment_tranche_id' => $paymentData['payment_tranche_id'],
                    'amount' => $paymentData['amount'],
                    'is_required' => $paymentData['is_required'] ?? true
                ]);
            }

            DB::commit();

            // Recharger avec les relations
            $schoolClass->load(['paymentAmounts.paymentTranche']);

            return response()->json([
                'success' => true,
                'data' => $schoolClass,
                'message' => 'Montants de paiement configurés avec succès'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la configuration des paiements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export school classes to Excel
     */
    public function exportExcel(Request $request)
    {
        try {
            $filters = [
                'section_id' => $request->get('section_id'),
                'level_id' => $request->get('level_id')
            ];
            $filename = 'classes_' . date('Y-m-d_H-i-s') . '.xlsx';
            return Excel::download(new SchoolClassesExport($filters), $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export Excel',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export school classes to CSV
     */
    public function exportCsv(Request $request)
    {
        try {
            $filters = [
                'section_id' => $request->get('section_id'),
                'level_id' => $request->get('level_id')
            ];
            $filename = 'classes_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new SchoolClassesImportableExport($filters), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export school classes to PDF
     */
    public function exportPdf(Request $request)
    {
        try {
            \Log::info('Export PDF démarré', ['user_id' => auth()->id()]);
            
            $filters = [
                'section_id' => $request->get('section_id'),
                'level_id' => $request->get('level_id')
            ];
            
            \Log::info('Filtres appliqués', $filters);
            
            $filename = 'classes_' . date('Y-m-d_H-i-s') . '.pdf';
            
            $export = new SchoolClassesDetailedExport($filters);
            
            \Log::info('Export créé, génération PDF...');
            
            return Excel::download($export, $filename, \Maatwebsite\Excel\Excel::DOMPDF);
            
        } catch (\Exception $e) {
            \Log::error('Erreur export PDF', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export PDF',
                'error' => $e->getMessage(),
                'debug' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Import school classes from CSV
     */
    public function importCsv(Request $request)
    {
        try {
            \Log::info('Import CSV démarré', ['user_id' => auth()->id()]);
            
            $validator = Validator::make($request->all(), [
                'file' => 'required|mimes:csv,txt|max:2048'
            ]);

            if ($validator->fails()) {
                \Log::error('Validation import failed', $validator->errors()->toArray());
                return response()->json([
                    'success' => false,
                    'message' => 'Fichier invalide',
                    'errors' => $validator->errors()
                ], 422);
            }

            \Log::info('Début du traitement du fichier', ['filename' => $request->file('file')->getClientOriginalName()]);

            $import = new SchoolClassesImport();
            Excel::import($import, $request->file('file'));
            
            $results = $import->getResults();
            
            \Log::info('Import terminé', $results);

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
     * Export school classes in importable CSV format
     */
    public function exportImportable(Request $request)
    {
        try {
            $filters = [
                'section_id' => $request->get('section_id'),
                'level_id' => $request->get('level_id')
            ];
            $filename = 'classes_importable_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new SchoolClassesImportableExport($filters), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV importable',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download CSV template for school classes import
     */
    public function downloadTemplate()
    {
        try {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="template_classes.csv"'
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