<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use App\Models\ClassSeries;
use App\Models\Student;
use App\Models\SchoolYear;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class AccountantController extends Controller
{
    /**
     * Obtenir l'année scolaire de travail de l'utilisateur connecté
     */
    private function getUserWorkingYear()
    {
        $user = Auth::user();
        
        // Si l'utilisateur a une année de travail définie, l'utiliser
        if ($user && $user->working_school_year_id) {
            $workingYear = SchoolYear::find($user->working_school_year_id);
            if ($workingYear && $workingYear->is_active) {
                return $workingYear;
            }
        }
        
        // Sinon, utiliser l'année courante par défaut
        $workingYear = SchoolYear::where('is_current', true)->first();
        
        if (!$workingYear) {
            // Si aucune année courante, prendre la première année active
            $workingYear = SchoolYear::where('is_active', true)->first();
        }
        
        return $workingYear;
    }

    /**
     * Liste toutes les classes pour les comptables (lecture seule)
     */
    public function getClasses()
    {
        try {
            // Récupérer l'année scolaire de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();
            
            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $classes = SchoolClass::with([
                'level.section',
                'series' => function ($query) use ($workingYear) {
                    $query->orderBy('name')
                          ->withCount(['students' => function ($q) use ($workingYear) {
                              $q->where('is_active', true);
                              if ($workingYear) {
                                  $q->where('school_year_id', $workingYear->id);
                              }
                          }]);
                }
            ])
            ->where('is_active', true)
            ->orderBy('name')
            ->withCount('series')
            ->get();

            // Calculer le nombre total d'élèves par classe
            foreach ($classes as $class) {
                $class->total_students = $class->series->sum('students_count');
            }

            // Grouper les classes par section et niveau
            $groupedClasses = [];
            foreach ($classes as $class) {
                $sectionName = $class->level->section->name;
                $levelName = $class->level->name;
                
                if (!isset($groupedClasses[$sectionName])) {
                    $groupedClasses[$sectionName] = [];
                }
                
                if (!isset($groupedClasses[$sectionName][$levelName])) {
                    $groupedClasses[$sectionName][$levelName] = [];
                }
                
                $groupedClasses[$sectionName][$levelName][] = $class;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'classes' => $classes,
                    'grouped_classes' => $groupedClasses
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in AccountantController@getClasses: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des classes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les séries d'une classe pour les comptables
     */
    public function getClassSeries($classId)
    {
        try {
            // Récupérer l'année scolaire de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();
            
            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $class = SchoolClass::with([
                'level.section',
                'series' => function ($query) use ($workingYear) {
                    $query->orderBy('name')
                          ->withCount(['students' => function ($q) use ($workingYear) {
                              $q->where('is_active', true);
                              if ($workingYear) {
                                  $q->where('school_year_id', $workingYear->id);
                              }
                          }]);
                }
            ])->find($classId);

            if (!$class) {
                return response()->json([
                    'success' => false,
                    'message' => 'Classe non trouvée'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'class' => $class,
                    'series' => $class->series
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in AccountantController@getClassSeries: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des séries',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les élèves d'une série pour les comptables (avec CRUD complet)
     */
    public function getSeriesStudents($seriesId)
    {
        try {
            // Récupérer l'année scolaire de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();
            
            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            // Récupérer les élèves
            $studentsQuery = Student::with(['schoolYear', 'classSeries'])
                ->where('class_series_id', $seriesId)
                ->where('is_active', true);
                
            if ($workingYear) {
                $studentsQuery->where('school_year_id', $workingYear->id);
            }
            
            $students = $studentsQuery
                ->orderBy('order', 'asc')
                ->orderByRaw('COALESCE(last_name, name) ASC')
                ->orderByRaw('COALESCE(first_name, subname) ASC')
                ->get();

            // Récupérer les informations de la série
            $series = ClassSeries::with(['schoolClass.level.section'])->find($seriesId);
            
            if (!$series) {
                return response()->json([
                    'success' => false,
                    'message' => 'Série de classe non trouvée'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'students' => $students,
                    'series' => $series,
                    'school_year' => $workingYear,
                    'total' => $students->count()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error in AccountantController@getSeriesStudents: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des élèves',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les détails d'un élève pour inscription/modification
     */
    public function getStudent($studentId)
    {
        try {
            $student = Student::with([
                'schoolYear',
                'classSeries.schoolClass.level.section'
            ])->find($studentId);

            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Élève non trouvé'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $student
            ]);
        } catch (\Exception $e) {
            Log::error('Error in AccountantController@getStudent: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'élève',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Dashboard comptable avec statistiques générales
     */
    public function dashboard()
    {
        try {
            // Récupérer l'année scolaire de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();
            
            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }
            
            $stats = [
                'total_classes' => SchoolClass::where('is_active', true)->count(),
                'total_series' => ClassSeries::count(),
                'current_year' => $workingYear ? $workingYear->name : 'Non définie'
            ];

            if ($workingYear) {
                $stats['total_students'] = Student::where('school_year_id', $workingYear->id)
                    ->where('is_active', true)
                    ->count();
                $stats['students_current_year'] = $stats['total_students'];
            } else {
                $stats['total_students'] = Student::where('is_active', true)->count();
                $stats['students_current_year'] = 0;
            }

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            Log::error('Error in AccountantController@dashboard: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du dashboard',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}