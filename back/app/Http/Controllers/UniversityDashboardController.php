<?php

namespace App\Http\Controllers;

use App\Models\School;
use App\Models\Level;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\UniversityScholarship;
use App\Models\LaptopDistribution;
use App\Models\UniversityFee;
use Illuminate\Http\Request;

class UniversityDashboardController extends Controller
{
    /**
     * Tableau de bord universitaire global
     */
    public function index()
    {
        try {
            // Statistiques générales
            $generalStats = [
                'total_schools' => School::count(),
                'active_schools' => School::where('is_active', true)->count(),
                'total_levels' => Level::count(),
                'total_specialities' => SchoolClass::count(),
                'total_students' => Student::where('is_active', true)->count(),
                'total_scholarships' => UniversityScholarship::active()->count(),
                'total_laptops_distributed' => LaptopDistribution::where('status', 'distributed')->count()
            ];

            // Statistiques par école
            $schoolStats = School::withCount([
                'levels',
                'students' => function($query) {
                    $query->where('is_active', true);
                }
            ])->get();

            // Statistiques des bourses
            $scholarshipStats = [
                'total_scholarship_amount' => Student::where('is_active', true)->sum('scholarship_amount'),
                'students_with_scholarships' => Student::where('scholarship_amount', '>', 0)->count(),
                'students_with_laptops' => Student::where('laptop_received', true)->count(),
                'eligible_for_laptops' => Student::where('laptop_eligible', true)->count()
            ];

            // Répartition par type de niveau
            $levelTypeStats = Level::selectRaw('level_type, COUNT(*) as count')
                ->groupBy('level_type')
                ->get();

            // Étudiants récents
            $recentStudents = Student::with(['classSeries.schoolClass.level.school'])
                ->where('is_active', true)
                ->latest()
                ->take(5)
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'general_stats' => $generalStats,
                    'school_stats' => $schoolStats,
                    'scholarship_stats' => $scholarshipStats,
                    'level_type_stats' => $levelTypeStats,
                    'recent_students' => $recentStudents
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
     * Tableau de bord d'une école spécifique
     */
    public function schoolDashboard($schoolId)
    {
        try {
            $school = School::findOrFail($schoolId);

            // Statistiques de l'école
            $schoolStats = [
                'total_levels' => $school->levels()->count(),
                'active_levels' => $school->levels()->where('is_active', true)->count(),
                'total_specialities' => SchoolClass::whereHas('level', function($q) use ($schoolId) {
                    $q->where('school_id', $schoolId);
                })->count(),
                'total_students' => Student::whereHas('classSeries.schoolClass.level', function($q) use ($schoolId) {
                    $q->where('school_id', $schoolId);
                })->where('is_active', true)->count()
            ];

            // Bourses de l'école
            $scholarships = $school->universityScholarships()->active()->get();
            $totalScholarshipAmount = Student::whereHas('classSeries.schoolClass.level', function($q) use ($schoolId) {
                $q->where('school_id', $schoolId);
            })->sum('scholarship_amount');

            // Répartition par niveau
            $levelStats = $school->levels()
                ->withCount(['schoolClasses', 'students' => function($query) {
                    $query->where('is_active', true);
                }])
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'school' => $school,
                    'stats' => $schoolStats,
                    'scholarships' => $scholarships,
                    'total_scholarship_amount' => $totalScholarshipAmount,
                    'level_stats' => $levelStats
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques de l\'école',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}