<?php

namespace App\Http\Controllers;

use App\Models\Teacher;
use App\Models\User;
use App\Models\TeacherSubject;
use App\Models\ClassSeries;
use App\Models\SchoolYear;
use App\Exports\TeachersExport;
use App\Exports\TeachersImportableExport;
use App\Imports\TeachersImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Response;

class TeacherController extends Controller
{
    /**
     * Lister tous les enseignants
     */
    public function index(Request $request)
    {
        try {
            $query = Teacher::query();

            // Filtrer par statut si spécifié
            if ($request->has('active')) {
                $isActive = filter_var($request->active, FILTER_VALIDATE_BOOLEAN);
                $query->where('is_active', $isActive);
            }

            // Recherche par nom, prénom ou téléphone
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('phone_number', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // Inclure les relations si demandé
            if ($request->has('with_details')) {
                $query->with(['user', 'mainClasses' => function($q) {
                    $q->with('schoolClass');
                }]);
            }

            $teachers = $query->orderBy('last_name')
                             ->orderBy('first_name')
                             ->get();

            return response()->json([
                'success' => true,
                'data' => $teachers
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des enseignants',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer un nouvel enseignant
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'phone_number' => 'required|string|max:20',
                'email' => 'nullable|email|unique:teachers,email',
                'address' => 'nullable|string',
                'date_of_birth' => 'nullable|date',
                'gender' => 'nullable|in:m,f',
                'qualification' => 'nullable|string|max:255',
                'hire_date' => 'nullable|date',
                'is_active' => 'boolean',
                // Champs pour créer un compte utilisateur
                'create_user_account' => 'boolean',
                'username' => 'required_if:create_user_account,true|string|unique:users,username',
                'password' => 'required_if:create_user_account,true|string|min:6'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $teacherData = $validator->validated();
            $userId = null;

            // Créer un compte utilisateur si demandé
            if ($request->create_user_account && $request->username && $request->password) {
                // Si pas d'email fourni, générer un email temporaire basé sur le nom d'utilisateur
                $email = $teacherData['email'] ?? $teacherData['username'] . '@school.local';
                
                $user = User::create([
                    'name' => $teacherData['first_name'] . ' ' . $teacherData['last_name'],
                    'username' => $teacherData['username'],
                    'email' => $email,
                    'password' => Hash::make($teacherData['password']),
                    'role' => 'teacher'
                ]);
                $userId = $user->id;
            }

            // Créer l'enseignant
            $teacher = Teacher::create([
                'first_name' => $teacherData['first_name'],
                'last_name' => $teacherData['last_name'],
                'phone_number' => $teacherData['phone_number'],
                'email' => $teacherData['email'] ?? null,
                'address' => $teacherData['address'] ?? null,
                'date_of_birth' => $teacherData['date_of_birth'] ?? null,
                'gender' => $teacherData['gender'] ?? null,
                'qualification' => $teacherData['qualification'] ?? null,
                'hire_date' => $teacherData['hire_date'] ?? now(),
                'is_active' => $teacherData['is_active'] ?? true,
                'user_id' => $userId
            ]);

            DB::commit();

            $teacher->load('user');

            return response()->json([
                'success' => true,
                'message' => 'Enseignant créé avec succès',
                'data' => $teacher
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de l\'enseignant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Afficher un enseignant spécifique
     */
    public function show(Teacher $teacher)
    {
        try {
            $teacher->load([
                'user',
                'mainClasses' => function($q) {
                    $q->with('schoolClass');
                },
                'teacherSubjects' => function($q) {
                    $q->with(['subject', 'classSeries.schoolClass', 'schoolYear'])
                      ->where('is_active', true);
                }
            ]);

            return response()->json([
                'success' => true,
                'data' => $teacher
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'enseignant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour un enseignant
     */
    public function update(Request $request, Teacher $teacher)
    {
        try {
            $validator = Validator::make($request->all(), [
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'phone_number' => 'required|string|max:20',
                'email' => 'nullable|email|unique:teachers,email,' . $teacher->id,
                'address' => 'nullable|string',
                'date_of_birth' => 'nullable|date',
                'gender' => 'nullable|in:m,f',
                'qualification' => 'nullable|string|max:255',
                'hire_date' => 'nullable|date',
                'is_active' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $teacher->update($validator->validated());

            // Mettre à jour le compte utilisateur associé si existe
            if ($teacher->user) {
                $teacher->user->update([
                    'name' => $teacher->first_name . ' ' . $teacher->last_name,
                    'email' => $teacher->email
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Enseignant mis à jour avec succès',
                'data' => $teacher
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de l\'enseignant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer un enseignant
     */
    public function destroy(Teacher $teacher)
    {
        try {
            DB::beginTransaction();

            // Vérifier si l'enseignant est professeur principal
            if ($teacher->mainClasses()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cet enseignant ne peut pas être supprimé car il est professeur principal d\'une ou plusieurs classes'
                ], 400);
            }

            // Supprimer les assignations de matières
            $teacher->teacherSubjects()->delete();

            // Supprimer le compte utilisateur associé si existe
            if ($teacher->user) {
                $teacher->user->delete();
            }

            $teacher->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Enseignant supprimé avec succès'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de l\'enseignant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Basculer le statut actif/inactif d'un enseignant
     */
    public function toggleStatus(Teacher $teacher)
    {
        try {
            $teacher->is_active = !$teacher->is_active;
            $teacher->save();

            return response()->json([
                'success' => true,
                'message' => 'Statut de l\'enseignant mis à jour avec succès',
                'data' => $teacher
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
     * Assigner des matières à un enseignant
     */
    public function assignSubjects(Request $request, Teacher $teacher)
    {
        try {
            $validator = Validator::make($request->all(), [
                'school_year_id' => 'nullable|exists:school_years,id',
                'assignments' => 'required|array',
                'assignments.*.subject_id' => 'required|exists:subjects,id',
                'assignments.*.class_series_id' => 'required|exists:school_classes,id',
                'assignments.*.coefficient' => 'nullable|numeric|min:0.5|max:10',
                'assignments.*.is_main_teacher' => 'boolean',
                'assignments.*.is_active' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Utiliser l'année scolaire courante si non spécifiée
            $schoolYearId = $request->school_year_id ?? SchoolYear::where('is_current', true)->first()?->id;
            
            if (!$schoolYearId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Année scolaire non trouvée'
                ], 422);
            }

            // Ajouter les nouvelles assignations (ne pas supprimer les anciennes, juste ajouter)
            foreach ($request->assignments as $assignment) {
                // Vérifier si l'assignation existe déjà
                $existingAssignment = TeacherSubject::where('teacher_id', $teacher->id)
                    ->where('subject_id', $assignment['subject_id'])
                    ->where('class_series_id', $assignment['class_series_id'])
                    ->where('school_year_id', $schoolYearId)
                    ->first();

                if ($existingAssignment) {
                    // Mettre à jour l'assignation existante
                    $existingAssignment->update([
                        'coefficient' => $assignment['coefficient'] ?? 1,
                        'is_main_teacher' => $assignment['is_main_teacher'] ?? false,
                        'is_active' => $assignment['is_active'] ?? true
                    ]);
                } else {
                    // Créer une nouvelle assignation
                    TeacherSubject::create([
                        'teacher_id' => $teacher->id,
                        'subject_id' => $assignment['subject_id'],
                        'class_series_id' => $assignment['class_series_id'],
                        'school_year_id' => $schoolYearId,
                        'coefficient' => $assignment['coefficient'] ?? 1,
                        'is_main_teacher' => $assignment['is_main_teacher'] ?? false,
                        'is_active' => $assignment['is_active'] ?? true
                    ]);
                }
            }

            DB::commit();

            // Recharger les assignations
            $teacher->load(['teacherSubjects' => function($q) use ($schoolYearId) {
                $q->with(['subject', 'classSeries.schoolClass'])
                  ->where('school_year_id', $schoolYearId);
            }]);

            return response()->json([
                'success' => true,
                'message' => 'Assignations de matières mises à jour avec succès',
                'data' => $teacher
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'assignation des matières',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer une affectation spécifique d'un enseignant
     */
    public function removeAssignment(Teacher $teacher, Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'subject_id' => 'required|exists:subjects,id',
                'class_series_id' => 'required|exists:school_classes,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Supprimer l'affectation spécifique
            $deleted = TeacherSubject::where('teacher_id', $teacher->id)
                ->where('subject_id', $request->subject_id)
                ->where('class_series_id', $request->class_series_id)
                ->delete();

            if ($deleted === 0) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Affectation non trouvée'
                ], 404);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Affectation supprimée avec succès'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de l\'affectation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques d'un enseignant pour une année
     */
    public function getStats(Teacher $teacher, Request $request)
    {
        try {
            $schoolYearId = $request->school_year_id ?? SchoolYear::where('is_current', true)->first()->id;

            $stats = [
                'subject_count' => $teacher->getSubjectCountForYear($schoolYearId),
                'class_count' => $teacher->getClassCountForYear($schoolYearId),
                'is_main_teacher' => $teacher->mainClasses()->exists(),
                'main_classes_count' => $teacher->mainClasses()->count()
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
     * Export teachers to Excel
     */
    public function exportExcel(Request $request)
    {
        try {
            $filename = 'enseignants_' . date('Y-m-d_H-i-s') . '.xlsx';
            return Excel::download(new TeachersExport(), $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export Excel',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export teachers to CSV
     */
    public function exportCsv(Request $request)
    {
        try {
            $filename = 'enseignants_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new TeachersImportableExport(), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export teachers to PDF
     */
    public function exportPdf(Request $request)
    {
        try {
            $filename = 'enseignants_' . date('Y-m-d_H-i-s') . '.pdf';
            return Excel::download(new TeachersExport(), $filename, \Maatwebsite\Excel\Excel::DOMPDF);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import teachers from CSV
     */
    public function importCsv(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'file' => 'required|mimes:csv,txt|max:2048'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fichier invalide',
                    'errors' => $validator->errors()
                ], 422);
            }

            $import = new TeachersImport();
            Excel::import($import, $request->file('file'));
            
            $results = $import->getResults();

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
     * Export teachers in importable CSV format
     */
    public function exportImportable(Request $request)
    {
        try {
            $filename = 'enseignants_importable_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new TeachersImportableExport(), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV importable',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download CSV template for teachers import
     */
    public function downloadTemplate()
    {
        try {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="template_enseignants.csv"'
            ];

            $csvData = "id,nom,prenom,telephone,email,adresse,date_naissance,sexe,qualification,date_embauche,statut\n";
            $csvData .= ",DUPONT,Jean,123456789,jean.dupont@email.com,123 Rue de la Paix,01/01/1980,m,Licence en Mathématiques,01/09/2020,1\n";
            $csvData .= ",MARTIN,Sophie,987654321,sophie.martin@email.com,456 Avenue des Ecoles,15/05/1985,f,Master en Français,01/09/2021,1\n";
            $csvData .= "3,BERNARD,Pierre,555123456,pierre.bernard@email.com,789 Boulevard Education,20/03/1978,m,CAPES Histoire-Géographie,01/09/2019,0\n";

            return Response::make($csvData, 200, $headers);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du téléchargement du template',
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
                'total_teachers' => Teacher::count(),
                'active_teachers' => Teacher::where('is_active', true)->count(),
                'inactive_teachers' => Teacher::where('is_active', false)->count(),
                'with_user_account' => Teacher::whereNotNull('user_id')->count(),
                'main_teachers' => Teacher::has('mainClasses')->count(),
            ];

            $recent_teachers = Teacher::latest()->take(5)->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => $stats,
                    'recent_teachers' => $recent_teachers
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
     * Create a user account for an existing teacher
     */
    public function createUserAccount(Request $request, Teacher $teacher)
    {
        try {
            // Vérifier si l'enseignant a déjà un compte utilisateur
            if ($teacher->user_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cet enseignant a déjà un compte utilisateur'
                ], 400);
            }

            $validator = Validator::make($request->all(), [
                'username' => 'required|string|unique:users,username|max:255',
                'password' => 'required|string|min:6',
                'email' => 'nullable|email|unique:users,email'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Utiliser l'email de l'enseignant ou celui fourni, ou générer un email temporaire
            $email = $request->email ?: $teacher->email ?: $request->username . '@school.local';

            // Créer le compte utilisateur
            $user = User::create([
                'name' => $teacher->full_name,
                'username' => $request->username,
                'email' => $email,
                'password' => Hash::make($request->password),
                'role' => 'teacher'
            ]);

            // Lier l'utilisateur à l'enseignant
            $teacher->update(['user_id' => $user->id]);

            // Si un nouvel email a été fourni, mettre à jour l'enseignant aussi
            if ($request->email && $request->email !== $teacher->email) {
                $teacher->update(['email' => $request->email]);
            }

            DB::commit();

            $teacher->load('user');

            return response()->json([
                'success' => true,
                'message' => 'Compte utilisateur créé avec succès',
                'data' => $teacher
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du compte utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove user account from a teacher
     */
    public function removeUserAccount(Teacher $teacher)
    {
        try {
            if (!$teacher->user_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cet enseignant n\'a pas de compte utilisateur'
                ], 400);
            }

            DB::beginTransaction();

            // Supprimer le compte utilisateur
            if ($teacher->user) {
                $teacher->user->delete();
            }

            // Retirer la liaison
            $teacher->update(['user_id' => null]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Compte utilisateur supprimé avec succès',
                'data' => $teacher
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du compte utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}