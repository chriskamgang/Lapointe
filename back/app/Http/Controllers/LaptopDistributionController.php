<?php

namespace App\Http\Controllers;

use App\Models\LaptopDistribution;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class LaptopDistributionController extends Controller
{
    /**
     * Lister toutes les distributions d'ordinateurs
     */
    public function index(Request $request)
    {
        try {
            $query = LaptopDistribution::with(['student.classSeries.schoolClass.level.school']);
            
            // Filtrer par statut
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
            
            // Filtrer par école
            if ($request->has('school_id')) {
                $query->whereHas('student.classSeries.schoolClass.level.school', function($q) use ($request) {
                    $q->where('id', $request->school_id);
                });
            }

            $distributions = $query->latest()->get();

            return response()->json([
                'success' => true,
                'data' => $distributions
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des distributions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Distribuer un ordinateur à un étudiant
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'laptop_model' => 'nullable|string|max:255',
            'serial_number' => 'nullable|string|max:255|unique:laptop_distributions',
            'distribution_date' => 'required|date',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Vérifier si l'étudiant a déjà un ordinateur actif
            $existingDistribution = LaptopDistribution::where('student_id', $request->student_id)
                ->where('status', 'distributed')
                ->first();

            if ($existingDistribution) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cet étudiant a déjà un ordinateur distribué'
                ], 422);
            }

            // Vérifier l'éligibilité de l'étudiant
            $student = Student::findOrFail($request->student_id);
            if (!$student->hasLaptopEligibility()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cet étudiant n\'est pas éligible pour recevoir un ordinateur'
                ], 422);
            }

            $distribution = LaptopDistribution::create([
                'student_id' => $request->student_id,
                'laptop_model' => $request->laptop_model ?? 'Laptop Standard IUP',
                'serial_number' => $request->serial_number,
                'distribution_date' => $request->distribution_date,
                'status' => 'distributed',
                'notes' => $request->notes
            ]);

            // Mettre à jour le statut de l'étudiant
            $student->update(['laptop_received' => true]);

            $distribution->load(['student']);

            return response()->json([
                'success' => true,
                'data' => $distribution,
                'message' => 'Ordinateur distribué avec succès'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la distribution de l\'ordinateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Retourner un ordinateur
     */
    public function returnLaptop(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'return_date' => 'required|date',
            'status' => 'required|in:returned,damaged,lost',
            'notes' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $distribution = LaptopDistribution::findOrFail($id);
            
            $distribution->update([
                'return_date' => $request->return_date,
                'status' => $request->status,
                'notes' => $distribution->notes . "\n" . $request->notes
            ]);

            // Mettre à jour le statut de l'étudiant
            $distribution->student->update(['laptop_received' => false]);

            $distribution->load(['student']);

            return response()->json([
                'success' => true,
                'data' => $distribution,
                'message' => 'Ordinateur retourné avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du retour de l\'ordinateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques des distributions
     */
    public function getStatistics()
    {
        try {
            $stats = [
                'total_distributions' => LaptopDistribution::count(),
                'active_distributions' => LaptopDistribution::where('status', 'distributed')->count(),
                'returned_laptops' => LaptopDistribution::where('status', 'returned')->count(),
                'damaged_laptops' => LaptopDistribution::where('status', 'damaged')->count(),
                'lost_laptops' => LaptopDistribution::where('status', 'lost')->count(),
                'eligible_students' => Student::where('laptop_eligible', true)->count(),
                'students_with_laptops' => Student::where('laptop_received', true)->count()
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
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
     * Obtenir les étudiants éligibles pour un ordinateur
     */
    public function getEligibleStudents()
    {
        try {
            $students = Student::where('laptop_eligible', true)
                ->where('laptop_received', false)
                ->with(['classSeries.schoolClass.level.school'])
                ->get();

            return response()->json([
                'success' => true,
                'data' => $students
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des étudiants éligibles',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}