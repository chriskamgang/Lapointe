<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\SchoolClass;
use App\Models\ClassSeries;
use App\Models\Teacher;
use App\Models\Section;
use App\Models\Level;
use App\Models\SchoolYear;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    /**
     * Obtenir les statistiques globales du système
     */
    public function getGlobalStats(Request $request)
    {
        try {
            $user = auth()->user();
            $isAdmin = $user && $user->role === 'admin';
            
            // Obtenir l'année scolaire active
            $currentYear = SchoolYear::where('is_current', true)->first();
            
            $stats = [
                'students' => $this->getStudentStats($currentYear),
                'classes' => $this->getClassStats($currentYear)
            ];
            
            // Ajouter les stats des enseignants pour les admins uniquement
            if ($isAdmin) {
                $stats['teachers'] = $this->getTeacherStats($currentYear);
            }
            
            return response()->json([
                'success' => true,
                'data' => $stats,
                'meta' => [
                    'is_admin' => $isAdmin,
                    'current_year' => $currentYear ? $currentYear->name : 'Aucune année active',
                    'generated_at' => now()->format('Y-m-d H:i:s')
                ]
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Stats error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du chargement des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Statistiques des étudiants
     */
    private function getStudentStats($currentYear = null)
    {
        // Utiliser des requêtes séparées pour éviter les conflits de colonnes
        $baseQuery = Student::query();
        
        if ($currentYear) {
            $baseQuery->where('school_year_id', $currentYear->id);
        }
        
        // Stats globales
        $totalStudents = $baseQuery->count();
        $activeStudents = Student::where('is_active', true)
            ->when($currentYear, function($q) use ($currentYear) {
                return $q->where('school_year_id', $currentYear->id);
            })
            ->count();
        $inactiveStudents = $totalStudents - $activeStudents;
        
        // Répartition par genre
        $genderStats = Student::where('is_active', true)
            ->when($currentYear, function($q) use ($currentYear) {
                return $q->where('school_year_id', $currentYear->id);
            })
            ->select('gender', DB::raw('count(*) as count'))
            ->groupBy('gender')
            ->get()
            ->pluck('count', 'gender')
            ->toArray();
        
        // Répartition par section - requête simplifiée
        $sectionStats = DB::select("
            SELECT sections.name as section_name, COUNT(*) as count
            FROM students 
            JOIN class_series ON students.class_series_id = class_series.id
            JOIN school_classes ON class_series.class_id = school_classes.id  
            JOIN levels ON school_classes.level_id = levels.id
            JOIN sections ON levels.section_id = sections.id
            WHERE students.is_active = 1
            " . ($currentYear ? "AND students.school_year_id = {$currentYear->id}" : "") . "
            GROUP BY sections.id, sections.name
        ");
        
        // Convertir en array
        $sectionStats = array_map(function($item) {
            return ['section_name' => $item->section_name, 'count' => $item->count];
        }, $sectionStats);
        
        // Évolution mensuelle (12 derniers mois)
        $monthlyEvolution = Student::selectRaw('YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as count')
            ->where('created_at', '>=', now()->subMonths(12))
            ->groupBy(DB::raw('YEAR(created_at)'), DB::raw('MONTH(created_at)'))
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'period' => sprintf('%04d-%02d', $item->year, $item->month),
                    'month_name' => \Carbon\Carbon::createFromDate($item->year, $item->month, 1)->format('M Y'),
                    'count' => $item->count
                ];
            })
            ->toArray();
        
        return [
            'total' => $totalStudents,
            'active' => $activeStudents,
            'inactive' => $inactiveStudents,
            'gender_distribution' => [
                'male' => $genderStats['M'] ?? 0,
                'female' => $genderStats['F'] ?? 0
            ],
            'section_distribution' => $sectionStats,
            'monthly_evolution' => $monthlyEvolution
        ];
    }
    
    /**
     * Statistiques des classes
     */
    private function getClassStats($currentYear = null)
    {
        // Stats globales des classes
        $totalClasses = SchoolClass::where('school_classes.is_active', true)->count();
        $totalSeries = ClassSeries::where('class_series.is_active', true)->count();
        
        // Répartition par section
        $sectionStats = SchoolClass::where('school_classes.is_active', true)
            ->join('levels', 'school_classes.level_id', '=', 'levels.id')
            ->join('sections', 'levels.section_id', '=', 'sections.id')
            ->where('levels.is_active', true)
            ->where('sections.is_active', true)
            ->select('sections.name as section_name', DB::raw('count(*) as count'))
            ->groupBy('sections.id', 'sections.name')
            ->get()
            ->toArray();
        
        // Classes avec le plus d'élèves
        $topClasses = SchoolClass::withCount(['series as students_count' => function ($query) {
                $query->join('students', 'class_series.id', '=', 'students.class_series_id')
                      ->where('students.is_active', true)
                      ->where('class_series.is_active', true);
            }])
            ->where('school_classes.is_active', true)
            ->orderBy('students_count', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($class) {
                return [
                    'name' => $class->name,
                    'students_count' => $class->students_count
                ];
            })
            ->toArray();
        
        // Capacité vs occupation
        $capacityStats = ClassSeries::select(
                'class_series.name as series_name',
                'class_series.capacity',
                DB::raw('COUNT(students.id) as current_students')
            )
            ->leftJoin('students', function($join) {
                $join->on('class_series.id', '=', 'students.class_series_id')
                     ->where('students.is_active', true);
            })
            ->where('class_series.is_active', true)
            ->groupBy('class_series.id', 'class_series.name', 'class_series.capacity')
            ->having('class_series.capacity', '>', 0)
            ->get()
            ->map(function ($series) {
                $occupancy = $series->capacity > 0 ? ($series->current_students / $series->capacity) * 100 : 0;
                return [
                    'series_name' => $series->series_name,
                    'capacity' => $series->capacity,
                    'current_students' => $series->current_students,
                    'occupancy_rate' => round($occupancy, 2)
                ];
            })
            ->toArray();
        
        return [
            'total_classes' => $totalClasses,
            'total_series' => $totalSeries,
            'section_distribution' => $sectionStats,
            'top_classes' => $topClasses,
            'capacity_stats' => $capacityStats
        ];
    }
    
    /**
     * Statistiques des enseignants (admin uniquement)
     */
    private function getTeacherStats($currentYear = null)
    {
        // Stats globales
        $totalTeachers = Teacher::count();
        $activeTeachers = Teacher::where('teachers.is_active', true)->count();
        $inactiveTeachers = $totalTeachers - $activeTeachers;
        
        // Répartition par genre
        $genderStats = Teacher::where('teachers.is_active', true)
            ->select('gender', DB::raw('count(*) as count'))
            ->groupBy('gender')
            ->get()
            ->pluck('count', 'gender')
            ->toArray();
        
        // Répartition par qualification
        $qualificationStats = Teacher::where('teachers.is_active', true)
            ->select('qualification', DB::raw('count(*) as count'))
            ->whereNotNull('qualification')
            ->groupBy('qualification')
            ->get()
            ->map(function ($item) {
                return [
                    'qualification' => $item->qualification ?: 'Non spécifiée',
                    'count' => $item->count
                ];
            })
            ->toArray();
        
        // Enseignants avec le plus de matières
        $teachersWithSubjects = Teacher::withCount('subjects')
            ->where('teachers.is_active', true)
            ->orderBy('subjects_count', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($teacher) {
                return [
                    'name' => $teacher->full_name,
                    'subjects_count' => $teacher->subjects_count
                ];
            })
            ->toArray();
        
        // Évolution des embauches (12 derniers mois)
        $monthlyHires = Teacher::selectRaw('YEAR(hire_date) as year, MONTH(hire_date) as month, COUNT(*) as count')
            ->where('hire_date', '>=', now()->subMonths(12))
            ->whereNotNull('hire_date')
            ->groupBy(DB::raw('YEAR(hire_date)'), DB::raw('MONTH(hire_date)'))
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'period' => sprintf('%04d-%02d', $item->year, $item->month),
                    'month_name' => \Carbon\Carbon::createFromDate($item->year, $item->month, 1)->format('M Y'),
                    'count' => $item->count
                ];
            })
            ->toArray();
        
        return [
            'total' => $totalTeachers,
            'active' => $activeTeachers,
            'inactive' => $inactiveTeachers,
            'gender_distribution' => [
                'male' => $genderStats['M'] ?? 0,
                'female' => $genderStats['F'] ?? 0
            ],
            'qualification_distribution' => $qualificationStats,
            'top_teachers_by_subjects' => $teachersWithSubjects,
            'monthly_hires' => $monthlyHires
        ];
    }
}