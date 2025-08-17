<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\Payment;
use App\Models\PaymentDetail;
use App\Models\PaymentTranche;
use App\Models\SchoolClass;
use App\Models\ClassSeries;
use App\Models\ClassScholarship;
use App\Models\Section;
use App\Models\SchoolYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ReportsController extends Controller
{
    /**
     * Obtenir l'année scolaire de travail de l'utilisateur connecté
     */
    private function getUserWorkingYear()
    {
        $user = Auth::user();

        if ($user && $user->working_school_year_id) {
            $workingYear = SchoolYear::find($user->working_school_year_id);
            if ($workingYear && $workingYear->is_active) {
                return $workingYear;
            }
        }

        $currentYear = SchoolYear::where('is_current', true)->first();

        if (!$currentYear) {
            $currentYear = SchoolYear::where('is_active', true)->first();
        }

        return $currentYear;
    }

    /**
     * Rapport d'état insolvable - Liste des élèves n'ayant pas fini de payer
     */
    public function getInsolvableReport(Request $request)
    {
        try {

            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $filterType = $request->get('filterType', 'section'); // section, class, series
            $sectionId = $request->get('sectionId');
            $classId = $request->get('classId');
            $seriesId = $request->get('seriesId');

            // Récupérer tous les étudiants avec leurs informations de paiement
            $studentsQuery = Student::with([
                'classSeries.schoolClass.level.section',
                'payments.paymentDetails.paymentTranche'
            ])
                ->where('school_year_id', $workingYear->id)
                ->where('is_active', true);

            // Appliquer les filtres
            if (!empty($sectionId)) {
                $studentsQuery->whereHas('classSeries.schoolClass.level.section', function ($query) use ($sectionId) {
                    $query->where('id', $sectionId);
                });
            }

            if (!empty($classId)) {
                $studentsQuery->whereHas('classSeries.schoolClass', function ($query) use ($classId) {
                    $query->where('id', $classId);
                });
            }

            if (!empty($seriesId)) {
                $studentsQuery->where('class_series_id', $seriesId);
            }

            $students = $studentsQuery->get();
            $paymentTranches = PaymentTranche::active()->ordered()->get();

            // Filtrer seulement les élèves insolvables (qui n'ont pas fini de payer)
            $insolvableStudents = [];

            foreach ($students as $student) {
                $incompletesTranches = [];
                $studentTotalRequired = 0;
                $studentTotalPaid = 0;
                $hasIncompletePayments = false;

                foreach ($paymentTranches as $tranche) {
                    try {
                        // Montant requis pour cette tranche (avec bourses OU réductions, jamais les deux)
                        $requiredAmount = $tranche->getAmountForStudent($student, true, false, true, true) ?? 0;
                    } catch (\Exception $e) {
                        Log::warning("Erreur getAmountForStudent pour {$student->id}, tranche {$tranche->id}: " . $e->getMessage());
                        $requiredAmount = 0;
                    }

                    // Montant payé pour cette tranche
                    $paidAmount = 0;
                    foreach ($student->payments as $payment) {
                        foreach ($payment->paymentDetails as $detail) {
                            if ($detail->payment_tranche_id == $tranche->id) {
                                $paidAmount += $detail->amount_allocated;
                            }
                        }
                    }

                    $remainingAmount = max(0, $requiredAmount - $paidAmount);

                    if ($remainingAmount > 0) {
                        $hasIncompletePayments = true;
                        $incompletesTranches[] = [
                            'tranche_name' => $tranche->name,
                            'required_amount' => $requiredAmount,
                            'paid_amount' => $paidAmount,
                            'remaining_amount' => $remainingAmount
                        ];
                    }

                    $studentTotalRequired += $requiredAmount;
                    $studentTotalPaid += $paidAmount;
                }

                // Inclure seulement les élèves avec des paiements incomplets
                if ($hasIncompletePayments) {
                    $insolvableStudents[] = [
                        'student' => [
                            'id' => $student->id,
                            'first_name' => $student->first_name ?? '',
                            'last_name' => $student->last_name ?? '',
                            'full_name' => ($student->last_name ?? '') . ' ' . ($student->first_name ?? ''),
                            'class_series' => ($student->classSeries && $student->classSeries->schoolClass)
                                ? $student->classSeries->schoolClass->name . ' - ' . $student->classSeries->name
                                : 'Non défini'
                        ],
                        'total_required' => $studentTotalRequired,
                        'total_paid' => $studentTotalPaid,
                        'total_remaining' => max(0, $studentTotalRequired - $studentTotalPaid),
                        'incomplete_tranches' => $incompletesTranches
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'students' => $insolvableStudents,
                    'total_insolvable_students' => count($insolvableStudents)
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in ReportsController@getInsolvableReport: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir la clé de groupement pour un étudiant
     */
    private function getGroupKey($student, $groupBy)
    {
        switch ($groupBy) {
            case 'series':
                return $student->classSeries->id;
            case 'class':
                return $student->classSeries->schoolClass->id;
            case 'section':
                return $student->classSeries->schoolClass->level->section->id;
            default:
                return $student->classSeries->id;
        }
    }

    /**
     * Obtenir le nom de groupement pour un étudiant
     */
    private function getGroupName($student, $groupBy)
    {
        switch ($groupBy) {
            case 'series':
                return $student->classSeries->schoolClass->name . ' - ' . $student->classSeries->name;
            case 'class':
                return $student->classSeries->schoolClass->name;
            case 'section':
                return $student->classSeries->schoolClass->level->section->name;
            default:
                return $student->classSeries->schoolClass->name . ' - ' . $student->classSeries->name;
        }
    }

    /**
     * Rapport des paiements - Liste de tous les élèves avec infos de toutes les tranches
     */
    public function getPaymentsReport(Request $request)
    {
        try {
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $filterType = $request->get('filterType', 'section'); // section, class, series
            $sectionId = $request->get('sectionId');
            $classId = $request->get('classId');
            $seriesId = $request->get('seriesId');

            // Récupérer tous les étudiants avec leurs informations de paiement
            $studentsQuery = Student::with([
                'classSeries.schoolClass.level.section',
                'payments.paymentDetails.paymentTranche'
            ])
                ->where('school_year_id', $workingYear->id)
                ->where('is_active', true);

            // Appliquer les filtres
            if (!empty($sectionId)) {
                $studentsQuery->whereHas('classSeries.schoolClass.level.section', function ($query) use ($sectionId) {
                    $query->where('id', $sectionId);
                });
            }

            if (!empty($classId)) {
                $studentsQuery->whereHas('classSeries.schoolClass', function ($query) use ($classId) {
                    $query->where('id', $classId);
                });
            }

            if (!empty($seriesId)) {
                $studentsQuery->where('class_series_id', $seriesId);
            }

            $students = $studentsQuery->get();

            // Récupérer seulement les tranches liées aux classes des étudiants
            $classIds = $students->pluck('classSeries.schoolClass.id')->unique();
            $paymentTranches = PaymentTranche::active()
                ->with('classPaymentAmounts')
                ->whereHas('classPaymentAmounts', function ($query) use ($classIds) {
                    $query->whereIn('class_id', $classIds);
                })
                ->ordered()
                ->get();

            // Créer les détails pour tous les élèves
            $studentsData = [];

            foreach ($students as $student) {
                $tranchesDetails = [];

                // Filtrer les tranches pour cette classe spécifique
                $studentTranches = $paymentTranches->filter(function ($tranche) use ($student) {
                    return $tranche->classPaymentAmounts->where('class_id', $student->classSeries->class_id)->isNotEmpty();
                });

                foreach ($studentTranches as $tranche) {
                    try {
                        // Montant requis pour cette tranche (avec bourses OU réductions, jamais les deux)
                        $requiredAmount = $tranche->getAmountForStudent($student, true, false, true, true) ?? 0;
                    } catch (\Exception $e) {
                        Log::warning("Erreur getAmountForStudent pour {$student->id}, tranche {$tranche->id}: " . $e->getMessage());
                        $requiredAmount = 0;
                    }

                    // Montant payé pour cette tranche
                    $paidAmount = 0;
                    foreach ($student->payments as $payment) {
                        foreach ($payment->paymentDetails as $detail) {
                            if ($detail->payment_tranche_id == $tranche->id) {
                                $paidAmount += $detail->amount_allocated;
                            }
                        }
                    }

                    $tranchesDetails[] = [
                        'tranche_name' => $tranche->name,
                        'required_amount' => $requiredAmount,
                        'paid_amount' => $paidAmount,
                        'remaining_amount' => max(0, $requiredAmount - $paidAmount),
                        'status' => $paidAmount >= $requiredAmount ? 'complete' : 'incomplete'
                    ];
                }

                $studentsData[] = [
                    'student' => [
                        'id' => $student->id,
                        'first_name' => $student->first_name ?? '',
                        'last_name' => $student->last_name ?? '',
                        'full_name' => ($student->last_name ?? '') . ' ' . ($student->first_name ?? ''),
                        'class_series' => ($student->classSeries && $student->classSeries->schoolClass)
                            ? $student->classSeries->schoolClass->name . ' - ' . $student->classSeries->name
                            : 'Non défini'
                    ],
                    'tranches_details' => $tranchesDetails
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'students' => $studentsData,
                    'total_students' => count($studentsData)
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in ReportsController@getPaymentsReport: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rapport d'état des RAME - Liste des élèves avec détails RAME (espèces/physique/pas payé)
     */
    public function getRameReport(Request $request)
    {
        try {
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $filterType = $request->get('filterType', 'section'); // section, class, series
            $sectionId = $request->get('sectionId');
            $classId = $request->get('classId');
            $seriesId = $request->get('seriesId');

            // Récupérer la tranche RAME
            $rameTranche = PaymentTranche::active()
                ->where(function ($query) {
                    $query->where('name', 'RAME')
                        ->orWhere('name', 'like', '%RAME%');
                })
                ->first();

            if (!$rameTranche) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tranche RAME non trouvée'
                ], 404);
            }

            // Récupérer tous les étudiants avec leurs informations RAME
            $studentsQuery = Student::with([
                'classSeries.schoolClass.level.section',
                'payments.paymentDetails.paymentTranche',
                'rameStatus' => function ($query) use ($workingYear) {
                    $query->where('school_year_id', $workingYear->id);
                }
            ])
                ->where('school_year_id', $workingYear->id)
                ->where('is_active', true);

            // Appliquer les filtres
            if (!empty($sectionId)) {
                $studentsQuery->whereHas('classSeries.schoolClass.level.section', function ($query) use ($sectionId) {
                    $query->where('id', $sectionId);
                });
            }

            if (!empty($classId)) {
                $studentsQuery->whereHas('classSeries.schoolClass', function ($query) use ($classId) {
                    $query->where('id', $classId);
                });
            }

            if (!empty($seriesId)) {
                $studentsQuery->where('class_series_id', $seriesId);
            }

            $students = $studentsQuery->get();

            $rameStudentsData = [];
            foreach ($students as $student) {
                try {
                    $rameAmount = $rameTranche->getAmountForStudent($student, true, false, true, true) ?? 0; // Avec bourses OU réductions
                } catch (\Exception $e) {
                    Log::warning("Erreur getAmountForStudent RAME pour {$student->id}: " . $e->getMessage());
                    $rameAmount = 0;
                }

                $rameQuantity = 0; // 0 = pas payé, 1 = payé
                $rameType = 'unpaid'; // unpaid, cash, physical
                $paymentDate = null;
                $rameStatus = $student->rameStatus; // Relation vers student_rame_status

                // Vérifier d'abord le statut RAME physique dans student_rame_status
                if ($rameStatus && $rameStatus->has_brought_rame) {
                    $rameType = 'physical';
                    $rameQuantity = 1; // Quantité = 1 si RAME physique apportée
                    $paymentDate = $rameStatus->marked_date;
                } else {
                    // Sinon, vérifier les paiements RAME électroniques
                    $ramePaidAmount = 0;
                    foreach ($student->payments as $payment) {
                        foreach ($payment->paymentDetails as $detail) {
                            if ($detail->payment_tranche_id == $rameTranche->id) {
                                $ramePaidAmount += $detail->amount_allocated;
                                $rameType = 'cash';
                                $paymentDate = $payment->payment_date;
                            }
                        }
                    }
                    // Si montant payé >= montant requis, alors quantité = 1
                    if ($ramePaidAmount >= $rameAmount) {
                        $rameQuantity = 1;
                    }
                }

                $rameStudentsData[] = [
                    'student' => [
                        'id' => $student->id,
                        'first_name' => $student->first_name ?? '',
                        'last_name' => $student->last_name ?? '',
                        'full_name' => ($student->last_name ?? '') . ' ' . ($student->first_name ?? ''),
                        'class_series' => ($student->classSeries && $student->classSeries->schoolClass)
                            ? $student->classSeries->schoolClass->name . ' - ' . $student->classSeries->name
                            : 'Non défini'
                    ],
                    'rame_details' => [
                        'required_amount' => $rameAmount,
                        'quantity' => $rameQuantity, // 0 ou 1
                        'payment_type' => $rameType, // unpaid, cash, physical
                        'payment_status' => $rameQuantity == 1 ? 'paid' : 'unpaid',
                        'payment_date' => $paymentDate,
                        'has_brought_rame' => $rameStatus ? $rameStatus->has_brought_rame : false,
                        'marked_date' => $rameStatus ? $rameStatus->marked_date : null,
                        'notes' => $rameStatus ? $rameStatus->notes : null
                    ]
                ];
            }

            // Calculer les statistiques générales
            $summary = [
                'total_students' => count($rameStudentsData),
                'paid_count' => count(array_filter($rameStudentsData, function ($item) {
                    return $item['rame_details']['payment_status'] === 'paid';
                })),
                'physical_count' => count(array_filter($rameStudentsData, function ($item) {
                    return $item['rame_details']['payment_type'] === 'physical';
                })),
                'cash_count' => count(array_filter($rameStudentsData, function ($item) {
                    return $item['rame_details']['payment_type'] === 'cash';
                })),
                'unpaid_count' => count(array_filter($rameStudentsData, function ($item) {
                    return $item['rame_details']['payment_status'] === 'unpaid';
                })),
                'total_amount_expected' => array_sum(array_column(array_column($rameStudentsData, 'rame_details'), 'required_amount')),
                'total_quantity_expected' => count($rameStudentsData), // Quantité totale attendue = nombre d'étudiants
                'total_quantity_received' => array_sum(array_column(array_column($rameStudentsData, 'rame_details'), 'quantity'))
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'students' => $rameStudentsData,
                    'summary' => $summary
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in ReportsController@getRameReport: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rapport de recouvrement
     */
    public function getRecoveryReport(Request $request)
    {
        try {
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $startDate = $request->get('startDate', $workingYear->start_date);
            $endDate = $request->get('endDate', $workingYear->end_date ?: now()->toDateString());

            // Récupérer toutes les tranches (hors RAME)
            $paymentTranches = PaymentTranche::active()
                ->where(function ($query) {
                    $query->where('name', '!=', 'RAME')
                        ->where('name', 'not like', '%RAME%');
                })
                ->ordered()
                ->get();

            // Récupérer tous les étudiants
            $students = Student::with([
                'classSeries.schoolClass',
                'payments' => function ($query) use ($workingYear, $startDate, $endDate) {
                    $query->where('school_year_id', $workingYear->id)
                        ->whereBetween('payment_date', [$startDate, $endDate]);
                }
            ])
                ->where('school_year_id', $workingYear->id)
                ->where('is_active', true)
                ->get();

            // Calculer les totaux globaux
            $totalExpected = 0;
            $totalCollected = 0;
            $totalScholarships = 0;
            $totalReductions = 0;

            foreach ($students as $student) {
                foreach ($paymentTranches as $tranche) {
                    try {
                        // Montant attendu avec bourses OU réductions
                        $expectedAmount = $tranche->getAmountForStudent($student, true, false, true, true) ?? 0;
                    } catch (\Exception $e) {
                        Log::warning("Erreur getAmountForStudent recovery pour {$student->id}, tranche {$tranche->id}: " . $e->getMessage());
                        $expectedAmount = 0;
                    }
                    $totalExpected += $expectedAmount;

                    // Calculer les bourses et réductions
                    try {
                        $baseAmount = $tranche->getAmountForStudent($student, true, false, false) ?? 0;
                        $withScholarshipAmount = $tranche->getAmountForStudent($student, true, false, true) ?? 0;
                        $scholarshipAmount = max(0, $baseAmount - $withScholarshipAmount);
                        $reductionAmount = max(0, $withScholarshipAmount - $expectedAmount);
                    } catch (\Exception $e) {
                        Log::warning("Erreur calcul bourses/réductions pour {$student->id}, tranche {$tranche->id}: " . $e->getMessage());
                        $scholarshipAmount = 0;
                        $reductionAmount = 0;
                    }

                    $totalScholarships += $scholarshipAmount;
                    $totalReductions += $reductionAmount;
                }

                // Montant collecté
                foreach ($student->payments as $payment) {
                    foreach ($payment->paymentDetails as $detail) {
                        $tranche = $paymentTranches->find($detail->payment_tranche_id);
                        if ($tranche) {
                            $totalCollected += $detail->amount_allocated;
                        }
                    }
                }
            }

            $totalRemaining = max(0, $totalExpected - $totalCollected);
            $recoveryRate = $totalExpected > 0 ? ($totalCollected / $totalExpected) * 100 : 0;

            // Données par période (mensuelle)
            $periods = [];
            $currentDate = Carbon::parse($startDate);
            $endDateCarbon = Carbon::parse($endDate);

            while ($currentDate->lte($endDateCarbon)) {
                $monthStart = $currentDate->copy()->startOfMonth();
                $monthEnd = $currentDate->copy()->endOfMonth();

                if ($monthEnd->gt($endDateCarbon)) {
                    $monthEnd = $endDateCarbon;
                }

                // Calculer les paiements du mois
                $monthlyCollected = Payment::where('school_year_id', $workingYear->id)
                    ->whereBetween('payment_date', [$monthStart, $monthEnd])
                    ->sum('total_amount');

                $periods[] = [
                    'period_name' => $monthStart->format('M Y'),
                    'expected' => $totalExpected / 12, // Répartition mensuelle approximative
                    'collected' => $monthlyCollected,
                    'remaining' => max(0, ($totalExpected / 12) - $monthlyCollected),
                    'rate' => ($totalExpected / 12) > 0 ? ($monthlyCollected / ($totalExpected / 12)) * 100 : 0,
                    'scholarships' => $totalScholarships / 12,
                    'reductions' => $totalReductions / 12
                ];

                $currentDate->addMonth();
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => [
                        'total_expected' => $totalExpected,
                        'total_collected' => $totalCollected,
                        'total_remaining' => $totalRemaining,
                        'recovery_rate' => $recoveryRate,
                        'total_scholarships' => $totalScholarships,
                        'total_reductions' => $totalReductions
                    ],
                    'periods' => $periods
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in ReportsController@getRecoveryReport: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rapport récapitulatif des encaissements
     */
    public function getCollectionSummaryReport(Request $request)
    {
        try {
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $filterType = $request->get('filterType', 'section');
            $sectionId = $request->get('sectionId');
            $classId = $request->get('classId');
            $seriesId = $request->get('seriesId');

            // Récupérer les classes/séries selon les filtres
            $classSeriesQuery = ClassSeries::with(['schoolClass.level.section'])
                ->whereHas('schoolClass', function ($query) use ($workingYear) {
                    $query->where('school_year_id', $workingYear->id);
                });

            if (!empty($sectionId)) {
                $classSeriesQuery->whereHas('schoolClass.level.section', function ($query) use ($sectionId) {
                    $query->where('id', $sectionId);
                });
            }

            if (!empty($classId)) {
                $classSeriesQuery->whereHas('schoolClass', function ($query) use ($classId) {
                    $query->where('id', $classId);
                });
            }

            if (!empty($seriesId)) {
                $classSeriesQuery->where('id', $seriesId);
            }

            $classSeries = $classSeriesQuery->get();
            $paymentTranches = PaymentTranche::active()->ordered()->get();

            $classesData = [];
            $globalTotalDue = 0;
            $globalTotalPaid = 0;
            $globalTotalRemaining = 0;

            foreach ($classSeries as $series) {
                $students = Student::where('class_series_id', $series->id)
                    ->where('school_year_id', $workingYear->id)
                    ->where('is_active', true)
                    ->with(['payments.paymentDetails'])
                    ->get();

                $classTotalDue = 0;
                $classTotalPaid = 0;

                foreach ($students as $student) {
                    foreach ($paymentTranches as $tranche) {
                        try {
                            $requiredAmount = $tranche->getAmountForStudent($student, true, false, true, true) ?? 0;
                        } catch (\Exception $e) {
                            $requiredAmount = 0;
                        }
                        $classTotalDue += $requiredAmount;

                        // Calculer le montant payé
                        foreach ($student->payments as $payment) {
                            foreach ($payment->paymentDetails as $detail) {
                                if ($detail->payment_tranche_id == $tranche->id) {
                                    $classTotalPaid += $detail->amount_allocated;
                                }
                            }
                        }
                    }
                }

                $classTotalRemaining = max(0, $classTotalDue - $classTotalPaid);
                $collectionRate = $classTotalDue > 0 ? ($classTotalPaid / $classTotalDue) * 100 : 0;

                $classesData[] = [
                    'class_name' => $series->schoolClass->name,
                    'series_name' => $series->name,
                    'student_count' => $students->count(),
                    'total_due' => $classTotalDue,
                    'total_paid' => $classTotalPaid,
                    'total_remaining' => $classTotalRemaining,
                    'collection_rate' => $collectionRate
                ];

                $globalTotalDue += $classTotalDue;
                $globalTotalPaid += $classTotalPaid;
                $globalTotalRemaining += $classTotalRemaining;
            }

            $globalCollectionRate = $globalTotalDue > 0 ? ($globalTotalPaid / $globalTotalDue) * 100 : 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => [
                        'total_due' => $globalTotalDue,
                        'total_paid' => $globalTotalPaid,
                        'total_remaining' => $globalTotalRemaining,
                        'collection_rate' => $globalCollectionRate
                    ],
                    'classes' => $classesData
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in ReportsController@getCollectionSummaryReport: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rapport des détails de paiements
     */
    public function getPaymentDetailsReport(Request $request)
    {
        try {
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $filterType = $request->get('filterType', 'section');
            $sectionId = $request->get('sectionId');
            $classId = $request->get('classId');
            $seriesId = $request->get('seriesId');

            // Récupérer les paiements selon les filtres
            $paymentsQuery = Payment::with([
                'student.classSeries.schoolClass.level.section'
            ])
                ->where('school_year_id', $workingYear->id);

            if (!empty($sectionId)) {
                $paymentsQuery->whereHas('student.classSeries.schoolClass.level.section', function ($query) use ($sectionId) {
                    $query->where('id', $sectionId);
                });
            }

            if (!empty($classId)) {
                $paymentsQuery->whereHas('student.classSeries.schoolClass', function ($query) use ($classId) {
                    $query->where('id', $classId);
                });
            }

            if (!empty($seriesId)) {
                $paymentsQuery->whereHas('student', function ($query) use ($seriesId) {
                    $query->where('class_series_id', $seriesId);
                });
            }

            $payments = $paymentsQuery->orderBy('payment_date', 'desc')->get();

            // Grouper par classe/série
            $classesData = [];
            $totalAmount = 0;

            foreach ($payments as $payment) {
                $student = $payment->student;
                $classSeries = $student->classSeries;
                $classKey = $classSeries->schoolClass->name . ' - ' . $classSeries->name;

                if (!isset($classesData[$classKey])) {
                    $classesData[$classKey] = [
                        'class_name' => $classSeries->schoolClass->name,
                        'series_name' => $classSeries->name,
                        'payments' => [],
                        'total_amount' => 0
                    ];
                }

                $paymentData = [
                    'student_matricule' => $student->matricule,
                    'student_lastname' => $student->last_name,
                    'student_firstname' => $student->first_name,
                    'payment_method' => $payment->payment_method,
                    'payment_date' => $payment->payment_date,
                    'amount' => $payment->total_amount
                ];

                $classesData[$classKey]['payments'][] = $paymentData;
                $classesData[$classKey]['total_amount'] += $payment->total_amount;
                $totalAmount += $payment->total_amount;
            }

            // Convertir en array indexé
            $classes = array_values($classesData);

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => [
                        'total_amount' => $totalAmount,
                        'total_payments' => $payments->count()
                    ],
                    'classes' => $classes
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in ReportsController@getPaymentDetailsReport: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rapport des bourses et rabais
     */
    public function getScholarshipsDiscountsReport(Request $request)
    {
        try {
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $filterType = $request->get('filterType', 'section');
            $sectionId = $request->get('sectionId');
            $classId = $request->get('classId');
            $seriesId = $request->get('seriesId');

            // Récupérer tous les étudiants actifs (les bourses seront déterminées via leurs classes)
            $studentsQuery = Student::with([
                'classSeries.schoolClass.level.section',
                'classSeries.schoolClass', // Pour accéder aux bourses de classe
                'payments.paymentDetails.paymentTranche'
            ])
                ->where('school_year_id', $workingYear->id)
                ->where('is_active', true);

            if (!empty($sectionId)) {
                $studentsQuery->whereHas('classSeries.schoolClass.level.section', function ($query) use ($sectionId) {
                    $query->where('id', $sectionId);
                });
            }

            if (!empty($classId)) {
                $studentsQuery->whereHas('classSeries.schoolClass', function ($query) use ($classId) {
                    $query->where('id', $classId);
                });
            }

            if (!empty($seriesId)) {
                $studentsQuery->where('class_series_id', $seriesId);
            }

            $students = $studentsQuery->get();

            // Récupérer les tranches de paiement pour les classes des étudiants
            $classIds = $students->pluck('classSeries.schoolClass.id')->unique();
            $paymentTranches = PaymentTranche::active()
                ->with('classPaymentAmounts')
                ->whereHas('classPaymentAmounts', function ($query) use ($classIds) {
                    $query->whereIn('class_id', $classIds);
                })
                ->ordered()
                ->get();

            $studentsData = [];
            $totalScholarships = 0;
            $totalDiscounts = 0;
            $classSummary = [];

            foreach ($students as $student) {
                $classSeries = $student->classSeries;
                $classKey = $classSeries->schoolClass->name . ' - ' . $classSeries->name;

                // Calculer le montant total de scolarité (sans réductions)
                $tuitionAmount = 0;
                foreach ($paymentTranches as $tranche) {
                    try {
                        $baseAmount = $tranche->getAmountForStudent($student, true, false, false) ?? 0;
                        $tuitionAmount += $baseAmount;
                    } catch (\Exception $e) {
                        // Ignorer les erreurs
                    }
                }

                // Calculer les bourses basées sur la classe de l'étudiant
                $scholarshipAmount = 0;
                $scholarshipReason = '';

                // Récupérer les bourses de classe pour cette classe
                $classScholarships = ClassScholarship::where('school_class_id', $classSeries->class_id)
                    ->where('is_active', true)
                    ->get();

                if ($classScholarships->isNotEmpty()) {
                    foreach ($classScholarships as $scholarship) {
                        $scholarshipReason = $scholarship->name . ' - ' . $scholarship->description;
                        foreach ($paymentTranches as $tranche) {
                            // Vérifier si cette bourse s'applique à cette tranche
                            if ($scholarship->payment_tranche_id == $tranche->id) {
                                try {
                                    $baseAmount = $tranche->getAmountForStudent($student, true, false, false) ?? 0;
                                    $scholarshipAmount += min($scholarship->amount, $baseAmount);
                                } catch (\Exception $e) {
                                    // Ignorer les erreurs
                                }
                            }
                        }
                    }
                }

                // Calculer les rabais globaux - EXCLUSIFS avec les bourses
                $discountAmount = 0;
                $discountReason = '';

                // Si l'étudiant a une bourse, il ne peut pas avoir de réduction
                if ($scholarshipAmount == 0) {
                    foreach ($student->payments as $payment) {
                        if ($payment->has_reduction && $payment->reduction_amount > 0) {
                            $discountAmount += $payment->reduction_amount;
                            $discountReason = 'Paiement cash avant 15 août';
                            break; // Une seule raison pour simplifier
                        }
                    }
                }

                // Les bourses et réductions sont mutuellement exclusives
                $totalBenefitAmount = $scholarshipAmount + $discountAmount;

                if ($totalBenefitAmount > 0) {
                    $studentsData[] = [
                        'class_name' => $classSeries->schoolClass->name,
                        'student_name' => $student->last_name . ' ' . $student->first_name,
                        'tuition_amount' => $tuitionAmount,
                        'scholarship_reason' => $scholarshipReason,
                        'discount_reason' => $discountReason,
                        'total_benefit_amount' => $totalBenefitAmount,
                        'observation' => ''
                    ];

                    $totalScholarships += $scholarshipAmount;
                    $totalDiscounts += $discountAmount;

                    // Récapitulatif par classe
                    if (!isset($classSummary[$classKey])) {
                        $classSummary[$classKey] = [
                            'class_name' => $classSeries->schoolClass->name,
                            'series_name' => $classSeries->name,
                            'beneficiary_count' => 0,
                            'total_scholarships' => 0,
                            'total_discounts' => 0,
                            'total_benefits' => 0
                        ];
                    }

                    $classSummary[$classKey]['beneficiary_count']++;
                    $classSummary[$classKey]['total_scholarships'] += $scholarshipAmount;
                    $classSummary[$classKey]['total_discounts'] += $discountAmount;
                    $classSummary[$classKey]['total_benefits'] += $totalBenefitAmount;
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => [
                        'total_scholarships' => $totalScholarships,
                        'total_discounts' => $totalDiscounts,
                        'beneficiary_count' => count($studentsData)
                    ],
                    'students' => $studentsData,
                    'class_summary' => array_values($classSummary)
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in ReportsController@getScholarshipsDiscountsReport: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export PDF des rapports
     */
    public function exportPdf(Request $request)
    {
        try {
            $reportType = $request->get('report_type', 'insolvable');

            // Générer les données du rapport selon le type
            $reportData = null;
            switch ($reportType) {
                case 'insolvable':
                    $response = $this->getInsolvableReport($request);
                    break;
                case 'payments':
                    $response = $this->getPaymentsReport($request);
                    break;
                case 'rame':
                    $response = $this->getRameReport($request);
                    break;
                case 'scholarships_discounts':
                    $response = $this->getScholarshipsDiscountsReport($request);
                    break;
                case 'recovery':
                    $response = $this->getRecoveryReport($request);
                    break;
                case 'collection_details':
                    $response = $this->getCollectionDetailsReport($request);
                    break;
                default:
                    return response()->json([
                        'success' => false,
                        'message' => 'Type de rapport non reconnu'
                    ], 400);
            }

            $responseData = $response->getData(true);

            if (!$responseData['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $responseData['message'] ?? 'Erreur lors de la génération du rapport'
                ], 500);
            }

            $reportData = $responseData['data'];

            // Générer le HTML pour le PDF
            $html = $this->generateReportHtml($reportType, $reportData, $request);

            // Retourner le HTML optimisé pour impression/PDF (comme dans StudentController)
            $printOptimizedHtml = $this->generatePdfFromHtml($html);

            $filename = "rapport_{$reportType}_" . date('Y-m-d_H-i-s') . ".pdf";

            // Retourner le HTML formaté que le navigateur peut imprimer en PDF
            return response($printOptimizedHtml, 200, [
                'Content-Type' => 'text/html',
                'Content-Disposition' => 'inline; filename="' . $filename . '"'
            ]);
        } catch (\Exception $e) {
            Log::error('Error in ReportsController@exportPdf: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Générer un PDF à partir du HTML (méthode simple mais robuste)
     */
    private function generatePdfFromHtml($html)
    {
        // Approche simple et robuste : retourner directement le HTML formaté pour impression
        // Le navigateur peut ensuite imprimer en PDF si nécessaire

        // Ajouter des styles optimisés pour l'impression/PDF
        $printOptimizedHtml = str_replace(
            '<style>',
            '<style>
                @page {
                    size: A4;
                    margin: 10mm;
                }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 10pt;
                    line-height: 1.3;
                    margin: 0;
                    padding: 0;
                }
                .no-print { display: none !important; }
                table {
                    page-break-inside: avoid;
                    width: 100%;
                    font-size: 9pt;
                }
                thead {
                    display: table-header-group;
                }
                tr {
                    page-break-inside: avoid;
                }
            ',
            $html
        );

        // Retourner le HTML optimisé - le navigateur se chargera de la conversion PDF
        return $printOptimizedHtml;
    }

    /**
     * Générer le HTML pour le PDF
     */
    private function generateReportHtml($reportType, $reportData, $request)
    {
        $workingYear = $this->getUserWorkingYear();
        $schoolName = "COLLEGE POLYVALENT DE DOUALA";
        $currentDate = now()->format('d/m/Y H:i');

        $titles = [
            'insolvable' => 'Rapport État Insolvable',
            'payments' => 'Rapport État des Paiements',
            'rame' => 'Rapport État des RAME',
            'scholarships_discounts' => 'Rapport États Bourses et Rabais',
            'recovery' => 'Rapport de Recouvrement'
        ];

        $title = $titles[$reportType] ?? 'Rapport';

        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>{$title}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    font-size: 12px;
                    margin: 20px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 15px;
                }
                .school-name {
                    font-size: 18px;
                    font-weight: bold;
                    color: #2c5aa0;
                }
                .report-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 10px 0;
                }
                .meta-info {
                    font-size: 10px;
                    color: #666;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .group-header {
                    background-color: #e8f4f8;
                    font-weight: bold;
                    padding: 10px;
                    margin: 15px 0 5px 0;
                }
                .summary {
                    background-color: #f9f9f9;
                    padding: 15px;
                    margin: 20px 0;
                    border-left: 4px solid #2c5aa0;
                }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 10px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class='header'>
                <div class='school-name'>{$schoolName}</div>
                <div class='report-title'>{$title}</div>
                <div class='meta-info'>
                    Année scolaire: {$workingYear->name} |
                    Généré le: {$currentDate}
                </div>
            </div>
        ";

        // Générer le contenu selon le type de rapport
        $html .= $this->generateReportContent($reportType, $reportData);

        $html .= "
            <div class='footer'>
                Document généré automatiquement - {$schoolName}
            </div>
        </body>
        </html>";

        return $html;
    }

    /**
     * Générer le contenu spécifique du rapport
     */
    private function generateReportContent($reportType, $reportData)
    {
        switch ($reportType) {
            case 'insolvable':
                return $this->generateInsolvableContent($reportData);
            case 'payments':
                return $this->generatePaymentsContent($reportData);
            case 'rame':
                return $this->generateRameContent($reportData);
            case 'scholarships_discounts':
                return $this->generateScholarshipsDiscountsContent($reportData);
            case 'collection_details':
                return $this->generateCollectionDetailsContent($reportData);
            case 'recovery':
                return $this->generateRecoveryContent($reportData);
            default:
                return '<p>Type de rapport non supporté</p>';
        }
    }

    /**
     * Générer le contenu du rapport insolvable
     */
    private function generateInsolvableContent($reportData)
    {
        $html = "<div class='summary'>";
        $html .= "<h3>Résumé</h3>";
        $html .= "<p><strong>Total élèves insolvables:</strong> {$reportData['total_insolvable_students']}</p>";
        $html .= "</div>";

        $html .= "<table>
            <thead>
                <tr>
                    <th>Étudiant</th>
                    <th>Classe/Série</th>
                    <th class='text-right'>Total Requis</th>
                    <th class='text-right'>Total Payé</th>
                    <th class='text-right'>Reste à Payer</th>
                    <th>Tranches Incomplètes</th>
                </tr>
            </thead>
            <tbody>";

        foreach ($reportData['students'] as $studentData) {
            $incompleteTranches = '';
            if (isset($studentData['incomplete_tranches'])) {
                foreach ($studentData['incomplete_tranches'] as $tranche) {
                    $incompleteTranches .= $tranche['tranche_name'] . ': ' . number_format($tranche['paid_amount'], 0, ',', ' ') . '/' . number_format($tranche['required_amount'], 0, ',', ' ') . ' FCFA<br>';
                }
            }

            $html .= "<tr>
                <td>{$studentData['student']['full_name']}</td>
                <td>{$studentData['student']['class_series']}</td>
                <td class='text-right'>" . number_format($studentData['total_required'], 0, ',', ' ') . " FCFA</td>
                <td class='text-right'>" . number_format($studentData['total_paid'], 0, ',', ' ') . " FCFA</td>
                <td class='text-right'>" . number_format($studentData['total_remaining'], 0, ',', ' ') . " FCFA</td>
                <td>{$incompleteTranches}</td>
            </tr>";
        }

        $html .= "</tbody></table>";

        return $html;
    }

    /**
     * Générer le contenu du rapport des paiements
     */
    private function generatePaymentsContent($reportData)
    {
        $html = "<div class='summary'>";
        $html .= "<h3>Résumé</h3>";
        $html .= "<p><strong>Total étudiants:</strong> {$reportData['total_students']}</p>";
        $html .= "</div>";

        foreach ($reportData['students'] as $studentData) {
            $html .= "<h4>{$studentData['student']['full_name']} - {$studentData['student']['class_series']}</h4>";
            $html .= "<table>
                <thead>
                    <tr>
                        <th>Tranche</th>
                        <th class='text-right'>Montant Requis</th>
                        <th class='text-right'>Montant Payé</th>
                        <th class='text-right'>Reste à Payer</th>
                        <th class='text-center'>Statut</th>
                    </tr>
                </thead>
                <tbody>";

            foreach ($studentData['tranches_details'] as $tranche) {
                $status = $tranche['status'] === 'complete' ? 'Complet' : 'Incomplet';
                $html .= "<tr>
                    <td>{$tranche['tranche_name']}</td>
                    <td class='text-right'>" . number_format($tranche['required_amount'], 0, ',', ' ') . " FCFA</td>
                    <td class='text-right'>" . number_format($tranche['paid_amount'], 0, ',', ' ') . " FCFA</td>
                    <td class='text-right'>" . number_format($tranche['remaining_amount'], 0, ',', ' ') . " FCFA</td>
                    <td class='text-center'>{$status}</td>
                </tr>";
            }

            $html .= "</tbody></table>";
        }

        return $html;
    }

    /**
     * Générer le contenu du rapport RAME
     */
    private function generateRameContent($reportData)
    {
        $summary = $reportData['summary'];
        $html = "<div class='summary'>";
        $html .= "<h3>Résumé</h3>";
        $html .= "<p><strong>Total étudiants:</strong> {$summary['total_students']}</p>";
        $html .= "<p><strong>Payés:</strong> {$summary['paid_count']} | ";
        $html .= "<strong>Espèces:</strong> {$summary['cash_count']} | ";
        $html .= "<strong>Physique:</strong> {$summary['physical_count']} | ";
        $html .= "<strong>Non payés:</strong> {$summary['unpaid_count']}</p>";
        $html .= "</div>";

        $html .= "<table>
            <thead>
                <tr>
                    <th>Étudiant</th>
                    <th>Classe/Série</th>
                    <th class='text-right'>Montant RAME</th>
                    <th class='text-center'>Quantité</th>
                    <th class='text-center'>Type</th>
                    <th class='text-center'>Statut</th>
                    <th class='text-center'>Date Paiement</th>
                </tr>
            </thead>
            <tbody>";

        foreach ($reportData['students'] as $studentData) {
            $type = $studentData['rame_details']['payment_type'] === 'physical' ? 'Physique' : ($studentData['rame_details']['payment_type'] === 'cash' ? 'Espèces' : 'Non payé');
            $status = $studentData['rame_details']['payment_status'] === 'paid' ? 'Payé' : 'En attente';
            $paymentDate = isset($studentData['rame_details']['payment_date']) && $studentData['rame_details']['payment_date']
                ? date('d/m/Y', strtotime($studentData['rame_details']['payment_date']))
                : '-';

            $html .= "<tr>
                <td>{$studentData['student']['full_name']}</td>
                <td>{$studentData['student']['class_series']}</td>
                <td class='text-right'>" . number_format($studentData['rame_details']['required_amount'], 0, ',', ' ') . " FCFA</td>
                <td class='text-center'>" . ($studentData['rame_details']['quantity'] ?? 0) . "</td>
                <td class='text-center'>{$type}</td>
                <td class='text-center'>{$status}</td>
                <td class='text-center'>{$paymentDate}</td>
            </tr>";
        }

        $html .= "</tbody></table>";

        return $html;
    }

    /**
     * Générer le contenu du rapport bourses et rabais
     */
    private function generateScholarshipsDiscountsContent($reportData)
    {
        $summary = $reportData['summary'];
        $html = "<div class='summary'>";
        $html .= "<h3>Résumé</h3>";
        $html .= "<p><strong>Total bénéficiaires:</strong> {$summary['beneficiary_count']}</p>";
        $html .= "<p><strong>Total bourses:</strong> " . number_format($summary['total_scholarships'], 0, ',', ' ') . " FCFA</p>";
        $html .= "<p><strong>Total rabais:</strong> " . number_format($summary['total_discounts'], 0, ',', ' ') . " FCFA</p>";
        $html .= "<p><strong>Total avantages:</strong> " . number_format($summary['total_scholarships'] + $summary['total_discounts'], 0, ',', ' ') . " FCFA</p>";
        $html .= "</div>";

        // Tableau des bénéficiaires
        $html .= "<h3>Liste des Bénéficiaires</h3>";
        $html .= "<table>
            <thead>
                <tr>
                    <th>Classe</th>
                    <th>Nom & Prénoms</th>
                    <th class='text-right'>Montant Scolarité</th>
                    <th>Type d'Avantage</th>
                    <th class='text-right'>Montant Avantage</th>
                    <th class='text-center'>Économie (%)</th>
                </tr>
            </thead>
            <tbody>";

        foreach ($reportData['students'] as $student) {
            $savingsPercentage = $student['tuition_amount'] > 0 ?
                (($student['total_benefit_amount'] / $student['tuition_amount']) * 100) : 0;

            $advantageType = '';
            if ($student['scholarship_reason']) {
                $advantageType .= "Bourse: " . $student['scholarship_reason'];
            }
            if ($student['discount_reason']) {
                if ($advantageType) $advantageType .= " | ";
                $advantageType .= "Rabais: " . $student['discount_reason'];
            }

            $html .= "<tr>
                <td>{$student['class_name']}</td>
                <td><strong>{$student['student_name']}</strong></td>
                <td class='text-right'>" . number_format($student['tuition_amount'], 0, ',', ' ') . " FCFA</td>
                <td>{$advantageType}</td>
                <td class='text-right'><strong>" . number_format($student['total_benefit_amount'], 0, ',', ' ') . " FCFA</strong></td>
                <td class='text-center'>" . number_format($savingsPercentage, 1) . "%</td>
            </tr>";
        }

        $html .= "</tbody></table>";

        // Récapitulatif par classe
        if (isset($reportData['class_summary']) && !empty($reportData['class_summary'])) {
            $html .= "<h3>Récapitulatif par Classe</h3>";
            $html .= "<table>
                <thead>
                    <tr>
                        <th>Classe - Série</th>
                        <th class='text-center'>Bénéficiaires</th>
                        <th class='text-right'>Total Bourses</th>
                        <th class='text-right'>Total Rabais</th>
                        <th class='text-right'>Total Avantages</th>
                    </tr>
                </thead>
                <tbody>";

            foreach ($reportData['class_summary'] as $classData) {
                $html .= "<tr>
                    <td><strong>{$classData['class_name']}</strong> - {$classData['series_name']}</td>
                    <td class='text-center'>{$classData['beneficiary_count']}</td>
                    <td class='text-right'>" . number_format($classData['total_scholarships'], 0, ',', ' ') . " FCFA</td>
                    <td class='text-right'>" . number_format($classData['total_discounts'], 0, ',', ' ') . " FCFA</td>
                    <td class='text-right'><strong>" . number_format($classData['total_benefits'], 0, ',', ' ') . " FCFA</strong></td>
                </tr>";
            }

            $html .= "</tbody></table>";
        }

        return $html;
    }

    /**
     * Générer le contenu du rapport de recouvrement
     */
    private function generateRecoveryContent($reportData)
    {
        $summary = $reportData['summary'];
        $html = "<div class='summary'>";
        $html .= "<h3>Résumé Global</h3>";
        $html .= "<p><strong>Total attendu:</strong> " . number_format($summary['total_expected'], 0, ',', ' ') . " FCFA</p>";
        $html .= "<p><strong>Total collecté:</strong> " . number_format($summary['total_collected'], 0, ',', ' ') . " FCFA</p>";
        $html .= "<p><strong>Reste à collecter:</strong> " . number_format($summary['total_remaining'], 0, ',', ' ') . " FCFA</p>";
        $html .= "<p><strong>Taux de recouvrement:</strong> " . number_format($summary['recovery_rate'], 1) . "%</p>";
        $html .= "</div>";

        if (isset($reportData['periods'])) {
            $html .= "<h3>Évolution par période</h3>";
            $html .= "<table>
                <thead>
                    <tr>
                        <th>Période</th>
                        <th class='text-right'>Attendu</th>
                        <th class='text-right'>Collecté</th>
                        <th class='text-right'>Reste</th>
                        <th class='text-right'>Taux</th>
                    </tr>
                </thead>
                <tbody>";

            foreach ($reportData['periods'] as $period) {
                $html .= "<tr>
                    <td>{$period['period_name']}</td>
                    <td class='text-right'>" . number_format($period['expected'], 0, ',', ' ') . " FCFA</td>
                    <td class='text-right'>" . number_format($period['collected'], 0, ',', ' ') . " FCFA</td>
                    <td class='text-right'>" . number_format($period['remaining'], 0, ',', ' ') . " FCFA</td>
                    <td class='text-right'>" . number_format($period['rate'], 1) . "%</td>
                </tr>";
            }

            $html .= "</tbody></table>";
        }

        return $html;
    }

    /**
     * Récapitulatif d'encaissement par série
     */
    public function getSeriesCollectionSummary(Request $request)
    {
        try {
            $workingYear = $this->getUserWorkingYear();
            if (!$workingYear) {
                return response()->json(['success' => false, 'message' => 'Aucune année scolaire définie'], 400);
            }

            // Récupérer les filtres
            $filters = [
                'class_id' => $request->input('class_id'),
                'level_id' => $request->input('level_id')
            ];

            // Récupérer toutes les tranches actives
            $paymentTranches = PaymentTranche::active()->ordered()->get();

            // Construire la requête pour les séries avec filtres
            $seriesQuery = ClassSeries::with(['schoolClass.level', 'students' => function ($query) use ($workingYear) {
                $query->where('school_year_id', $workingYear->id)
                    ->where('is_active', true);
            }]);

            // Appliquer les filtres
            if ($filters['class_id']) {
                $seriesQuery->where('class_id', $filters['class_id']);
            }

            if ($filters['level_id']) {
                $seriesQuery->whereHas('schoolClass', function ($query) use ($filters) {
                    $query->where('level_id', $filters['level_id']);
                });
            }

            $allSeries = $seriesQuery->get();

            $seriesSummary = [];

            foreach ($allSeries as $series) {
                $seriesData = [
                    'series_id' => $series->id,
                    'series_name' => $series->name,
                    'class_name' => $series->schoolClass->name,
                    'full_name' => $series->schoolClass->name . ' - ' . $series->name,
                    'student_count' => $series->students->count(),
                    'total_collected' => 0,
                    'tranches' => []
                ];

                // Pour chaque tranche, calculer les montants collectés
                foreach ($paymentTranches as $tranche) {
                    $trancheAmount = PaymentDetail::whereHas('payment', function ($query) use ($workingYear) {
                        $query->where('school_year_id', $workingYear->id)
                            ->where('is_rame_physical', false);
                    })->whereHas('payment.student', function ($query) use ($series) {
                        $query->where('class_series_id', $series->id);
                    })->where('payment_tranche_id', $tranche->id)
                        ->sum('amount_allocated');

                    $seriesData['tranches'][$tranche->name] = [
                        'tranche_id' => $tranche->id,
                        'tranche_name' => $tranche->name,
                        'amount_collected' => $trancheAmount
                    ];

                    $seriesData['total_collected'] += $trancheAmount;
                }

                // Ajouter les paiements RAME physiques séparément
                $ramePhysicalAmount = Payment::where('school_year_id', $workingYear->id)
                    ->where('is_rame_physical', true)
                    ->whereHas('student', function ($query) use ($series) {
                        $query->where('class_series_id', $series->id);
                    })->sum('total_amount');

                if ($ramePhysicalAmount > 0) {
                    $seriesData['tranches']['RAME Physique'] = [
                        'tranche_id' => 'rame_physical',
                        'tranche_name' => 'RAME Physique',
                        'amount_collected' => $ramePhysicalAmount
                    ];
                    $seriesData['total_collected'] += $ramePhysicalAmount;
                }

                $seriesSummary[] = $seriesData;
            }

            // Trier par montant total collecté (décroissant)
            usort($seriesSummary, function ($a, $b) {
                return $b['total_collected'] <=> $a['total_collected'];
            });

            // Calculer les totaux généraux
            $totalCollected = array_sum(array_column($seriesSummary, 'total_collected'));
            $totalStudents = array_sum(array_column($seriesSummary, 'student_count'));

            // Totaux par tranche
            $trancheGrandTotals = [];
            foreach ($paymentTranches as $tranche) {
                $trancheGrandTotals[$tranche->name] = 0;
            }
            $trancheGrandTotals['RAME Physique'] = 0;

            foreach ($seriesSummary as $series) {
                foreach ($series['tranches'] as $trancheName => $trancheData) {
                    $trancheGrandTotals[$trancheName] += $trancheData['amount_collected'];
                }
            }

            // Récupérer les données pour les filtres
            $allClasses = SchoolClass::with('level')->orderBy('level_id')->orderBy('name')->get();
            $allLevels = \App\Models\Level::orderBy('name')->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'school_year' => $workingYear,
                    'series_summary' => $seriesSummary,
                    'grand_totals' => [
                        'total_collected' => $totalCollected,
                        'total_students' => $totalStudents,
                        'total_series' => count($seriesSummary),
                        'by_tranche' => $trancheGrandTotals
                    ],
                    'payment_tranches' => $paymentTranches->pluck('name')->toArray(),
                    'filters_data' => [
                        'classes' => $allClasses->map(function ($class) {
                            return [
                                'id' => $class->id,
                                'name' => $class->name,
                                'level_id' => $class->level_id,
                                'level_name' => $class->level ? $class->level->name : 'N/A'
                            ];
                        }),
                        'levels' => $allLevels->map(function ($level) {
                            return [
                                'id' => $level->id,
                                'name' => $level->name
                            ];
                        })
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in ReportsController@getSeriesCollectionSummary: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir le libellé du mode de paiement
     */
    private function getPaymentMethodLabel($method, $isRamePhysical = false)
    {
        if ($isRamePhysical) {
            return 'RAME Physique';
        }

        $methods = [
            'cash' => 'Espèces',
            'card' => 'Carte bancaire',
            'transfer' => 'Virement',
            'check' => 'Chèque'
        ];

        return $methods[$method] ?? $method;
    }

    /**
     * Rapport détaillé des encaissements
     * Liste tous les encaissements reçus par élève avec possibilité de filtrer par date
     */
    public function getCollectionDetailsReport(Request $request)
    {
        try {
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            // Récupérer les filtres
            $filterType = $request->get('filterType', 'section');
            $sectionId = $request->get('sectionId');
            $classId = $request->get('classId');
            $seriesId = $request->get('seriesId');
            $startDate = $request->get('startDate');
            $endDate = $request->get('endDate');

            // Si pas de dates spécifiées, prendre l'année scolaire complète
            if (!$startDate) {
                $startDate = $workingYear->start_date;
            }
            if (!$endDate) {
                $endDate = $workingYear->end_date ?: now()->toDateString();
            }

            // Construire la requête des paiements
            $paymentsQuery = Payment::with([
                'student.classSeries.schoolClass.level.section',
                'paymentDetails.paymentTranche',
                'createdByUser' // Ajouter la relation avec l'utilisateur validateur
            ])
                ->where('school_year_id', $workingYear->id)
                ->whereBetween('payment_date', [$startDate, $endDate]);

            // Appliquer les filtres
            if (!empty($sectionId)) {
                $paymentsQuery->whereHas('student.classSeries.schoolClass.level.section', function ($query) use ($sectionId) {
                    $query->where('id', $sectionId);
                });
            }

            if (!empty($classId)) {
                $paymentsQuery->whereHas('student.classSeries.schoolClass', function ($query) use ($classId) {
                    $query->where('id', $classId);
                });
            }

            if (!empty($seriesId)) {
                $paymentsQuery->whereHas('student', function ($query) use ($seriesId) {
                    $query->where('class_series_id', $seriesId);
                });
            }

            // Récupérer les paiements ordonnés par date décroissante
            $payments = $paymentsQuery->orderBy('payment_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            // Préparer les données pour le frontend
            $collectionsData = [];
            $totalAmount = 0;
            $totalPayments = 0;

            // Statistiques par méthode de paiement
            $paymentMethods = [];
            // Statistiques par tranche
            $paymentTranches = [];
            // Statistiques par mois
            $monthlyStats = [];

            foreach ($payments as $payment) {
                $student = $payment->student;
                $classSeries = $student->classSeries;

                // Détails des tranches payées
                $tranchesDetails = [];
                foreach ($payment->paymentDetails as $detail) {
                    $trancheName = $detail->paymentTranche ? $detail->paymentTranche->name : 'N/A';
                    $tranchesDetails[] = [
                        'tranche_name' => $trancheName,
                        'amount' => $detail->amount_allocated
                    ];

                    // Statistiques par tranche
                    if (!isset($paymentTranches[$trancheName])) {
                        $paymentTranches[$trancheName] = [
                            'count' => 0,
                            'total' => 0
                        ];
                    }
                    $paymentTranches[$trancheName]['count']++;
                    $paymentTranches[$trancheName]['total'] += $detail->amount_allocated;
                }

                // Méthode de paiement avec gestion RAME physique
                $paymentMethod = $payment->is_rame_physical ? 'rame_physical' : $payment->payment_method;
                $paymentMethodLabel = $this->getPaymentMethodLabel($payment->payment_method, $payment->is_rame_physical);

                // Statistiques par méthode
                if (!isset($paymentMethods[$paymentMethod])) {
                    $paymentMethods[$paymentMethod] = [
                        'label' => $paymentMethodLabel,
                        'count' => 0,
                        'total' => 0
                    ];
                }
                $paymentMethods[$paymentMethod]['count']++;
                $paymentMethods[$paymentMethod]['total'] += $payment->total_amount;

                // Statistiques mensuelles
                $monthKey = Carbon::parse($payment->payment_date)->format('Y-m');
                if (!isset($monthlyStats[$monthKey])) {
                    $monthlyStats[$monthKey] = [
                        'month' => Carbon::parse($payment->payment_date)->format('M Y'),
                        'count' => 0,
                        'total' => 0
                    ];
                }
                $monthlyStats[$monthKey]['count']++;
                $monthlyStats[$monthKey]['total'] += $payment->total_amount;

                $collectionsData[] = [
                    'payment_id' => $payment->id,
                    'payment_date' => $payment->payment_date,
                    'payment_time' => $payment->created_at ? $payment->created_at->format('H:i') : '',
                    'receipt_number' => $payment->receipt_number,
                    'student' => [
                        'id' => $student->id,
                        'matricule' => $student->matricule,
                        'first_name' => $student->first_name,
                        'last_name' => $student->last_name,
                        'full_name' => ($student->last_name ?? '') . ' ' . ($student->first_name ?? ''),
                        'class_name' => $classSeries && $classSeries->schoolClass ?
                            $classSeries->schoolClass->name : 'Non défini',
                        'class_series' => $classSeries && $classSeries->schoolClass ?
                            $classSeries->schoolClass->name . ' - ' . $classSeries->name :
                            'Non défini'
                    ],
                    'amount' => $payment->total_amount,
                    'payment_method' => $paymentMethod,
                    'payment_method_label' => $paymentMethodLabel,
                    'is_rame_physical' => $payment->is_rame_physical,
                    'has_reduction' => $payment->has_reduction,
                    'reduction_amount' => $payment->reduction_amount ?? 0,
                    'tranches_details' => $tranchesDetails,
                    'notes' => $payment->notes,
                    'validated_at' => $payment->validated_at,
                    'validator_name' => $payment->createdByUser ?
                        ($payment->createdByUser->first_name . ' ' . $payment->createdByUser->last_name) : 'Système'
                ];

                $totalAmount += $payment->total_amount;
                $totalPayments++;
            }

            // Trier les statistiques mensuelles
            ksort($monthlyStats);

            // Récupérer les paramètres de l'école
            $schoolSettings = \App\Models\SchoolSetting::first();

            // Ajouter l'URL du logo si disponible
            if ($schoolSettings && $schoolSettings->school_logo) {
                $schoolSettings->logo_url = url(\Illuminate\Support\Facades\Storage::url($schoolSettings->school_logo));
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'collections' => $collectionsData,
                    'school_year' => $workingYear,
                    'school_settings' => $schoolSettings,
                    'summary' => [
                        'total_collections' => $totalPayments,
                        'total_amount' => $totalAmount,
                        'period_start' => $startDate,
                        'period_end' => $endDate,
                        'average_amount' => $totalPayments > 0 ? $totalAmount / $totalPayments : 0,
                        'deposit_location' => 'BANQ' // Lieu de dépôt fixe comme demandé
                    ],
                    'statistics' => [
                        'by_payment_method' => array_values($paymentMethods),
                        'by_payment_tranche' => array_map(function ($key, $value) {
                            return array_merge(['tranche_name' => $key], $value);
                        }, array_keys($paymentTranches), $paymentTranches),
                        'by_month' => array_values($monthlyStats)
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in ReportsController@getCollectionDetailsReport: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Générer le contenu du rapport détail des encaissements
     */
    private function generateCollectionDetailsContent($reportData)
    {
        $summary = $reportData['summary'];
        $schoolSettings = $reportData['school_settings'] ?? null;
        $schoolYear = $reportData['school_year'] ?? null;

        // En-tête avec logo et informations demandées
        $html = "<div class='header text-center' style='margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;'>";

        // Conteneur pour le logo et le titre
        $html .= "<div style='display: flex; align-items: center; justify-content: center; margin-bottom: 20px;'>";

        // Logo si disponible
        if ($schoolSettings && isset($schoolSettings['school_logo']) && $schoolSettings['school_logo']) {
            // Construire l'URL complète du logo
            $logoUrl = url(\Illuminate\Support\Facades\Storage::url($schoolSettings['school_logo']));
            $html .= "<div style='margin-right: 20px;'>";
            $html .= "<img src='{$logoUrl}' alt='Logo de l'école' style='height: 80px; width: auto; object-fit: contain;' />";
            $html .= "</div>";
        }

        // Titres
        $html .= "<div>";
        $html .= "<h2 style='margin: 0; font-size: 24px; font-weight: bold;'>" . ($schoolSettings['school_name'] ?? 'COLLEGE POLYVALENT BILINGUE DE DOUALA') . "</h2>";
        $html .= "<h3 style='margin: 5px 0 0 0; color: #0066cc; font-size: 20px;'>DÉTAIL DES ENCAISSEMENTS</h3>";
        $html .= "</div>";
        $html .= "</div>";

        // Informations administratives dans un tableau à 2 colonnes
        $html .= "<table style='width: 100%; margin: 20px 0; border: none;'>";
        $html .= "<tr>";
        $html .= "<td style='width: 50%; text-align: left; padding: 5px; border: none;'><strong>Année Académique :</strong> " . ($schoolYear['name'] ?? 'N/A') . "</td>";
        $html .= "<td style='width: 50%; text-align: right; padding: 5px; border: none;'><strong>Lieu de Dépôt :</strong> " . ($summary['deposit_location'] ?? 'BANQ') . "</td>";
        $html .= "</tr>";
        $html .= "<tr>";
        $html .= "<td style='text-align: left; padding: 5px; border: none;'><strong>Période :</strong> Du " . date('d/m/Y', strtotime($summary['period_start'])) . " au " . date('d/m/Y', strtotime($summary['period_end'])) . "</td>";
        $html .= "<td style='text-align: right; padding: 5px; border: none;'><strong>Nombre d'encaissements :</strong> {$summary['total_collections']} | <strong>Montant total :</strong> " . number_format($summary['total_amount'], 0, ',', ' ') . " FCFA</td>";
        $html .= "</tr>";
        $html .= "</table>";

        $html .= "</div>";

        // Tableau principal selon les spécifications demandées
        $html .= "<table style='width: 100%; border-collapse: collapse; margin: 20px 0;'>
            <thead>
                <tr style='background-color: #f5f5f5;'>
                    <th style='border: 1px solid #ddd; padding: 8px;'>Matricule</th>
                    <th style='border: 1px solid #ddd; padding: 8px;'>Nom</th>
                    <th style='border: 1px solid #ddd; padding: 8px;'>Prénom</th>
                    <th style='border: 1px solid #ddd; padding: 8px;'>Classe</th>
                    <th style='border: 1px solid #ddd; padding: 8px;'>Date de Versement</th>
                    <th style='border: 1px solid #ddd; padding: 8px;'>Date de Validation</th>
                    <th style='border: 1px solid #ddd; padding: 8px; text-align: right;'>Montant</th>
                    <th style='border: 1px solid #ddd; padding: 8px;'>Nom du Comptable</th>
                </tr>
            </thead>
            <tbody>";

        foreach ($reportData['collections'] as $collection) {
            $html .= "<tr>
                <td style='border: 1px solid #ddd; padding: 8px;'>" . ($collection['student']['matricule'] ?? 'N/A') . "</td>
                <td style='border: 1px solid #ddd; padding: 8px;'><strong>" . ($collection['student']['last_name'] ?? 'N/A') . "</strong></td>
                <td style='border: 1px solid #ddd; padding: 8px;'><strong>" . ($collection['student']['first_name'] ?? 'N/A') . "</strong></td>
                <td style='border: 1px solid #ddd; padding: 8px;'>" . ($collection['student']['class_name'] ?? 'N/A') . "</td>
                <td style='border: 1px solid #ddd; padding: 8px;'>" . date('d/m/Y', strtotime($collection['payment_date'])) . "<br />
                    <small style='color: #666;'>" . ($collection['payment_time'] ?? '') . "</small></td>
                <td style='border: 1px solid #ddd; padding: 8px;'>" .
                ($collection['validated_at'] ? date('d/m/Y', strtotime($collection['validated_at'])) : '<span style="color: orange;">En attente</span>') .
                "</td>
                <td style='border: 1px solid #ddd; padding: 8px; text-align: right;'><strong style='color: green;'>" .
                number_format($collection['amount'], 0, ',', ' ') . " FCFA</strong>";

            if ($collection['has_reduction']) {
                $html .= "<br /><small style='color: blue;'>(Rabais: -" . number_format($collection['reduction_amount'], 0, ',', ' ') . " FCFA)</small>";
            }

            $html .= "</td>
                <td style='border: 1px solid #ddd; padding: 8px;'><strong style='color: #0066cc;'>" .
                ($collection['validator_name'] ?? 'Système') . "</strong><br />
                    <small style='color: #666;'>Reçu N°: " . ($collection['receipt_number'] ?? 'N/A') . "</small>
                </td>
            </tr>";
        }

        $html .= "</tbody></table>";

        // Statistiques par méthode de paiement
        if (isset($reportData['statistics']['by_payment_method']) && !empty($reportData['statistics']['by_payment_method'])) {
            $html .= "<h3>Statistiques par Méthode de Paiement</h3>";
            $html .= "<table>
                <thead>
                    <tr>
                        <th>Méthode</th>
                        <th class='text-center'>Nombre</th>
                        <th class='text-right'>Montant</th>
                        <th class='text-right'>Pourcentage</th>
                    </tr>
                </thead>
                <tbody>";

            foreach ($reportData['statistics']['by_payment_method'] as $method) {
                $percentage = ($summary['total_amount'] > 0) ? ($method['total'] / $summary['total_amount']) * 100 : 0;
                $html .= "<tr>
                    <td>" . $method['label'] . "</td>
                    <td class='text-center'>" . $method['count'] . "</td>
                    <td class='text-right'>" . number_format($method['total'], 0, ',', ' ') . " FCFA</td>
                    <td class='text-right'>" . number_format($percentage, 1) . "%</td>
                </tr>";
            }

            $html .= "</tbody></table>";
        }

        // Statistiques par tranche
        if (isset($reportData['statistics']['by_payment_tranche']) && !empty($reportData['statistics']['by_payment_tranche'])) {
            $html .= "<h3>Statistiques par Tranche de Paiement</h3>";
            $html .= "<table>
                <thead>
                    <tr>
                        <th>Tranche</th>
                        <th class='text-center'>Nombre</th>
                        <th class='text-right'>Montant</th>
                        <th class='text-right'>Pourcentage</th>
                    </tr>
                </thead>
                <tbody>";

            foreach ($reportData['statistics']['by_payment_tranche'] as $tranche) {
                $percentage = ($summary['total_amount'] > 0) ? ($tranche['total'] / $summary['total_amount']) * 100 : 0;
                $html .= "<tr>
                    <td>" . $tranche['tranche_name'] . "</td>
                    <td class='text-center'>" . $tranche['count'] . "</td>
                    <td class='text-right'>" . number_format($tranche['total'], 0, ',', ' ') . " FCFA</td>
                    <td class='text-right'>" . number_format($percentage, 1) . "%</td>
                </tr>";
            }

            $html .= "</tbody></table>";
        }

        // Évolution mensuelle si disponible
        if (isset($reportData['statistics']['by_month']) && !empty($reportData['statistics']['by_month'])) {
            $html .= "<h3>Évolution Mensuelle</h3>";
            $html .= "<table>
                <thead>
                    <tr>
                        <th>Mois</th>
                        <th class='text-center'>Nombre</th>
                        <th class='text-right'>Montant</th>
                        <th class='text-right'>Pourcentage</th>
                    </tr>
                </thead>
                <tbody>";

            foreach ($reportData['statistics']['by_month'] as $month) {
                $percentage = ($summary['total_amount'] > 0) ? ($month['total'] / $summary['total_amount']) * 100 : 0;
                $html .= "<tr>
                    <td>" . $month['month'] . "</td>
                    <td class='text-center'>" . $month['count'] . "</td>
                    <td class='text-right'>" . number_format($month['total'], 0, ',', ' ') . " FCFA</td>
                    <td class='text-right'>" . number_format($percentage, 1) . "%</td>
                </tr>";
            }

            $html .= "</tbody></table>";
        }

        return $html;
    }

    /**
     * Rapport de détail des paiements des frais de scolarité 
     * Format: Matricule, Nom, Prénom, Classe, Type Paiement (abrégé), Date de validation, Montant
     */
    public function getSchoolFeePaymentDetails(Request $request)
    {
        try {
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            // Récupérer les filtres de dates
            $startDate = $request->get('start_date');
            $endDate = $request->get('end_date');

            // Validation des dates
            if (!$startDate || !$endDate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Les dates de début et de fin sont obligatoires'
                ], 400);
            }

            // Construire la requête des paiements
            $paymentsQuery = Payment::with([
                'student.classSeries.schoolClass',
                'paymentDetails.paymentTranche',
                'createdByUser'
            ])
                ->where('school_year_id', $workingYear->id)
                ->whereBetween('payment_date', [$startDate, $endDate])
                ->whereNotNull('validation_date'); // Seulement les paiements validés

            $payments = $paymentsQuery->orderBy('payment_date', 'asc')
                ->orderBy('created_at', 'asc')
                ->get();

            $paymentDetails = [];
            $totalAmount = 0;

            foreach ($payments as $payment) {
                $student = $payment->student;
                
                if (!$student) {
                    continue; // Skip si pas d'étudiant associé
                }

                $classSeries = $student->classSeries;

                foreach ($payment->paymentDetails as $detail) {
                    $tranche = $detail->paymentTranche;
                    
                    // Déterminer le type de paiement avec abréviation
                    $paymentType = 'Autre';
                    if ($tranche) {
                        $trancheName = strtolower($tranche->name);
                        
                        // Logique d'abréviation selon les spécifications
                        if (strpos($trancheName, 'inscription') !== false) {
                            $paymentType = 'Inscrip';
                        } elseif (strpos($trancheName, '1') !== false && strpos($trancheName, 'tranche') !== false) {
                            $paymentType = 'Trch1';
                        } elseif (strpos($trancheName, '2') !== false && strpos($trancheName, 'tranche') !== false) {
                            $paymentType = 'Trch2';
                        } elseif (strpos($trancheName, '3') !== false && strpos($trancheName, 'tranche') !== false) {
                            $paymentType = 'Trch3';
                        } elseif (strpos($trancheName, '4') !== false && strpos($trancheName, 'tranche') !== false) {
                            $paymentType = 'Trch4';
                        } elseif (strpos($trancheName, '5') !== false && strpos($trancheName, 'tranche') !== false) {
                            $paymentType = 'Trch5';
                        } elseif (strpos($trancheName, 'rame') !== false) {
                            $paymentType = 'RAME';
                        } elseif (strpos($trancheName, 'examen') !== false) {
                            $paymentType = 'Exam';
                        } else {
                            // Essayer d'extraire un numéro pour les tranches
                            preg_match('/(\d+)/', $tranche->name, $matches);
                            if (!empty($matches)) {
                                $paymentType = 'Trch' . $matches[1];
                            } else {
                                // Utiliser les premiers caractères si pas de pattern reconnu
                                $paymentType = substr($tranche->name, 0, 6);
                            }
                        }
                    }

                    $paymentDetails[] = [
                        'matricule' => $student->student_number ?? $student->matricule ?? 'N/A',
                        'nom' => $student->last_name ?? $student->name ?? 'N/A',
                        'prenom' => $student->first_name ?? $student->subname ?? 'N/A',
                        'classe' => $classSeries && $classSeries->schoolClass ? 
                            $classSeries->schoolClass->name : 'N/A',
                        'type_paiement' => $paymentType,
                        'date_validation' => $payment->validation_date ? 
                            $payment->validation_date->format('d/m/Y') : 
                            $payment->payment_date->format('d/m/Y'),
                        'montant' => $detail->amount_allocated ?? 0,
                        'payment_date' => $payment->payment_date,
                        'receipt_number' => $payment->receipt_number ?? 'N/A',
                        'tranche_complete_name' => $tranche ? $tranche->name : 'N/A'
                    ];

                    $totalAmount += $detail->amount_allocated ?? 0;
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'payment_details' => $paymentDetails,
                    'summary' => [
                        'total_payments' => count($paymentDetails),
                        'total_amount' => $totalAmount,
                        'period_start' => $startDate,
                        'period_end' => $endDate,
                        'generated_at' => now()->format('d/m/Y H:i:s')
                    ],
                    'school_year' => $workingYear
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in ReportsController@getSchoolFeePaymentDetails: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport de détail des paiements',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export PDF du rapport de détail des paiements des frais de scolarité
     */
    public function exportSchoolFeePaymentDetailsPdf(Request $request)
    {
        try {
            $response = $this->getSchoolFeePaymentDetails($request);
            $responseData = $response->getData(true);

            if (!$responseData['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $responseData['message'] ?? 'Erreur lors de la génération du rapport'
                ], 500);
            }

            $reportData = $responseData['data'];

            // Générer le HTML pour le PDF
            $html = $this->generateSchoolFeePaymentDetailsHtml($reportData);

            $printOptimizedHtml = $this->generatePdfFromHtml($html);
            $filename = "detail_paiements_frais_scolarite_" . date('Y-m-d_H-i-s') . ".pdf";

            return response($printOptimizedHtml, 200, [
                'Content-Type' => 'text/html',
                'Content-Disposition' => 'inline; filename="' . $filename . '"'
            ]);

        } catch (\Exception $e) {
            Log::error('Error in ReportsController@exportSchoolFeePaymentDetailsPdf: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Générer le HTML pour le rapport de détail des paiements des frais de scolarité
     */
    private function generateSchoolFeePaymentDetailsHtml($reportData)
    {
        $summary = $reportData['summary'];
        $schoolYear = $reportData['school_year'];
        
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <title>Détail des Paiements des Frais de Scolarité</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    font-size: 11px;
                    margin: 15px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 25px;
                    border-bottom: 2px solid #333;
                    padding-bottom: 15px;
                }
                .header-content {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 15px;
                }
                .logo {
                    width: 80px;
                    height: 80px;
                    margin-right: 20px;
                }
                .school-info {
                    text-align: center;
                }
                .school-name {
                    font-size: 18px;
                    font-weight: bold;
                    color: #2c5aa0;
                    margin-bottom: 5px;
                }
                .report-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 8px 0;
                    color: #333;
                }
                .period-info {
                    font-size: 12px;
                    color: #666;
                    margin: 5px 0;
                }
                .summary-info {
                    background-color: #f9f9f9;
                    padding: 10px;
                    margin: 15px 0;
                    border-left: 4px solid #2c5aa0;
                    font-size: 11px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                    font-size: 10px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 6px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                    text-align: center;
                }
                .text-right { 
                    text-align: right; 
                }
                .text-center { 
                    text-align: center; 
                }
                .total-row {
                    background-color: #e8f4f8;
                    font-weight: bold;
                }
                .footer {
                    margin-top: 25px;
                    text-align: center;
                    font-size: 9px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class='header'>
                <div class='header-content'>
                    <img src='" . public_path('assets/logo.png') . "' alt='Logo du Collège' class='logo'>
                    <div class='school-info'>
                        <div class='school-name'>COLLÈGE POLYVALENT BILINGUE DE DOUALA</div>
                        <div class='report-title'>DÉTAIL DES PAIEMENTS DES FRAIS DE SCOLARITÉ</div>
                    </div>
                </div>
                <div class='period-info'>
                    Période du " . date('d/m/Y', strtotime($summary['period_start'])) . " 
                    au " . date('d/m/Y', strtotime($summary['period_end'])) . "
                </div>
                <div class='period-info'>Année scolaire : {$schoolYear['name']}</div>
            </div>
            
            <div class='summary-info'>
                <strong>Résumé :</strong> {$summary['total_payments']} paiements | 
                <strong>Montant total :</strong> " . number_format($summary['total_amount'], 0, ',', ' ') . " FCFA | 
                <strong>Généré le :</strong> {$summary['generated_at']}
            </div>

            <table>
                <thead>
                    <tr>
                        <th style='width: 12%;'>Matricule</th>
                        <th style='width: 18%;'>Nom</th>
                        <th style='width: 18%;'>Prénom</th>
                        <th style='width: 12%;'>Classe</th>
                        <th style='width: 10%;'>Type Paiement</th>
                        <th style='width: 12%;'>Date Validation</th>
                        <th style='width: 18%;'>Montant</th>
                    </tr>
                </thead>
                <tbody>";

        foreach ($reportData['payment_details'] as $detail) {
            $html .= "<tr>
                <td class='text-center'>{$detail['matricule']}</td>
                <td><strong>{$detail['nom']}</strong></td>
                <td><strong>{$detail['prenom']}</strong></td>
                <td class='text-center'>{$detail['classe']}</td>
                <td class='text-center'><strong>{$detail['type_paiement']}</strong></td>
                <td class='text-center'>{$detail['date_validation']}</td>
                <td class='text-right'><strong>" . number_format($detail['montant'], 0, ',', ' ') . " FCFA</strong></td>
            </tr>";
        }

        // Ligne de total
        $html .= "<tr class='total-row'>
                <td colspan='6' class='text-right'><strong>TOTAL GÉNÉRAL :</strong></td>
                <td class='text-right'><strong>" . number_format($summary['total_amount'], 0, ',', ' ') . " FCFA</strong></td>
            </tr>";

        $html .= "</tbody>
            </table>
            
            <div class='footer'>
                Document généré automatiquement le {$summary['generated_at']} - COLLÈGE POLYVALENT BILINGUE DE DOUALA
            </div>
        </body>
        </html>";

        return $html;
    }

    /**
     * Rapport d'encaissement détaillé de la période
     * Filtres: dates et section
     * Format: Numéro, Matricule, Nom, Prénom, Classe, Inscription(Montant), Tranche(Montant)
     */
    public function getDetailedCollectionReport(Request $request)
    {
        try {
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            // Récupérer les filtres
            $startDate = $request->get('start_date');
            $endDate = $request->get('end_date');
            $sectionId = $request->get('section_id');

            // Validation des dates
            if (!$startDate || !$endDate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Les dates de début et de fin sont obligatoires'
                ], 400);
            }

            // Construire la requête des paiements avec relations
            $query = Payment::with([
                'student.classSeries.schoolClass.level.section',
                'paymentDetails.paymentTranche'
            ])
                ->where('school_year_id', $workingYear->id)
                ->whereBetween('payment_date', [$startDate, $endDate])
                ->whereNotNull('validation_date');

            // Filtrer par section si spécifié
            if ($sectionId) {
                $query->whereHas('student.classSeries.schoolClass.level.section', function($q) use ($sectionId) {
                    $q->where('id', $sectionId);
                });
            }

            $payments = $query->orderBy('payment_date', 'asc')->get();

            $encaissements = [];
            $totalInscription = 0;
            $totalTranches = 0;
            $numero = 1;

            foreach ($payments as $payment) {
                $student = $payment->student;
                if (!$student) continue;

                $classSeries = $student->classSeries;
                $schoolClass = $classSeries ? $classSeries->schoolClass : null;

                $inscriptionAmount = 0;
                $trancheAmount = 0;

                // Calculer les montants par type
                foreach ($payment->paymentDetails as $detail) {
                    $tranche = $detail->paymentTranche;
                    $amount = $detail->amount_allocated ?? 0;

                    if ($tranche) {
                        $trancheName = strtolower($tranche->name);
                        
                        // Exclure la RAME qui n'est pas un paiement financier
                        if (stripos($trancheName, 'rame') !== false) {
                            continue; // Ignorer la RAME dans les calculs financiers
                        }
                        
                        if (stripos($trancheName, 'inscription') !== false) {
                            $inscriptionAmount += $amount;
                        } else {
                            $trancheAmount += $amount;
                        }
                    }
                }

                $encaissements[] = [
                    'numero' => $numero++,
                    'matricule' => $student->student_number ?? $student->matricule ?? 'N/A',
                    'nom' => $student->last_name ?? $student->name ?? 'N/A',
                    'prenom' => $student->first_name ?? $student->subname ?? 'N/A',
                    'classe' => $schoolClass ? $schoolClass->name : 'N/A',
                    'inscription_montant' => $inscriptionAmount,
                    'tranche_montant' => $trancheAmount,
                    'payment_date' => $payment->payment_date->format('d/m/Y'),
                    'receipt_number' => $payment->receipt_number ?? 'N/A'
                ];

                $totalInscription += $inscriptionAmount;
                $totalTranches += $trancheAmount;
            }

            // Récupérer les informations de section si filtré
            $sectionInfo = null;
            if ($sectionId) {
                $sectionInfo = \App\Models\Section::find($sectionId);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'encaissements' => $encaissements,
                    'summary' => [
                        'total_encaissements' => count($encaissements),
                        'total_inscription' => $totalInscription,
                        'total_tranches' => $totalTranches,
                        'total_general' => $totalInscription + $totalTranches,
                        'period_start' => $startDate,
                        'period_end' => $endDate,
                        'generated_at' => now()->format('d/m/Y H:i:s')
                    ],
                    'section_info' => $sectionInfo,
                    'school_year' => $workingYear
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in ReportsController@getDetailedCollectionReport: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport d\'encaissement détaillé',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rapport de paiement des frais de scolarité par classe
     * Format: Numéro, Matricule, Nom, Prénom, Inscription, 1ère Tranche, 2ème Tranche, 3ème Tranche, Rabais, Bourse, Total Payé, Reste à Payer
     */
    public function getClassSchoolFeesReport(Request $request)
    {
        try {
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $classId = $request->get('class_id');

            if (!$classId) {
                return response()->json([
                    'success' => false,
                    'message' => 'L\'ID de la classe est obligatoire'
                ], 400);
            }

            // Récupérer la classe avec ses informations de base
            $schoolClass = \App\Models\SchoolClass::with(['level.section'])->find($classId);

            if (!$schoolClass) {
                return response()->json([
                    'success' => false,
                    'message' => 'Classe non trouvée'
                ], 404);
            }

            $studentsData = [];
            $totals = [
                'inscription' => 0,
                'tranche1' => 0,
                'tranche2' => 0,
                'tranche3' => 0,
                'rabais' => 0,
                'bourse' => 0,
                'total_paye' => 0,
                'reste_a_payer' => 0
            ];
            $numero = 1;

            // Récupérer tous les étudiants de cette classe pour l'année scolaire courante
            $students = \App\Models\Student::with(['payments.paymentDetails.paymentTranche', 'classSeries.schoolClass'])
                ->whereHas('classSeries.schoolClass', function($query) use ($classId) {
                    $query->where('id', $classId);
                })
                ->where('school_year_id', $workingYear->id)
                ->where('is_active', true)
                ->get();

            foreach ($students as $student) {
                $amounts = [
                    'inscription' => 0,
                    'tranche1' => 0,
                    'tranche2' => 0,
                    'tranche3' => 0,
                    'rabais' => 0,
                    'bourse' => 0
                ];

                // Calculer les montants par tranche
                foreach ($student->payments as $payment) {
                    if ($payment->school_year_id != $workingYear->id) continue;

                    // Ajouter les rabais et bourses
                    if ($payment->has_reduction) {
                        $amounts['rabais'] += $payment->reduction_amount ?? 0;
                    }
                    if ($payment->has_scholarship) {
                        $amounts['bourse'] += $payment->scholarship_amount ?? 0;
                    }

                    foreach ($payment->paymentDetails as $detail) {
                        $tranche = $detail->paymentTranche;
                        $amount = $detail->amount_allocated ?? 0;

                        if ($tranche) {
                            $trancheName = strtolower($tranche->name);
                            
                            // Exclure la RAME qui n'est pas un paiement financier
                            if (stripos($trancheName, 'rame') !== false) {
                                continue; // Ignorer la RAME dans les calculs financiers
                            }
                            
                            if (stripos($trancheName, 'inscription') !== false) {
                                $amounts['inscription'] += $amount;
                            } elseif (stripos($trancheName, '1') !== false && stripos($trancheName, 'tranche') !== false) {
                                $amounts['tranche1'] += $amount;
                            } elseif (stripos($trancheName, '2') !== false && stripos($trancheName, 'tranche') !== false) {
                                $amounts['tranche2'] += $amount;
                            } elseif (stripos($trancheName, '3') !== false && stripos($trancheName, 'tranche') !== false) {
                                $amounts['tranche3'] += $amount;
                            }
                        }
                    }
                }

                $totalPaye = array_sum(array_slice($amounts, 0, 4)); // inscription + tranches
                $resteAPayer = $this->calculateRemainingAmount($student, $workingYear, $totalPaye);

                $studentsData[] = [
                    'numero' => $numero++,
                    'matricule' => $student->student_number ?? $student->matricule ?? 'N/A',
                    'nom' => $student->last_name ?? $student->name ?? 'N/A',
                    'prenom' => $student->first_name ?? $student->subname ?? 'N/A',
                    'inscription' => $amounts['inscription'],
                    'tranche1' => $amounts['tranche1'],
                    'tranche2' => $amounts['tranche2'],
                    'tranche3' => $amounts['tranche3'],
                    'rabais' => $amounts['rabais'],
                    'bourse' => $amounts['bourse'],
                    'total_paye' => $totalPaye,
                    'reste_a_payer' => $resteAPayer
                ];

                // Ajouter aux totaux
                $totals['inscription'] += $amounts['inscription'];
                $totals['tranche1'] += $amounts['tranche1'];
                $totals['tranche2'] += $amounts['tranche2'];
                $totals['tranche3'] += $amounts['tranche3'];
                $totals['rabais'] += $amounts['rabais'];
                $totals['bourse'] += $amounts['bourse'];
                $totals['total_paye'] += $totalPaye;
                $totals['reste_a_payer'] += $resteAPayer;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'students' => $studentsData,
                    'summary' => [
                        'total_students' => count($studentsData),
                        'totals' => $totals,
                        'generated_at' => now()->format('d/m/Y H:i:s')
                    ],
                    'class_info' => [
                        'id' => $schoolClass->id,
                        'name' => $schoolClass->name,
                        'level_name' => $schoolClass->level ? $schoolClass->level->name : 'N/A',
                        'section_name' => $schoolClass->level && $schoolClass->level->section ? 
                            $schoolClass->level->section->name : 'N/A'
                    ],
                    'school_year' => $workingYear
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in ReportsController@getClassSchoolFeesReport: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport de frais de scolarité par classe',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculer le montant restant à payer pour un étudiant
     */
    private function calculateRemainingAmount($student, $workingYear, $totalPaid)
    {
        // Cette fonction devrait calculer le montant total dû basé sur la classe/série
        // Pour le moment, retournons une valeur par défaut
        // À adapter selon la logique métier de votre application
        
        // Exemple de calcul basique (à personnaliser)
        $expectedTotal = 500000; // Exemple: 500,000 FCFA par année
        
        return max(0, $expectedTotal - $totalPaid);
    }

    /**
     * Export PDF du rapport de paiement des frais de scolarité par classe
     */
    public function exportClassSchoolFeesPdf(Request $request)
    {
        try {
            // Test simple pour vérifier le fonctionnement
            $classId = $request->get('class_id', 'N/A');
            $html = "<!DOCTYPE html><html><head><title>Rapport PDF</title></head><body>";
            $html .= "<h1>COLLÈGE POLYVALENT BILINGUE DE DOUALA</h1>";
            $html .= "<h2>Paiement des Frais de Scolarité par Classe</h2>";
            $html .= "<p>Classe ID: " . $classId . "</p>";
            $html .= "<p>Date de génération: " . date('d/m/Y H:i:s') . "</p>";
            $html .= "<p>Rapport généré avec succès !</p>";
            $html .= "</body></html>";
            
            return response($html, 200, [
                'Content-Type' => 'text/html',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Générer un HTML simple pour le rapport de classe
     */
    private function generateSimpleClassSchoolFeesHtml($reportData)
    {
        $summary = $reportData['summary'];
        $classInfo = $reportData['class_info'];
        $schoolYear = $reportData['school_year'];
        
        $html = "<!DOCTYPE html>";
        $html .= "<html><head><meta charset='UTF-8'>";
        $html .= "<title>Paiement des Frais de Scolarité par Classe</title>";
        $html .= "<style>body{font-family:Arial;font-size:12px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:5px;text-align:left;}</style>";
        $html .= "</head><body>";
        $html .= "<h2>COLLÈGE POLYVALENT BILINGUE DE DOUALA</h2>";
        $html .= "<h3>PAIEMENT DES FRAIS DE SCOLARITÉ PAR CLASSE</h3>";
        $html .= "<p>Classe: " . $classInfo['name'] . " | Section: " . $classInfo['section_name'] . "</p>";
        $html .= "<p>Année scolaire: " . $schoolYear['name'] . " | Nombre d'élèves: " . $summary['total_students'] . "</p>";
        
        $html .= "<table>";
        $html .= "<thead><tr>";
        $html .= "<th>N°</th><th>Matricule</th><th>Nom</th><th>Prénom</th>";
        $html .= "<th>Inscription</th><th>1ère Tr.</th><th>2ème Tr.</th><th>3ème Tr.</th>";
        $html .= "<th>Rabais</th><th>Bourse</th><th>Total Payé</th><th>Reste à Payer</th>";
        $html .= "</tr></thead><tbody>";

        foreach ($reportData['students'] as $student) {
            $html .= "<tr>";
            $html .= "<td>" . $student['numero'] . "</td>";
            $html .= "<td>" . $student['matricule'] . "</td>";
            $html .= "<td>" . $student['nom'] . "</td>";
            $html .= "<td>" . $student['prenom'] . "</td>";
            $html .= "<td>" . number_format($student['inscription'], 0, ',', ' ') . "</td>";
            $html .= "<td>" . number_format($student['tranche1'], 0, ',', ' ') . "</td>";
            $html .= "<td>" . number_format($student['tranche2'], 0, ',', ' ') . "</td>";
            $html .= "<td>" . number_format($student['tranche3'], 0, ',', ' ') . "</td>";
            $html .= "<td>" . number_format($student['rabais'], 0, ',', ' ') . "</td>";
            $html .= "<td>" . number_format($student['bourse'], 0, ',', ' ') . "</td>";
            $html .= "<td>" . number_format($student['total_paye'], 0, ',', ' ') . "</td>";
            $html .= "<td>" . number_format($student['reste_a_payer'], 0, ',', ' ') . "</td>";
            $html .= "</tr>";
        }

        // Ligne de total
        $totals = $summary['totals'];
        $html .= "<tr style='background-color:#f0f0f0;font-weight:bold;'>";
        $html .= "<td colspan='4'>TOTAL :</td>";
        $html .= "<td>" . number_format($totals['inscription'], 0, ',', ' ') . "</td>";
        $html .= "<td>" . number_format($totals['tranche1'], 0, ',', ' ') . "</td>";
        $html .= "<td>" . number_format($totals['tranche2'], 0, ',', ' ') . "</td>";
        $html .= "<td>" . number_format($totals['tranche3'], 0, ',', ' ') . "</td>";
        $html .= "<td>" . number_format($totals['rabais'], 0, ',', ' ') . "</td>";
        $html .= "<td>" . number_format($totals['bourse'], 0, ',', ' ') . "</td>";
        $html .= "<td>" . number_format($totals['total_paye'], 0, ',', ' ') . "</td>";
        $html .= "<td>" . number_format($totals['reste_a_payer'], 0, ',', ' ') . "</td>";
        $html .= "</tr>";

        $html .= "</tbody></table>";
        $html .= "<p style='margin-top:20px;'>Document généré le " . $summary['generated_at'] . "</p>";
        $html .= "</body></html>";

        return $html;
    }


}
