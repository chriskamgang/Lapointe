<?php

namespace App\Http\Controllers;

use App\Models\UniversityFee;
use App\Models\School;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class UniversityFeeController extends Controller
{
    /**
     * Lister tous les frais universitaires
     */
    public function index(Request $request)
    {
        try {
            $query = UniversityFee::with(['school']);
            
            // Filtrer par école si spécifié
            if ($request->has('school_id')) {
                $query->where('school_id', $request->school_id);
            }
            
            // Filtrer par type de niveau
            if ($request->has('level_type')) {
                $query->where('level_type', $request->level_type);
            }
            
            // Filtrer par spécialité
            if ($request->has('speciality')) {
                $query->where('speciality', 'like', '%' . $request->speciality . '%');
            }
            
            // Filtrer par statut actif
            if ($request->has('active')) {
                $isActive = filter_var($request->active, FILTER_VALIDATE_BOOLEAN);
                $query->where('is_active', $isActive);
            }

            $fees = $query->orderBy('school_id')
                         ->orderBy('level_type')
                         ->orderBy('speciality')
                         ->get();

            return response()->json([
                'success' => true,
                'data' => $fees
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des frais',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer de nouveaux frais universitaires
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'school_id' => 'required|exists:schools,id',
            'level_type' => 'required|string|max:50',
            'speciality' => 'required|string|max:100',
            'inscription_fee' => 'required|numeric|min:0',
            'first_installment' => 'required|numeric|min:0',
            'second_installment' => 'required|numeric|min:0',
            'third_installment' => 'required|numeric|min:0',
            'total_annual_fee' => 'required|numeric|min:0',
            'duration_years' => 'required|integer|min:1|max:10',
            'included_benefits' => 'nullable|string',
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
            // Vérifier l'unicité
            $existingFee = UniversityFee::where('school_id', $request->school_id)
                ->where('level_type', $request->level_type)
                ->where('speciality', $request->speciality)
                ->first();

            if ($existingFee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Des frais existent déjà pour cette combinaison école/niveau/spécialité'
                ], 422);
            }

            $fee = UniversityFee::create($request->all());
            $fee->load(['school']);

            return response()->json([
                'success' => true,
                'data' => $fee,
                'message' => 'Frais universitaires créés avec succès'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création des frais',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Afficher des frais spécifiques
     */
    public function show($id)
    {
        try {
            $fee = UniversityFee::with(['school'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $fee
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Frais non trouvés',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Mettre à jour des frais
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'school_id' => 'required|exists:schools,id',
            'level_type' => 'required|string|max:50',
            'speciality' => 'required|string|max:100',
            'inscription_fee' => 'required|numeric|min:0',
            'first_installment' => 'required|numeric|min:0',
            'second_installment' => 'required|numeric|min:0',
            'third_installment' => 'required|numeric|min:0',
            'total_annual_fee' => 'required|numeric|min:0',
            'duration_years' => 'required|integer|min:1|max:10',
            'included_benefits' => 'nullable|string',
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
            $fee = UniversityFee::findOrFail($id);

            // Vérifier l'unicité (exclure l'enregistrement actuel)
            $existingFee = UniversityFee::where('school_id', $request->school_id)
                ->where('level_type', $request->level_type)
                ->where('speciality', $request->speciality)
                ->where('id', '!=', $id)
                ->first();

            if ($existingFee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Des frais existent déjà pour cette combinaison école/niveau/spécialité'
                ], 422);
            }

            $fee->update($request->all());
            $fee->load(['school']);

            return response()->json([
                'success' => true,
                'data' => $fee,
                'message' => 'Frais universitaires mis à jour avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour des frais',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer des frais
     */
    public function destroy($id)
    {
        try {
            $fee = UniversityFee::findOrFail($id);
            $fee->delete();

            return response()->json([
                'success' => true,
                'message' => 'Frais universitaires supprimés avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression des frais',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les frais d'une école spécifique
     */
    public function getBySchool($schoolId)
    {
        try {
            $fees = UniversityFee::active()
                ->where('school_id', $schoolId)
                ->with('school')
                ->orderBy('level_type')
                ->orderBy('speciality')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $fees
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des frais de l\'école',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les frais par type de niveau
     */
    public function getByLevelType($levelType)
    {
        try {
            $fees = UniversityFee::active()
                ->where('level_type', $levelType)
                ->with('school')
                ->orderBy('school_id')
                ->orderBy('speciality')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $fees
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des frais par type de niveau',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculer les frais pour un étudiant
     */
    public function calculateForStudent(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'school_id' => 'required|exists:schools,id',
            'level_type' => 'required|string',
            'speciality' => 'required|string',
            'scholarship_amount' => 'nullable|numeric|min:0',
            'discount_percentage' => 'nullable|numeric|min:0|max:100'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $fee = UniversityFee::where('school_id', $request->school_id)
                ->where('level_type', $request->level_type)
                ->where('speciality', $request->speciality)
                ->active()
                ->first();

            if (!$fee) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucun frais configuré pour cette combinaison'
                ], 404);
            }

            // Calcul avec bourses et remises
            $scholarshipAmount = $request->scholarship_amount ?? 0;
            $discountPercentage = $request->discount_percentage ?? 0;

            $totalBeforeDiscount = $fee->total_annual_fee;
            $discountAmount = ($totalBeforeDiscount * $discountPercentage) / 100;
            $totalAfterDiscount = $totalBeforeDiscount - $discountAmount;
            $finalAmount = max(0, $totalAfterDiscount - $scholarshipAmount);

            $calculation = [
                'original_fee' => $fee,
                'breakdown' => [
                    'inscription_fee' => $fee->inscription_fee,
                    'first_installment' => $fee->first_installment,
                    'second_installment' => $fee->second_installment,
                    'third_installment' => $fee->third_installment,
                    'total_annual_fee' => $fee->total_annual_fee
                ],
                'adjustments' => [
                    'scholarship_amount' => $scholarshipAmount,
                    'discount_percentage' => $discountPercentage,
                    'discount_amount' => $discountAmount
                ],
                'final_calculation' => [
                    'total_before_discount' => $totalBeforeDiscount,
                    'total_after_discount' => $totalAfterDiscount,
                    'final_amount_to_pay' => $finalAmount,
                    'total_savings' => $totalBeforeDiscount - $finalAmount
                ],
                'installments_adjusted' => [
                    'inscription' => $fee->inscription_fee,
                    'first_installment' => max(0, ($fee->first_installment * (100 - $discountPercentage)) / 100),
                    'second_installment' => max(0, ($fee->second_installment * (100 - $discountPercentage)) / 100),
                    'third_installment' => max(0, ($fee->third_installment * (100 - $discountPercentage)) / 100)
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $calculation
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du calcul des frais',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques des frais
     */
    public function getFeesStatistics()
    {
        try {
            $stats = [
                'total_fee_configurations' => UniversityFee::count(),
                'active_configurations' => UniversityFee::where('is_active', true)->count(),
                'schools_with_fees' => UniversityFee::distinct('school_id')->count(),
                'level_types_configured' => UniversityFee::distinct('level_type')->count(),
                'specialities_configured' => UniversityFee::distinct('speciality')->count()
            ];

            // Frais par école
            $feesBySchool = UniversityFee::with('school')
                ->selectRaw('school_id, COUNT(*) as fee_count, AVG(total_annual_fee) as avg_fee, MIN(total_annual_fee) as min_fee, MAX(total_annual_fee) as max_fee')
                ->groupBy('school_id')
                ->get();

            // Frais par type de niveau
            $feesByLevelType = UniversityFee::selectRaw('level_type, COUNT(*) as fee_count, AVG(total_annual_fee) as avg_fee')
                ->groupBy('level_type')
                ->get();

            // Répartition des montants
            $feeRanges = [
                '0-200k' => UniversityFee::where('total_annual_fee', '<=', 200000)->count(),
                '200k-500k' => UniversityFee::whereBetween('total_annual_fee', [200001, 500000])->count(),
                '500k-800k' => UniversityFee::whereBetween('total_annual_fee', [500001, 800000])->count(),
                '800k+' => UniversityFee::where('total_annual_fee', '>', 800000)->count()
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'global_stats' => $stats,
                    'fees_by_school' => $feesBySchool,
                    'fees_by_level_type' => $feesByLevelType,
                    'fee_ranges' => $feeRanges
                ]
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
     * Dupliquer des frais pour une nouvelle année
     */
    public function duplicateForNewYear(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'source_year' => 'required|string',
            'target_year' => 'required|string',
            'fee_ids' => 'required|array',
            'fee_ids.*' => 'exists:university_fees,id',
            'adjustment_percentage' => 'nullable|numeric|min:-50|max:100'
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

            $adjustmentPercentage = $request->adjustment_percentage ?? 0;
            $duplicatedFees = [];

            foreach ($request->fee_ids as $feeId) {
                $originalFee = UniversityFee::findOrFail($feeId);
                
                $newFeeData = $originalFee->toArray();
                unset($newFeeData['id'], $newFeeData['created_at'], $newFeeData['updated_at']);

                // Appliquer l'ajustement des frais
                if ($adjustmentPercentage != 0) {
                    $newFeeData['inscription_fee'] *= (1 + $adjustmentPercentage / 100);
                    $newFeeData['first_installment'] *= (1 + $adjustmentPercentage / 100);
                    $newFeeData['second_installment'] *= (1 + $adjustmentPercentage / 100);
                    $newFeeData['third_installment'] *= (1 + $adjustmentPercentage / 100);
                    $newFeeData['total_annual_fee'] *= (1 + $adjustmentPercentage / 100);
                    
                    // Arrondir les montants
                    $newFeeData['inscription_fee'] = round($newFeeData['inscription_fee'], 0);
                    $newFeeData['first_installment'] = round($newFeeData['first_installment'], 0);
                    $newFeeData['second_installment'] = round($newFeeData['second_installment'], 0);
                    $newFeeData['third_installment'] = round($newFeeData['third_installment'], 0);
                    $newFeeData['total_annual_fee'] = round($newFeeData['total_annual_fee'], 0);
                }

                // Modifier le nom/description pour indiquer la nouvelle année
                $newFeeData['included_benefits'] = str_replace(
                    $request->source_year, 
                    $request->target_year, 
                    $newFeeData['included_benefits'] ?? ''
                );

                $duplicatedFee = UniversityFee::create($newFeeData);
                $duplicatedFees[] = $duplicatedFee;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $duplicatedFees,
                'message' => count($duplicatedFees) . ' configuration(s) de frais dupliquée(s) avec succès'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la duplication des frais',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import en masse des frais depuis un fichier CSV
     */
    public function bulkImport(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|mimes:csv,txt|max:2048',
            'update_existing' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Fichier invalide',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $file = $request->file('file');
            $csvData = array_map('str_getcsv', file($file->getRealPath()));
            $headers = array_shift($csvData); // Remove header row

            $imported = 0;
            $updated = 0;
            $errors = [];
            $updateExisting = $request->update_existing ?? false;

            foreach ($csvData as $index => $row) {
                try {
                    $rowData = array_combine($headers, $row);
                    
                    // Validation des données de la ligne
                    $feeData = [
                        'school_id' => (int) $rowData['school_id'],
                        'level_type' => trim($rowData['level_type']),
                        'speciality' => trim($rowData['speciality']),
                        'inscription_fee' => (float) $rowData['inscription_fee'],
                        'first_installment' => (float) $rowData['first_installment'],
                        'second_installment' => (float) $rowData['second_installment'],
                        'third_installment' => (float) $rowData['third_installment'],
                        'total_annual_fee' => (float) $rowData['total_annual_fee'],
                        'duration_years' => (int) $rowData['duration_years'],
                        'included_benefits' => $rowData['included_benefits'] ?? null,
                        'is_active' => filter_var($rowData['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN)
                    ];

                    // Vérifier si l'école existe
                    if (!School::find($feeData['school_id'])) {
                        $errors[] = "Ligne " . ($index + 2) . ": École ID {$feeData['school_id']} n'existe pas";
                        continue;
                    }

                    if ($updateExisting) {
                        $fee = UniversityFee::updateOrCreate(
                            [
                                'school_id' => $feeData['school_id'],
                                'level_type' => $feeData['level_type'],
                                'speciality' => $feeData['speciality']
                            ],
                            $feeData
                        );

                        if ($fee->wasRecentlyCreated) {
                            $imported++;
                        } else {
                            $updated++;
                        }
                    } else {
                        // Vérifier l'unicité avant création
                        $exists = UniversityFee::where('school_id', $feeData['school_id'])
                            ->where('level_type', $feeData['level_type'])
                            ->where('speciality', $feeData['speciality'])
                            ->exists();

                        if ($exists) {
                            $errors[] = "Ligne " . ($index + 2) . ": Configuration déjà existante pour {$feeData['speciality']} - {$feeData['level_type']}";
                            continue;
                        }

                        UniversityFee::create($feeData);
                        $imported++;
                    }

                } catch (\Exception $e) {
                    $errors[] = "Ligne " . ($index + 2) . ": " . $e->getMessage();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Import terminé: {$imported} frais importés, {$updated} mis à jour",
                'imported_count' => $imported,
                'updated_count' => $updated,
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'import',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export des frais en CSV
     */
    public function exportToCsv(Request $request)
    {
        try {
            $query = UniversityFee::with(['school']);

            // Appliquer les filtres
            if ($request->school_id) {
                $query->where('school_id', $request->school_id);
            }

            if ($request->level_type) {
                $query->where('level_type', $request->level_type);
            }

            if ($request->active_only) {
                $query->where('is_active', true);
            }

            $fees = $query->orderBy('school_id')
                         ->orderBy('level_type')
                         ->orderBy('speciality')
                         ->get();

            $csvData = [];
            $csvData[] = [
                'school_id',
                'school_name',
                'level_type',
                'speciality',
                'inscription_fee',
                'first_installment',
                'second_installment',
                'third_installment',
                'total_annual_fee',
                'duration_years',
                'included_benefits',
                'is_active',
                'created_at'
            ];

            foreach ($fees as $fee) {
                $csvData[] = [
                    $fee->school_id,
                    $fee->school->name ?? 'N/A',
                    $fee->level_type,
                    $fee->speciality,
                    $fee->inscription_fee,
                    $fee->first_installment,
                    $fee->second_installment,
                    $fee->third_installment,
                    $fee->total_annual_fee,
                    $fee->duration_years,
                    $fee->included_benefits ?? '',
                    $fee->is_active ? 'true' : 'false',
                    $fee->created_at->format('Y-m-d H:i:s')
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $csvData,
                'message' => 'Export CSV généré avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir un résumé des frais par école
     */
    public function getSchoolFeesSummary($schoolId)
    {
        try {
            $school = School::findOrFail($schoolId);
            
            $fees = UniversityFee::where('school_id', $schoolId)
                ->where('is_active', true)
                ->get();

            $summary = [
                'school' => [
                    'id' => $school->id,
                    'name' => $school->name,
                    'code' => $school->code
                ],
                'total_configurations' => $fees->count(),
                'level_types' => $fees->pluck('level_type')->unique()->values(),
                'specialities' => $fees->pluck('speciality')->unique()->values(),
                'fee_range' => [
                    'min' => $fees->min('total_annual_fee'),
                    'max' => $fees->max('total_annual_fee'),
                    'average' => $fees->avg('total_annual_fee')
                ],
                'by_level_type' => [],
                'recent_configurations' => $fees->sortByDesc('created_at')->take(5)->values()
            ];

            // Grouper par type de niveau
            $byLevelType = $fees->groupBy('level_type');
            foreach ($byLevelType as $levelType => $levelFees) {
                $summary['by_level_type'][$levelType] = [
                    'count' => $levelFees->count(),
                    'specialities' => $levelFees->pluck('speciality')->values(),
                    'fee_range' => [
                        'min' => $levelFees->min('total_annual_fee'),
                        'max' => $levelFees->max('total_annual_fee'),
                        'average' => $levelFees->avg('total_annual_fee')
                    ]
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $summary
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du résumé',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activer/Désactiver plusieurs frais en masse
     */
    public function bulkToggleStatus(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fee_ids' => 'required|array',
            'fee_ids.*' => 'exists:university_fees,id',
            'status' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $updated = UniversityFee::whereIn('id', $request->fee_ids)
                ->update(['is_active' => $request->status]);

            $statusText = $request->status ? 'activés' : 'désactivés';

            return response()->json([
                'success' => true,
                'message' => "{$updated} frais {$statusText} avec succès",
                'updated_count' => $updated
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
     * Supprimer plusieurs frais en masse
     */
    public function bulkDelete(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fee_ids' => 'required|array',
            'fee_ids.*' => 'exists:university_fees,id',
            'confirm' => 'required|boolean|accepted'
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

            $deleted = UniversityFee::whereIn('id', $request->fee_ids)->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "{$deleted} frais supprimés avec succès",
                'deleted_count' => $deleted
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Valider la cohérence des frais (inscription + tranches = total)
     */
    public function validateFeesConsistency(Request $request)
    {
        try {
            $query = UniversityFee::query();

            if ($request->school_id) {
                $query->where('school_id', $request->school_id);
            }

            $fees = $query->get();
            $inconsistencies = [];

            foreach ($fees as $fee) {
                $calculatedTotal = $fee->inscription_fee + $fee->first_installment + 
                                 $fee->second_installment + $fee->third_installment;
                
                if (abs($calculatedTotal - $fee->total_annual_fee) > 1) { // Tolérance de 1 FCFA
                    $inconsistencies[] = [
                        'fee_id' => $fee->id,
                        'school_name' => $fee->school->name ?? 'N/A',
                        'level_type' => $fee->level_type,
                        'speciality' => $fee->speciality,
                        'declared_total' => $fee->total_annual_fee,
                        'calculated_total' => $calculatedTotal,
                        'difference' => $fee->total_annual_fee - $calculatedTotal,
                        'breakdown' => [
                            'inscription' => $fee->inscription_fee,
                            'first' => $fee->first_installment,
                            'second' => $fee->second_installment,
                            'third' => $fee->third_installment
                        ]
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'total_checked' => $fees->count(),
                    'inconsistencies_found' => count($inconsistencies),
                    'inconsistencies' => $inconsistencies
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la validation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Corriger automatiquement les incohérences
     */
    public function fixFeesInconsistencies(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fee_ids' => 'required|array',
            'fee_ids.*' => 'exists:university_fees,id',
            'fix_method' => 'required|in:recalculate_total,redistribute_installments'
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

            $fixed = 0;
            $fixMethod = $request->fix_method;

            foreach ($request->fee_ids as $feeId) {
                $fee = UniversityFee::findOrFail($feeId);

                if ($fixMethod === 'recalculate_total') {
                    // Recalculer le total basé sur les tranches
                    $newTotal = $fee->inscription_fee + $fee->first_installment + 
                               $fee->second_installment + $fee->third_installment;
                    $fee->update(['total_annual_fee' => $newTotal]);
                } else {
                    // Redistribuer le total sur les tranches (garder inscription fixe)
                    $remainingAmount = $fee->total_annual_fee - $fee->inscription_fee;
                    $perInstallment = round($remainingAmount / 3, 0);
                    
                    $fee->update([
                        'first_installment' => $perInstallment,
                        'second_installment' => $perInstallment,
                        'third_installment' => $remainingAmount - (2 * $perInstallment)
                    ]);
                }

                $fixed++;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "{$fixed} frais corrigés avec succès",
                'fixed_count' => $fixed
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la correction',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Recherche avancée des frais
     */
    public function advancedSearch(Request $request)
    {
        try {
            $query = UniversityFee::with(['school']);

            // Recherche par nom d'école
            if ($request->has('school_name')) {
                $query->whereHas('school', function($q) use ($request) {
                    $q->where('name', 'like', '%' . $request->school_name . '%');
                });
            }

            // Recherche par code école
            if ($request->has('school_code')) {
                $query->whereHas('school', function($q) use ($request) {
                    $q->where('code', 'like', '%' . $request->school_code . '%');
                });
            }

            // Filtres par montants
            if ($request->has('min_fee')) {
                $query->where('total_annual_fee', '>=', $request->min_fee);
            }

            if ($request->has('max_fee')) {
                $query->where('total_annual_fee', '<=', $request->max_fee);
            }

            // Filtre par durée
            if ($request->has('duration_years')) {
                $query->where('duration_years', $request->duration_years);
            }

            // Recherche dans les avantages inclus
            if ($request->has('benefits_keyword')) {
                $query->where('included_benefits', 'like', '%' . $request->benefits_keyword . '%');
            }

            // Tri
            $sortBy = $request->get('sort_by', 'total_annual_fee');
            $sortOrder = $request->get('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $fees = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $fees
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la recherche',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Comparer les frais entre plusieurs écoles
     */
    public function compareSchoolFees(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'school_ids' => 'required|array|min:2',
            'school_ids.*' => 'exists:schools,id',
            'level_type' => 'nullable|string',
            'speciality' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $query = UniversityFee::with(['school'])
                ->whereIn('school_id', $request->school_ids)
                ->where('is_active', true);

            if ($request->level_type) {
                $query->where('level_type', $request->level_type);
            }

            if ($request->speciality) {
                $query->where('speciality', 'like', '%' . $request->speciality . '%');
            }

            $fees = $query->get();

            $comparison = [
                'schools' => [],
                'comparison_matrix' => [],
                'summary' => [
                    'total_configurations' => $fees->count(),
                    'schools_compared' => count($request->school_ids),
                    'cheapest_school' => null,
                    'most_expensive_school' => null,
                    'average_difference' => 0
                ]
            ];

            // Grouper par école
            $feesBySchool = $fees->groupBy('school_id');
            
            foreach ($request->school_ids as $schoolId) {
                $school = School::find($schoolId);
                $schoolFees = $feesBySchool->get($schoolId, collect());

                $schoolData = [
                    'school' => $school,
                    'total_configurations' => $schoolFees->count(),
                    'average_fee' => $schoolFees->avg('total_annual_fee'),
                    'min_fee' => $schoolFees->min('total_annual_fee'),
                    'max_fee' => $schoolFees->max('total_annual_fee'),
                    'fees' => $schoolFees->values()
                ];

                $comparison['schools'][$schoolId] = $schoolData;
            }

            // Trouver l'école la moins chère et la plus chère
            $averageFees = collect($comparison['schools'])->pluck('average_fee', 'school.id');
            $cheapestSchoolId = $averageFees->keys()->min(function($schoolId) use ($averageFees) {
                return $averageFees[$schoolId];
            });
            $mostExpensiveSchoolId = $averageFees->keys()->max(function($schoolId) use ($averageFees) {
                return $averageFees[$schoolId];
            });

            $comparison['summary']['cheapest_school'] = $comparison['schools'][$cheapestSchoolId]['school'] ?? null;
            $comparison['summary']['most_expensive_school'] = $comparison['schools'][$mostExpensiveSchoolId]['school'] ?? null;
            $comparison['summary']['average_difference'] = $averageFees->max() - $averageFees->min();

            return response()->json([
                'success' => true,
                'data' => $comparison
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la comparaison',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir l'historique des modifications des frais
     */
    public function getFeesHistory($feeId)
    {
        try {
            // Si tu utilises un package comme spatie/laravel-activitylog
            // tu peux récupérer l'historique des modifications
            
            $fee = UniversityFee::with(['school'])->findOrFail($feeId);
            
            // Pour l'instant, on retourne les infos de base
            // Tu peux implémenter un système d'audit plus tard
            $history = [
                'fee' => $fee,
                'created_at' => $fee->created_at,
                'updated_at' => $fee->updated_at,
                'modifications' => [
                    // Ici tu peux ajouter la logique pour récupérer l'historique
                    // des modifications si tu utilises un système d'audit
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => $history
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'historique',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Prévisualiser l'impact d'un changement de frais
     */
    public function previewFeeImpact(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fee_id' => 'required|exists:university_fees,id',
            'new_total_fee' => 'required|numeric|min:0',
            'distribution_method' => 'required|in:equal,proportional,custom',
            'custom_breakdown' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $fee = UniversityFee::findOrFail($request->fee_id);
            $newTotal = $request->new_total_fee;
            $distributionMethod = $request->distribution_method;

            $currentBreakdown = [
                'inscription_fee' => $fee->inscription_fee,
                'first_installment' => $fee->first_installment,
                'second_installment' => $fee->second_installment,
                'third_installment' => $fee->third_installment,
                'total_annual_fee' => $fee->total_annual_fee
            ];

            $newBreakdown = [];

            switch ($distributionMethod) {
                case 'equal':
                    // Garder l'inscription fixe, distribuer le reste équitablement
                    $remainingAmount = $newTotal - $fee->inscription_fee;
                    $perInstallment = round($remainingAmount / 3, 0);
                    
                    $newBreakdown = [
                        'inscription_fee' => $fee->inscription_fee,
                        'first_installment' => $perInstallment,
                        'second_installment' => $perInstallment,
                        'third_installment' => $remainingAmount - (2 * $perInstallment),
                        'total_annual_fee' => $newTotal
                    ];
                    break;

                case 'proportional':
                    // Maintenir les proportions actuelles
                    $ratio = $newTotal / $fee->total_annual_fee;
                    
                    $newBreakdown = [
                        'inscription_fee' => round($fee->inscription_fee * $ratio, 0),
                        'first_installment' => round($fee->first_installment * $ratio, 0),
                        'second_installment' => round($fee->second_installment * $ratio, 0),
                        'third_installment' => round($fee->third_installment * $ratio, 0),
                        'total_annual_fee' => $newTotal
                    ];
                    break;

                case 'custom':
                    if (!$request->custom_breakdown) {
                        throw new \Exception('Répartition personnalisée requise');
                    }
                    
                    $newBreakdown = array_merge([
                        'total_annual_fee' => $newTotal
                    ], $request->custom_breakdown);
                    break;
            }

            $impact = [
                'fee_info' => [
                    'id' => $fee->id,
                    'school_name' => $fee->school->name,
                    'level_type' => $fee->level_type,
                    'speciality' => $fee->speciality
                ],
                'current_breakdown' => $currentBreakdown,
                'proposed_breakdown' => $newBreakdown,
                'changes' => [],
                'percentage_change' => round((($newTotal - $fee->total_annual_fee) / $fee->total_annual_fee) * 100, 2)
            ];

            // Calculer les changements pour chaque composant
            foreach ($currentBreakdown as $key => $currentValue) {
                $newValue = $newBreakdown[$key];
                $impact['changes'][$key] = [
                    'current' => $currentValue,
                    'new' => $newValue,
                    'difference' => $newValue - $currentValue,
                    'percentage_change' => $currentValue > 0 ? round((($newValue - $currentValue) / $currentValue) * 100, 2) : 0
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $impact
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la prévisualisation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Générer un rapport détaillé des frais
     */
    public function generateDetailedReport(Request $request)
    {
        try {
            $filters = [
                'school_id' => $request->school_id,
                'level_type' => $request->level_type,
                'active_only' => $request->get('active_only', true)
            ];

            $query = UniversityFee::with(['school']);

            if ($filters['school_id']) {
                $query->where('school_id', $filters['school_id']);
            }

            if ($filters['level_type']) {
                $query->where('level_type', $filters['level_type']);
            }

            if ($filters['active_only']) {
                $query->where('is_active', true);
            }

            $fees = $query->get();

            $report = [
                'metadata' => [
                    'generated_at' => now()->format('Y-m-d H:i:s'),
                    'filters_applied' => $filters,
                    'total_records' => $fees->count()
                ],
                'summary' => [
                    'total_configurations' => $fees->count(),
                    'schools_covered' => $fees->pluck('school_id')->unique()->count(),
                    'level_types_covered' => $fees->pluck('level_type')->unique()->count(),
                    'specialities_covered' => $fees->pluck('speciality')->unique()->count(),
                    'fee_statistics' => [
                        'min_fee' => $fees->min('total_annual_fee'),
                        'max_fee' => $fees->max('total_annual_fee'),
                        'average_fee' => round($fees->avg('total_annual_fee'), 0),
                        'median_fee' => $fees->sortBy('total_annual_fee')->values()->get(intval($fees->count() / 2))->total_annual_fee ?? 0
                    ]
                ],
                'by_school' => [],
                'by_level_type' => [],
                'detailed_fees' => $fees->map(function($fee) {
                    return [
                        'id' => $fee->id,
                        'school_name' => $fee->school->name,
                        'school_code' => $fee->school->code,
                        'level_type' => $fee->level_type,
                        'speciality' => $fee->speciality,
                        'breakdown' => [
                            'inscription_fee' => $fee->inscription_fee,
                            'first_installment' => $fee->first_installment,
                            'second_installment' => $fee->second_installment,
                            'third_installment' => $fee->third_installment,
                            'total_annual_fee' => $fee->total_annual_fee
                        ],
                        'duration_years' => $fee->duration_years,
                        'included_benefits' => $fee->included_benefits,
                        'is_active' => $fee->is_active,
                        'created_at' => $fee->created_at->format('Y-m-d')
                    ];
                })
            ];

            // Analyses par école
            $feesBySchool = $fees->groupBy('school_id');
            foreach ($feesBySchool as $schoolId => $schoolFees) {
                $school = $schoolFees->first()->school;
                $report['by_school'][] = [
                    'school_name' => $school->name,
                    'school_code' => $school->code,
                    'total_configurations' => $schoolFees->count(),
                    'level_types' => $schoolFees->pluck('level_type')->unique()->values(),
                    'specialities' => $schoolFees->pluck('speciality')->unique()->values(),
                    'fee_range' => [
                        'min' => $schoolFees->min('total_annual_fee'),
                        'max' => $schoolFees->max('total_annual_fee'),
                        'average' => round($schoolFees->avg('total_annual_fee'), 0)
                    ]
                ];
            }

            // Analyses par type de niveau
            $feesByLevelType = $fees->groupBy('level_type');
            foreach ($feesByLevelType as $levelType => $levelFees) {
                $report['by_level_type'][] = [
                    'level_type' => $levelType,
                    'total_configurations' => $levelFees->count(),
                    'schools' => $levelFees->pluck('school.name')->unique()->values(),
                    'specialities' => $levelFees->pluck('speciality')->unique()->values(),
                    'fee_range' => [
                        'min' => $levelFees->min('total_annual_fee'),
                        'max' => $levelFees->max('total_annual_fee'),
                        'average' => round($levelFees->avg('total_annual_fee'), 0)
                    ]
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $report
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}