<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\SchoolClass;
use App\Models\ClassSeries;
use App\Models\Teacher;
use App\Models\Subject;
use Illuminate\Support\Facades\Validator;

class SearchController extends Controller
{
    /**
     * Recherche globale dans le système
     */
    public function globalSearch(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'query' => 'required|string|min:1|max:255',
            'limit' => 'integer|min:1|max:50'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Paramètres de recherche invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $query = trim($request->input('query'));
            $limit = $request->get('limit', 10);

            // Vérifier le rôle de l'utilisateur pour adapter les résultats
            $user = auth()->user();
            $isAdmin = $user && $user->role === 'admin';
            
            $results = [
                'students' => $this->searchStudents($query, $limit),
                'classes' => $this->searchClasses($query, $limit),
                'series' => $this->searchSeries($query, $limit),
            ];
            
            // Ajouter les enseignants et matières pour les admins
            if ($isAdmin) {
                $results['teachers'] = $this->searchTeachers($query, $limit);
                $results['subjects'] = $this->searchSubjects($query, $limit);
            }

            // Calculer le nombre total de résultats
            $totalResults = collect($results)->sum(function ($category) {
                return count($category);
            });

            return response()->json([
                'success' => true,
                'data' => $results,
                'meta' => [
                    'query' => $query,
                    'total_results' => $totalResults,
                    'is_admin' => $isAdmin,
                    'categories' => [
                        'students' => count($results['students']),
                        'classes' => count($results['classes']),
                        'series' => count($results['series']),
                        'teachers' => $isAdmin ? count($results['teachers']) : 0,
                        'subjects' => $isAdmin ? count($results['subjects']) : 0
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Global search error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la recherche',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rechercher des étudiants
     */
    private function searchStudents($query, $limit)
    {
        return Student::with([
                'classSeries.schoolClass',
                'classSeries.schoolClass.level.section',
                'schoolYear'
            ])
            ->where(function ($q) use ($query) {
                $q->where('first_name', 'LIKE', "%{$query}%")
                  ->orWhere('last_name', 'LIKE', "%{$query}%")
                  ->orWhere('student_number', 'LIKE', "%{$query}%")
                  ->orWhere('parent_name', 'LIKE', "%{$query}%")
                  ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$query}%"])
                  ->orWhereRaw("CONCAT(last_name, ' ', first_name) LIKE ?", ["%{$query}%"]);
            })
            ->where('is_active', true)
            ->limit($limit)
            ->get()
            ->map(function ($student) {
                return [
                    'id' => $student->id,
                    'type' => 'student',
                    'student_number' => $student->student_number,
                    'full_name' => trim("{$student->last_name} {$student->first_name}"),
                    'series_id' => $student->class_series_id,
                    'class_name' => $student->classSeries->schoolClass->name ?? 'Non assigné',
                    'series_name' => $student->classSeries->name ?? 'Non assigné',
                    'section_name' => $student->classSeries->schoolClass->level->section->name ?? 'Non défini',
                    'level_name' => $student->classSeries->schoolClass->level->name ?? 'Non défini',
                    'parent_name' => $student->parent_name,
                    'school_year' => $student->schoolYear->name ?? 'Non défini',
                    'photo_url' => $student->photo_url,
                    'gender' => $student->gender,
                    'date_of_birth' => $student->date_of_birth,
                    'place_of_birth' => $student->place_of_birth
                ];
            });
    }

    /**
     * Rechercher des classes
     */
    private function searchClasses($query, $limit)
    {
        return SchoolClass::with([
                'level.section',
                'series' => function ($q) {
                    $q->withCount('students');
                }
            ])
            ->where(function ($q) use ($query) {
                $q->where('name', 'LIKE', "%{$query}%")
                  ->orWhere('description', 'LIKE', "%{$query}%")
                  ->orWhereHas('level', function ($levelQuery) use ($query) {
                      $levelQuery->where('name', 'LIKE', "%{$query}%");
                  })
                  ->orWhereHas('level.section', function ($sectionQuery) use ($query) {
                      $sectionQuery->where('name', 'LIKE', "%{$query}%");
                  });
            })
            ->where('is_active', true)
            ->limit($limit)
            ->get()
            ->map(function ($class) {
                return [
                    'id' => $class->id,
                    'type' => 'class',
                    'name' => $class->name,
                    'description' => $class->description,
                    'level_name' => $class->level->name ?? 'Non défini',
                    'section_name' => $class->level->section->name ?? 'Non défini',
                    'series_count' => $class->series->count(),
                    'total_students' => $class->series->sum('students_count'),
                    'series' => $class->series->map(function ($series) {
                        return [
                            'id' => $series->id,
                            'name' => $series->name,
                            'students_count' => $series->students_count
                        ];
                    })
                ];
            });
    }

    /**
     * Rechercher des séries
     */
    private function searchSeries($query, $limit)
    {
        return ClassSeries::with([
                'schoolClass.level.section',
                'students'
            ])
            ->where(function ($q) use ($query) {
                $q->where('name', 'LIKE', "%{$query}%")
                  ->orWhere('code', 'LIKE', "%{$query}%")
                  ->orWhereHas('schoolClass', function ($classQuery) use ($query) {
                      $classQuery->where('name', 'LIKE', "%{$query}%");
                  })
                  ->orWhereHas('schoolClass.level', function ($levelQuery) use ($query) {
                      $levelQuery->where('name', 'LIKE', "%{$query}%");
                  })
                  ->orWhereHas('schoolClass.level.section', function ($sectionQuery) use ($query) {
                      $sectionQuery->where('name', 'LIKE', "%{$query}%");
                  });
            })
            ->where('is_active', true)
            ->withCount('students')
            ->limit($limit)
            ->get()
            ->map(function ($series) {
                return [
                    'id' => $series->id,
                    'type' => 'series',
                    'name' => $series->name,
                    'code' => $series->code,
                    'capacity' => $series->capacity,
                    'students_count' => $series->students_count,
                    'class_name' => $series->schoolClass->name ?? 'Non défini',
                    'level_name' => $series->schoolClass->level->name ?? 'Non défini',
                    'section_name' => $series->schoolClass->level->section->name ?? 'Non défini',
                    'main_teacher' => $series->mainTeacher->name ?? null
                ];
            });
    }

    /**
     * Rechercher des enseignants
     */
    private function searchTeachers($query, $limit)
    {
        return Teacher::where(function ($q) use ($query) {
                $q->where('first_name', 'LIKE', "%{$query}%")
                  ->orWhere('last_name', 'LIKE', "%{$query}%")
                  ->orWhere('email', 'LIKE', "%{$query}%")
                  ->orWhere('phone_number', 'LIKE', "%{$query}%")
                  ->orWhere('qualification', 'LIKE', "%{$query}%")
                  ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$query}%"])
                  ->orWhereRaw("CONCAT(last_name, ' ', first_name) LIKE ?", ["%{$query}%"]);
            })
            ->where('is_active', true)
            ->limit($limit)
            ->get()
            ->map(function ($teacher) {
                return [
                    'id' => $teacher->id,
                    'type' => 'teacher',
                    'name' => $teacher->full_name,
                    'email' => $teacher->email,
                    'phone' => $teacher->phone_number,
                    'specialty' => $teacher->qualification,
                    'photo_url' => null, // Pas de photo_url dans le modèle Teacher
                    'is_active' => $teacher->is_active
                ];
            });
    }

    /**
     * Rechercher des matières
     */
    private function searchSubjects($query, $limit)
    {
        return Subject::where(function ($q) use ($query) {
                $q->where('name', 'LIKE', "%{$query}%")
                  ->orWhere('code', 'LIKE', "%{$query}%")
                  ->orWhere('description', 'LIKE', "%{$query}%");
            })
            ->where('is_active', true)
            ->limit($limit)
            ->get()
            ->map(function ($subject) {
                return [
                    'id' => $subject->id,
                    'type' => 'subject',
                    'name' => $subject->name,
                    'code' => $subject->code,
                    'description' => $subject->description,
                    'coefficient' => $subject->coefficient,
                    'is_active' => $subject->is_active
                ];
            });
    }

    /**
     * Recherche rapide (autocomplete)
     */
    public function quickSearch(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'query' => 'required|string|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Paramètres de recherche invalides'
            ], 422);
        }

        try {
            $query = trim($request->input('query'));
            $limit = 5; // Limite plus faible pour l'autocomplete
            
            // Vérifier le rôle de l'utilisateur
            $user = auth()->user();
            $isAdmin = $user && $user->role === 'admin';

            $results = [];

            // Recherche d'étudiants (noms et matricules)
            $students = Student::where(function ($q) use ($query) {
                    $q->where('first_name', 'LIKE', "%{$query}%")
                      ->orWhere('last_name', 'LIKE', "%{$query}%")
                      ->orWhere('student_number', 'LIKE', "%{$query}%")
                      ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$query}%"])
                      ->orWhereRaw("CONCAT(last_name, ' ', first_name) LIKE ?", ["%{$query}%"]);
                })
                ->where('is_active', true)
                ->limit($limit)
                ->get(['id', 'first_name', 'last_name', 'student_number']);

            foreach ($students as $student) {
                $results[] = [
                    'id' => $student->id,
                    'type' => 'student',
                    'label' => "{$student->last_name} {$student->first_name} ({$student->student_number})",
                    'category' => 'Étudiants'
                ];
            }

            // Recherche de classes
            $classes = SchoolClass::with('level.section')
                ->where('name', 'LIKE', "%{$query}%")
                ->where('is_active', true)
                ->limit($limit)
                ->get();

            foreach ($classes as $class) {
                $results[] = [
                    'id' => $class->id,
                    'type' => 'class',
                    'label' => "{$class->name} ({$class->level->section->name} - {$class->level->name})",
                    'category' => 'Classes'
                ];
            }

            // Recherche de séries
            $series = ClassSeries::with('schoolClass')
                ->where('name', 'LIKE', "%{$query}%")
                ->where('is_active', true)
                ->limit($limit)
                ->get();

            foreach ($series as $serie) {
                $results[] = [
                    'id' => $serie->id,
                    'type' => 'series',
                    'label' => "{$serie->name} ({$serie->schoolClass->name})",
                    'category' => 'Séries'
                ];
            }

            // Recherche d'enseignants (admin uniquement)
            if ($isAdmin) {
                $teachers = Teacher::where(function ($q) use ($query) {
                        $q->where('first_name', 'LIKE', "%{$query}%")
                          ->orWhere('last_name', 'LIKE', "%{$query}%")
                          ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$query}%"])
                          ->orWhereRaw("CONCAT(last_name, ' ', first_name) LIKE ?", ["%{$query}%"]);
                    })
                    ->where('is_active', true)
                    ->limit($limit)
                    ->get();

                foreach ($teachers as $teacher) {
                    $results[] = [
                        'id' => $teacher->id,
                        'type' => 'teacher',
                        'label' => "{$teacher->full_name}" . ($teacher->qualification ? " ({$teacher->qualification})" : ""),
                        'category' => 'Enseignants'
                    ];
                }

                // Recherche de matières (admin uniquement)
                $subjects = Subject::where(function ($q) use ($query) {
                        $q->where('name', 'LIKE', "%{$query}%")
                          ->orWhere('code', 'LIKE', "%{$query}%");
                    })
                    ->where('is_active', true)
                    ->limit($limit)
                    ->get();

                foreach ($subjects as $subject) {
                    $results[] = [
                        'id' => $subject->id,
                        'type' => 'subject',
                        'label' => "{$subject->name}" . ($subject->code ? " ({$subject->code})" : ""),
                        'category' => 'Matières'
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => $results
            ]);

        } catch (\Exception $e) {
            \Log::error('Quick search error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la recherche rapide'
            ], 500);
        }
    }
}