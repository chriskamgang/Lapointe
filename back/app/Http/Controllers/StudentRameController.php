<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\SchoolYear;
use App\Models\StudentRameStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class StudentRameController extends Controller
{
    private function getUserWorkingYear()
    {
        $user = Auth::user();
        if ($user && $user->working_school_year_id) {
            $workingYear = SchoolYear::find($user->working_school_year_id);
            if ($workingYear && $workingYear->is_active) {
                return $workingYear;
            }
        }
        return SchoolYear::where('is_current', true)->first() ?? SchoolYear::where('is_active', true)->first();
    }

    /**
     * Obtenir le statut RAME d'un étudiant
     */
    public function getRameStatus($studentId)
    {
        try {
            $workingYear = $this->getUserWorkingYear();
            if (!$workingYear) {
                return response()->json(['success' => false, 'message' => 'Aucune année scolaire définie'], 400);
            }

            $student = Student::find($studentId);
            if (!$student) {
                return response()->json(['success' => false, 'message' => 'Étudiant non trouvé'], 404);
            }

            $rameStatus = StudentRameStatus::getOrCreateForStudent($studentId, $workingYear->id);

            return response()->json([
                'success' => true,
                'data' => [
                    'student_id' => $studentId,
                    'school_year_id' => $workingYear->id,
                    'has_brought_rame' => $rameStatus->has_brought_rame,
                    'marked_date' => $rameStatus->marked_date,
                    'deposit_date' => $rameStatus->deposit_date,
                    'marked_by_user' => $rameStatus->markedByUser ? [
                        'id' => $rameStatus->markedByUser->id,
                        'name' => $rameStatus->markedByUser->name
                    ] : null,
                    'notes' => $rameStatus->notes,
                    'last_updated' => $rameStatus->updated_at
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in StudentRameController@getRameStatus: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du statut RAME',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Modifier le statut RAME d'un étudiant
     */
    public function updateRameStatus(Request $request, $studentId)
    {
        $validator = Validator::make($request->all(), [
            'has_brought_rame' => 'required|boolean',
            'notes' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Données invalides', 'errors' => $validator->errors()], 422);
        }

        try {
            $workingYear = $this->getUserWorkingYear();
            if (!$workingYear) {
                return response()->json(['success' => false, 'message' => 'Aucune année scolaire définie'], 400);
            }

            $student = Student::find($studentId);
            if (!$student) {
                return response()->json(['success' => false, 'message' => 'Étudiant non trouvé'], 404);
            }

            $rameStatus = StudentRameStatus::getOrCreateForStudent($studentId, $workingYear->id);

            if ($request->has_brought_rame) {
                $rameStatus->markAsBrought(Auth::id(), $request->notes);
                $message = "Statut RAME mis à jour : l'étudiant a apporté sa RAME";
            } else {
                $rameStatus->markAsNotBrought(Auth::id(), $request->notes);
                $message = "Statut RAME mis à jour : l'étudiant n'a pas apporté sa RAME";
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'student_id' => $studentId,
                    'school_year_id' => $workingYear->id,
                    'has_brought_rame' => $rameStatus->has_brought_rame,
                    'marked_date' => $rameStatus->marked_date,
                    'deposit_date' => $rameStatus->deposit_date,
                    'marked_by_user' => $rameStatus->markedByUser ? [
                        'id' => $rameStatus->markedByUser->id,
                        'name' => $rameStatus->markedByUser->name
                    ] : null,
                    'notes' => $rameStatus->notes,
                    'last_updated' => $rameStatus->updated_at
                ],
                'message' => $message
            ]);

        } catch (\Exception $e) {
            Log::error('Error in StudentRameController@updateRameStatus: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour du statut RAME',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir la liste des étudiants avec leur statut RAME pour une classe/série
     */
    public function getClassRameStatus($classSeriesId)
    {
        try {
            $workingYear = $this->getUserWorkingYear();
            if (!$workingYear) {
                return response()->json(['success' => false, 'message' => 'Aucune année scolaire définie'], 400);
            }

            $students = Student::where('class_series_id', $classSeriesId)
                ->where('school_year_id', $workingYear->id)
                ->with(['classSeries.schoolClass'])
                ->get();

            $studentsWithRameStatus = $students->map(function ($student) use ($workingYear) {
                $rameStatus = StudentRameStatus::getOrCreateForStudent($student->id, $workingYear->id);
                
                return [
                    'id' => $student->id,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'full_name' => $student->full_name,
                    'registration_number' => $student->registration_number,
                    'class_series' => $student->classSeries ? [
                        'id' => $student->classSeries->id,
                        'name' => $student->classSeries->name,
                        'school_class' => $student->classSeries->schoolClass ? [
                            'id' => $student->classSeries->schoolClass->id,
                            'name' => $student->classSeries->schoolClass->name
                        ] : null
                    ] : null,
                    'rame_status' => [
                        'has_brought_rame' => $rameStatus->has_brought_rame,
                        'marked_date' => $rameStatus->marked_date,
                        'deposit_date' => $rameStatus->deposit_date,
                        'marked_by_user' => $rameStatus->markedByUser ? [
                            'id' => $rameStatus->markedByUser->id,
                            'name' => $rameStatus->markedByUser->name
                        ] : null,
                        'notes' => $rameStatus->notes,
                        'last_updated' => $rameStatus->updated_at
                    ]
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $studentsWithRameStatus,
                'message' => 'Statuts RAME récupérés avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error('Error in StudentRameController@getClassRameStatus: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statuts RAME de la classe',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}