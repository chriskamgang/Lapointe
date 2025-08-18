<?php

namespace App\Http\Controllers;

use App\Models\School;
use App\Models\Level;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\UniversityScholarship;
use App\Models\LaptopDistribution;
use App\Models\UniversityFee;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class UniversityReportsController extends Controller
{
    /**
     * Résumé des bourses universitaires
     */
    public function getScholarshipsSummary(Request $request)
    {
        try {
            $query = Student::with(['classSeries.schoolClass.level.school'])
                ->where('is_active', true);

            // Filtres
            if ($request->has('school_id')) {
                $query->whereHas('classSeries.schoolClass.level', function($q) use ($request) {
                    $q->where('school_id', $request->school_id);
                });
            }

            if ($request->has('level_type')) {
                $query->whereHas('classSeries.schoolClass.level', function($q) use ($request) {
                    $q->where('level_type', $request->level_type);
                });
            }

            if ($request->has('has_scholarship')) {
                if (filter_var($request->has_scholarship, FILTER_VALIDATE_BOOLEAN)) {
                    $query->where('scholarship_amount', '>', 0);
                } else {
                    $query->where('scholarship_amount', '=', 0);
                }
            }

            $students = $query->get();

            // Statistiques globales
            $totalStudents = $students->count();
            $studentsWithScholarships = $students->where('scholarship_amount', '>', 0)->count();
            $totalScholarshipAmount = $students->sum('scholarship_amount');
            $averageScholarship = $studentsWithScholarships > 0 ? $totalScholarshipAmount / $studentsWithScholarships : 0;

            // Répartition par école
            $bySchool = $students->groupBy(function($student) {
                return $student->classSeries?->schoolClass?->level?->school?->name ?? 'Non défini';
            })->map(function($schoolStudents, $schoolName) {
                $studentsWithScholarships = $schoolStudents->where('scholarship_amount', '>', 0)->count();
                $totalAmount = $schoolStudents->sum('scholarship_amount');
                
                return [
                    'school_name' => $schoolName,
                    'total_students' => $schoolStudents->count(),
                    'students_with_scholarships' => $studentsWithScholarships,
                    'total_scholarship_amount' => $totalAmount,
                    'percentage_with_scholarships' => $schoolStudents->count() > 0 ? 
                        round(($studentsWithScholarships / $schoolStudents->count()) * 100, 1) : 0,
                    'average_scholarship' => $studentsWithScholarships > 0 ? 
                        round($totalAmount / $studentsWithScholarships, 0) : 0
                ];
            })->values();

            // Répartition par type de niveau
            $byLevelType = $students->groupBy(function($student) {
                return $student->classSeries?->schoolClass?->level?->level_type ?? 'Non défini';
            })->map(function($levelStudents, $levelType) {
                $studentsWithScholarships = $levelStudents->where('scholarship_amount', '>', 0)->count();
                $totalAmount = $levelStudents->sum('scholarship_amount');
                
                return [
                    'level_type' => $levelType,
                    'total_students' => $levelStudents->count(),
                    'students_with_scholarships' => $studentsWithScholarships,
                    'total_scholarship_amount' => $totalAmount,
                    'percentage_with_scholarships' => $levelStudents->count() > 0 ? 
                        round(($studentsWithScholarships / $levelStudents->count()) * 100, 1) : 0
                ];
            })->values();

            // Répartition par montant de bourse
            $byAmount = [
                '0 FCFA' => $students->where('scholarship_amount', 0)->count(),
                '25,000 FCFA' => $students->where('scholarship_amount', 25000)->count(),
                '50,000 FCFA' => $students->where('scholarship_amount', 50000)->count(),
                '100,000 FCFA' => $students->where('scholarship_amount', 100000)->count(),
                '120,000 FCFA' => $students->where('scholarship_amount', 120000)->count(),
                '150,000 FCFA' => $students->where('scholarship_amount', 150000)->count(),
                'Autres' => $students->whereNotIn('scholarship_amount', [0, 25000, 50000, 100000, 120000, 150000])->count()
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'global_stats' => [
                        'total_students' => $totalStudents,
                        'students_with_scholarships' => $studentsWithScholarships,
                        'total_scholarship_amount' => $totalScholarshipAmount,
                        'average_scholarship' => round($averageScholarship, 0),
                        'percentage_with_scholarships' => $totalStudents > 0 ? 
                            round(($studentsWithScholarships / $totalStudents) * 100, 1) : 0
                    ],
                    'by_school' => $bySchool,
                    'by_level_type' => $byLevelType,
                    'by_amount' => $byAmount
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport des bourses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rapport de distribution des ordinateurs
     */
    public function getLaptopsDistribution(Request $request)
    {
        try {
            $query = Student::with([
                'classSeries.schoolClass.level.school',
                'laptopDistribution'
            ])->where('is_active', true);

            // Filtres
            if ($request->has('school_id')) {
                $query->whereHas('classSeries.schoolClass.level', function($q) use ($request) {
                    $q->where('school_id', $request->school_id);
                });
            }

            if ($request->has('laptop_status')) {
                switch ($request->laptop_status) {
                    case 'eligible':
                        $query->where('laptop_eligible', true);
                        break;
                    case 'received':
                        $query->where('laptop_received', true);
                        break;
                    case 'not_received':
                        $query->where('laptop_eligible', true)->where('laptop_received', false);
                        break;
                }
            }

            $students = $query->get();

            // Statistiques globales ordinateurs
            $totalStudents = $students->count();
            $eligibleStudents = $students->where('laptop_eligible', true)->count();
            $studentsWithLaptops = $students->where('laptop_received', true)->count();
            $pendingDistributions = $students->where('laptop_eligible', true)
                ->where('laptop_received', false)->count();

            // Répartition par école
            $bySchool = $students->groupBy(function($student) {
                return $student->classSeries?->schoolClass?->level?->school?->name ?? 'Non défini';
            })->map(function($schoolStudents, $schoolName) {
                $eligible = $schoolStudents->where('laptop_eligible', true)->count();
                $received = $schoolStudents->where('laptop_received', true)->count();
                
                return [
                    'school_name' => $schoolName,
                    'total_students' => $schoolStudents->count(),
                    'eligible_students' => $eligible,
                    'students_with_laptops' => $received,
                    'pending_distributions' => $eligible - $received,
                    'distribution_rate' => $eligible > 0 ? round(($received / $eligible) * 100, 1) : 0,
                    'eligibility_rate' => $schoolStudents->count() > 0 ? 
                        round(($eligible / $schoolStudents->count()) * 100, 1) : 0
                ];
            })->values();

            // Statistiques des distributions
            $distributions = LaptopDistribution::with(['student.classSeries.schoolClass.level.school'])
                ->get();

            $distributionStats = [
                'total_distributions' => $distributions->count(),
                'active_distributions' => $distributions->where('status', 'distributed')->count(),
                'returned_laptops' => $distributions->where('status', 'returned')->count(),
                'damaged_laptops' => $distributions->where('status', 'damaged')->count(),
                'lost_laptops' => $distributions->where('status', 'lost')->count()
            ];

            // Distributions par mois (derniers 12 mois)
            $monthlyDistributions = $distributions
                ->where('distribution_date', '>=', Carbon::now()->subMonths(12))
                ->groupBy(function($distribution) {
                    return Carbon::parse($distribution->distribution_date)->format('Y-m');
                })
                ->map(function($monthDistributions, $month) {
                    return [
                        'month' => $month,
                        'count' => $monthDistributions->count()
                    ];
                })->values();

            return response()->json([
                'success' => true,
                'data' => [
                    'global_stats' => [
                        'total_students' => $totalStudents,
                        'eligible_students' => $eligibleStudents,
                        'students_with_laptops' => $studentsWithLaptops,
                        'pending_distributions' => $pendingDistributions,
                        'overall_distribution_rate' => $eligibleStudents > 0 ? 
                            round(($studentsWithLaptops / $eligibleStudents) * 100, 1) : 0,
                        'eligibility_rate' => $totalStudents > 0 ? 
                            round(($eligibleStudents / $totalStudents) * 100, 1) : 0
                    ],
                    'by_school' => $bySchool,
                    'distribution_stats' => $distributionStats,
                    'monthly_distributions' => $monthlyDistributions
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport des ordinateurs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rapport d'inscription par école
     */
    public function getEnrollmentBySchool(Request $request)
    {
        try {
            $schoolYear = $request->get('school_year_id');
            
            $query = Student::with([
                'classSeries.schoolClass.level.school'
            ])->where('is_active', true);

            if ($schoolYear) {
                $query->where('school_year_id', $schoolYear);
            }

            $students = $query->get();

            // Statistiques par école
            $enrollmentBySchool = $students->groupBy(function($student) {
                return [
                    'id' => $student->classSeries?->schoolClass?->level?->school?->id,
                    'name' => $student->classSeries?->schoolClass?->level?->school?->name ?? 'Non défini',
                    'code' => $student->classSeries?->schoolClass?->level?->school?->code
                ];
            })->map(function($schoolStudents, $schoolInfo) {
                // Répartition par niveau
                $byLevel = $schoolStudents->groupBy(function($student) {
                    return $student->classSeries?->schoolClass?->level?->level_type ?? 'Non défini';
                })->map(function($levelStudents, $levelType) {
                    return [
                        'level_type' => $levelType,
                        'count' => $levelStudents->count(),
                        'male_count' => $levelStudents->where('gender', 'M')->count(),
                        'female_count' => $levelStudents->where('gender', 'F')->count()
                    ];
                })->values();

                // Répartition par spécialité
                $bySpeciality = $schoolStudents->groupBy(function($student) {
                    return $student->classSeries?->schoolClass?->name ?? 'Non défini';
                })->map(function($specialityStudents, $specialityName) {
                    return [
                        'speciality_name' => $specialityName,
                        'count' => $specialityStudents->count(),
                        'capacity' => $specialityStudents->first()->classSeries?->schoolClass?->max_capacity ?? 0
                    ];
                })->values();

                return [
                    'school' => $schoolInfo,
                    'total_students' => $schoolStudents->count(),
                    'male_students' => $schoolStudents->where('gender', 'M')->count(),
                    'female_students' => $schoolStudents->where('gender', 'F')->count(),
                    'gender_ratio' => $schoolStudents->count() > 0 ? 
                        round(($schoolStudents->where('gender', 'F')->count() / $schoolStudents->count()) * 100, 1) : 0,
                    'by_level' => $byLevel,
                    'by_speciality' => $bySpeciality
                ];
            })->values();

            // Évolution des inscriptions (si données historiques disponibles)
            $enrollmentTrend = [];
            for ($i = 4; $i >= 0; $i--) {
                $year = Carbon::now()->subYears($i)->year;
                $yearStudents = Student::whereYear('created_at', $year)->count();
                
                $enrollmentTrend[] = [
                    'year' => $year,
                    'count' => $yearStudents
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'enrollment_by_school' => $enrollmentBySchool,
                    'enrollment_trend' => $enrollmentTrend,
                    'global_stats' => [
                        'total_students' => $students->count(),
                        'total_schools' => $students->groupBy(function($student) {
                            return $student->classSeries?->schoolClass?->level?->school?->id;
                        })->count(),
                        'male_students' => $students->where('gender', 'M')->count(),
                        'female_students' => $students->where('gender', 'F')->count()
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport d\'inscription',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rapport de recouvrement des frais
     */
    public function getFeesCollection(Request $request)
    {
        try {
            $startDate = $request->get('start_date', Carbon::now()->subMonths(12)->toDateString());
            $endDate = $request->get('end_date', Carbon::now()->toDateString());

            // Récupérer les paiements dans la période
            $payments = Payment::with([
                'student.classSeries.schoolClass.level.school',
                'paymentTranche'
            ])
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->get();

            // Montants collectés par école
            $collectionBySchool = $payments->groupBy(function($payment) {
                return $payment->student?->classSeries?->schoolClass?->level?->school?->name ?? 'Non défini';
            })->map(function($schoolPayments, $schoolName) {
                $totalAmount = $schoolPayments->sum('amount');
                $studentCount = $schoolPayments->pluck('student_id')->unique()->count();
                
                return [
                    'school_name' => $schoolName,
                    'total_amount' => $totalAmount,
                    'payment_count' => $schoolPayments->count(),
                    'student_count' => $studentCount,
                    'average_per_student' => $studentCount > 0 ? round($totalAmount / $studentCount, 0) : 0
                ];
            })->values();

            // Collection par mois
            $monthlyCollection = $payments->groupBy(function($payment) {
                return Carbon::parse($payment->payment_date)->format('Y-m');
            })->map(function($monthPayments, $month) {
                return [
                    'month' => $month,
                    'amount' => $monthPayments->sum('amount'),
                    'count' => $monthPayments->count()
                ];
            })->values();

            // Collection par tranche de paiement
            $collectionByTranche = $payments->groupBy(function($payment) {
                return $payment->paymentTranche?->name ?? 'Non défini';
            })->map(function($tranchePayments, $trancheName) {
                return [
                    'tranche_name' => $trancheName,
                    'amount' => $tranchePayments->sum('amount'),
                    'count' => $tranchePayments->count(),
                    'percentage' => 0 // Calculé après
                ];
            });

            // Calculer les pourcentages
            $totalCollected = $payments->sum('amount');
            $collectionByTranche = $collectionByTranche->map(function($tranche) use ($totalCollected) {
                $tranche['percentage'] = $totalCollected > 0 ? 
                    round(($tranche['amount'] / $totalCollected) * 100, 1) : 0;
                return $tranche;
            })->values();

            // Statistiques globales
            $globalStats = [
                'total_collected' => $totalCollected,
                'total_payments' => $payments->count(),
                'unique_students' => $payments->pluck('student_id')->unique()->count(),
                'average_payment' => $payments->count() > 0 ? round($totalCollected / $payments->count(), 0) : 0,
                'collection_period' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'days' => Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate))
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'global_stats' => $globalStats,
                    'collection_by_school' => $collectionBySchool,
                    'monthly_collection' => $monthlyCollection,
                    'collection_by_tranche' => $collectionByTranche
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du rapport de recouvrement',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Statistiques par type de niveau
     */
    public function getLevelTypesStats(Request $request)
    {
        try {
            $students = Student::with([
                'classSeries.schoolClass.level.school'
            ])->where('is_active', true)->get();

            $levelTypeStats = $students->groupBy(function($student) {
                return $student->classSeries?->schoolClass?->level?->level_type ?? 'Non défini';
            })->map(function($levelStudents, $levelType) {
                $studentsWithScholarships = $levelStudents->where('scholarship_amount', '>', 0)->count();
                $totalScholarshipAmount = $levelStudents->sum('scholarship_amount');
                $eligibleForLaptop = $levelStudents->where('laptop_eligible', true)->count();
                $withLaptop = $levelStudents->where('laptop_received', true)->count();

                return [
                    'level_type' => $levelType,
                    'total_students' => $levelStudents->count(),
                    'male_students' => $levelStudents->where('gender', 'M')->count(),
                    'female_students' => $levelStudents->where('gender', 'F')->count(),
                    'students_with_scholarships' => $studentsWithScholarships,
                    'total_scholarship_amount' => $totalScholarshipAmount,
                    'average_scholarship' => $studentsWithScholarships > 0 ? 
                        round($totalScholarshipAmount / $studentsWithScholarships, 0) : 0,
                    'eligible_for_laptop' => $eligibleForLaptop,
                    'with_laptop' => $withLaptop,
                    'laptop_distribution_rate' => $eligibleForLaptop > 0 ? 
                        round(($withLaptop / $eligibleForLaptop) * 100, 1) : 0,
                    'scholarship_rate' => $levelStudents->count() > 0 ? 
                        round(($studentsWithScholarships / $levelStudents->count()) * 100, 1) : 0
                ];
            })->values();

            return response()->json([
                'success' => true,
                'data' => $levelTypeStats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération des statistiques par type de niveau',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export PDF du rapport des bourses
     */
    public function exportScholarshipsPdf(Request $request)
    {
        try {
            $data = $this->getScholarshipsSummary($request);
            $reportData = $data->getData()->data;

            $pdf = PDF::loadView('reports.scholarships_pdf', [
                'data' => $reportData,
                'generated_at' => Carbon::now()->format('d/m/Y H:i'),
                'filters' => $request->all()
            ]);

            return $pdf->download('rapport_bourses_' . date('Y-m-d') . '.pdf');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du PDF des bourses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export PDF du rapport des ordinateurs
     */
    public function exportLaptopsPdf(Request $request)
    {
        try {
            $data = $this->getLaptopsDistribution($request);
            $reportData = $data->getData()->data;

            $pdf = PDF::loadView('reports.laptops_pdf', [
                'data' => $reportData,
                'generated_at' => Carbon::now()->format('d/m/Y H:i'),
                'filters' => $request->all()
            ]);

            return $pdf->download('rapport_ordinateurs_' . date('Y-m-d') . '.pdf');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du PDF des ordinateurs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export PDF du rapport d'inscriptions
     */
    public function exportEnrollmentPdf(Request $request)
    {
        try {
            $data = $this->getEnrollmentBySchool($request);
            $reportData = $data->getData()->data;

            $pdf = PDF::loadView('reports.enrollment_pdf', [
                'data' => $reportData,
                'generated_at' => Carbon::now()->format('d/m/Y H:i'),
                'filters' => $request->all()
            ]);

            return $pdf->download('rapport_inscriptions_' . date('Y-m-d') . '.pdf');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du PDF des inscriptions',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}