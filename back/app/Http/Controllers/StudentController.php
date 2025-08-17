<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\SchoolYear;
use App\Models\ClassSeries;
use App\Exports\StudentsExport;
use App\Exports\StudentsImportableExport;
use App\Imports\StudentsImport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Response;

class StudentController extends Controller
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
        $currentYear = SchoolYear::where('is_current', true)->first();

        if (!$currentYear) {
            // Si aucune année courante, prendre la première année active
            $currentYear = SchoolYear::where('is_active', true)->first();
        }

        return $currentYear;
    }

    /**
     * Gérer l'upload et le redimensionnement de photo
     */
    private function handlePhotoUpload($photo, $studentNumber)
    {
        try {
            if (!$photo || !$photo->isValid()) {
                \Log::error('Photo upload failed: Invalid photo file');
                return null;
            }

            // Vérifier si GD est disponible
            if (!extension_loaded('gd')) {
                \Log::warning('GD extension not available, storing original image');
                // Fallback: stocker l'image sans redimensionnement
                $extension = $photo->getClientOriginalExtension() ?: 'jpg';
                $filename = 'student_' . $studentNumber . '_' . time() . '.' . $extension;
                $uploadPath = 'students/photos';

                if (!Storage::disk('public')->exists($uploadPath)) {
                    Storage::disk('public')->makeDirectory($uploadPath);
                }

                $path = $photo->storeAs($uploadPath, $filename, 'public');
                return $path;
            }

            // Validation du type de fichier
            $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!in_array($photo->getMimeType(), $allowedMimes)) {
                \Log::error('Photo upload failed: Invalid mime type', ['mime' => $photo->getMimeType()]);
                throw new \Exception('Format de fichier non supporté. Utilisez JPG, PNG ou GIF.');
            }

            // Validation de la taille (max 5MB)
            if ($photo->getSize() > 5 * 1024 * 1024) {
                \Log::error('Photo upload failed: File too large', ['size' => $photo->getSize()]);
                throw new \Exception('La taille de l\'image ne doit pas dépasser 5MB.');
            }

            // Créer le nom de fichier unique
            $extension = $photo->getClientOriginalExtension() ?: 'jpg';
            $filename = 'student_' . $studentNumber . '_' . time() . '.' . $extension;

            // Créer le dossier s'il n'existe pas
            $uploadPath = 'students/photos';
            if (!Storage::disk('public')->exists($uploadPath)) {
                Storage::disk('public')->makeDirectory($uploadPath);
            }

            // Redimensionner et optimiser l'image
            $imageData = file_get_contents($photo->getRealPath());
            $image = imagecreatefromstring($imageData);

            if (!$image) {
                \Log::error('Photo upload failed: Could not create image from string');
                // Fallback: stocker l'image sans redimensionnement
                $path = $photo->storeAs($uploadPath, $filename, 'public');
                return $path;
            }

            // Obtenir les dimensions originales
            $originalWidth = imagesx($image);
            $originalHeight = imagesy($image);

            // Calculer les nouvelles dimensions (max 300x300 en gardant les proportions)
            $maxSize = 300;
            if ($originalWidth > $originalHeight) {
                $newWidth = $maxSize;
                $newHeight = intval(($originalHeight * $maxSize) / $originalWidth);
            } else {
                $newHeight = $maxSize;
                $newWidth = intval(($originalWidth * $maxSize) / $originalHeight);
            }

            // Créer la nouvelle image redimensionnée
            $resizedImage = imagecreatetruecolor($newWidth, $newHeight);

            // Préserver la transparence pour PNG et GIF
            if ($photo->getMimeType() === 'image/png' || $photo->getMimeType() === 'image/gif') {
                imagealphablending($resizedImage, false);
                imagesavealpha($resizedImage, true);
                $transparent = imagecolorallocatealpha($resizedImage, 255, 255, 255, 127);
                imagefilledrectangle($resizedImage, 0, 0, $newWidth, $newHeight, $transparent);
            }

            // Redimensionner
            imagecopyresampled($resizedImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $originalWidth, $originalHeight);

            // Sauvegarder dans le storage
            $fullPath = storage_path('app/public/' . $uploadPath . '/' . $filename);

            // Sauvegarder selon le type
            switch ($photo->getMimeType()) {
                case 'image/png':
                    imagepng($resizedImage, $fullPath, 8);
                    break;
                case 'image/gif':
                    imagegif($resizedImage, $fullPath);
                    break;
                default:
                    imagejpeg($resizedImage, $fullPath, 85);
                    break;
            }

            // Libérer la mémoire
            imagedestroy($image);
            imagedestroy($resizedImage);

            return $uploadPath . '/' . $filename;
        } catch (\Exception $e) {
            \Log::error('Photo upload failed with exception: ' . $e->getMessage());
            // Si le traitement échoue, essayer de stocker l'image sans redimensionnement
            try {
                $extension = $photo->getClientOriginalExtension() ?: 'jpg';
                $filename = 'student_' . $studentNumber . '_' . time() . '.' . $extension;
                $uploadPath = 'students/photos';

                if (!Storage::disk('public')->exists($uploadPath)) {
                    Storage::disk('public')->makeDirectory($uploadPath);
                }

                $path = $photo->storeAs($uploadPath, $filename, 'public');
                \Log::info('Photo stored without processing: ' . $path);
                return $path;
            } catch (\Exception $fallbackException) {
                \Log::error('Fallback photo upload also failed: ' . $fallbackException->getMessage());
                throw new \Exception('Impossible de sauvegarder la photo.');
            }
        }
    }

    /**
     * Obtenir tous les élèves d'une série de classe
     */
    public function getByClassSeries($seriesId)
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

            // Récupérer les élèves pour l'année de travail sélectionnée
            $studentsQuery = Student::with(['schoolYear', 'classSeries'])
                ->where('class_series_id', $seriesId)
                ->where('is_active', true)
                ->where('school_year_id', $workingYear->id);

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
            \Log::error('Error in getByClassSeries: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des élèves',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer un nouvel élève
     */
    public function store(Request $request)
    {
        // Debug: afficher les données reçues
        \Log::info('Student creation request data:', $request->all());
        \Log::info('Student creation files:', $request->allFiles());

        // Obtenir l'année de travail de l'utilisateur
        $workingYear = $this->getUserWorkingYear();

        if (!$workingYear) {
            return response()->json([
                'success' => false,
                'message' => 'Aucune année scolaire définie'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'date_of_birth' => 'required|date',
            'place_of_birth' => 'required|string|max:255',
            'gender' => 'required|in:M,F',
            'parent_name' => 'required|string|max:255',
            'parent_phone' => 'nullable|string|max:20',
            'parent_email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'class_series_id' => 'required|integer|exists:class_series,id',
            'photo' => 'nullable|image|mimes:jpeg,jpg,png,gif|max:5120' // 5MB max
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

            // Générer le numéro d'élève pour l'année de travail
            $studentNumber = Student::generateStudentNumber(
                $workingYear->start_date,
                $request->class_series_id
            );

            // Calculer l'ordre automatiquement (position alphabétique)
            $maxOrder = Student::where('class_series_id', $request->class_series_id)
                ->where('school_year_id', $workingYear->id)
                ->max('order') ?: 0;

            $studentData = $request->except(['photo']);
            $studentData['student_number'] = $studentNumber;
            $studentData['school_year_id'] = $workingYear->id;
            $studentData['order'] = $maxOrder + 1; // Ajouter à la fin par défaut
            $studentData['is_active'] = true;
            
            // Convertir les chaînes boolean en vrais boolean
            if (isset($studentData['has_scholarship_enabled'])) {
                $studentData['has_scholarship_enabled'] = filter_var($studentData['has_scholarship_enabled'], FILTER_VALIDATE_BOOLEAN);
            }

            // Combiner nom + prénom pour le champ legacy 'name'
            if (!empty($studentData['last_name']) && !empty($studentData['first_name'])) {
                $studentData['name'] = $studentData['last_name'] . ' ' . $studentData['first_name'];
            }

            // Gérer l'upload de photo
            if ($request->hasFile('photo')) {
                $photoPath = $this->handlePhotoUpload($request->file('photo'), $studentNumber);
                $studentData['photo'] = $photoPath;
            }

            $student = Student::create($studentData);
            $student->load(['schoolYear', 'classSeries']);

            DB::commit();

            return response()->json([
                'success' => true,
                'data' => $student,
                'message' => 'Élève créé avec succès'
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création de l\'élève',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour un élève
     */
    public function update(Request $request, Student $student)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'date_of_birth' => 'required|date',
            'place_of_birth' => 'required|string|max:255',
            'gender' => 'required|in:M,F',
            'parent_name' => 'required|string|max:255',
            'parent_phone' => 'nullable|string|max:20',
            'parent_email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'class_series_id' => 'required|exists:class_series,id',
            'school_year_id' => 'nullable|exists:school_years,id', // Optionnel lors de la modification
            'is_active' => 'boolean',
            'photo' => 'nullable|image|mimes:jpeg,jpg,png,gif|max:5120' // 5MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $updateData = $request->except(['photo']);

            // Si school_year_id n'est pas fourni, utiliser l'année de l'étudiant existant ou l'année courante
            if (!isset($updateData['school_year_id']) || empty($updateData['school_year_id'])) {
                $updateData['school_year_id'] = $student->school_year_id ?: $this->getUserWorkingYear()->id;
            }
            
            // Convertir les chaînes boolean en vrais boolean
            if (isset($updateData['has_scholarship_enabled'])) {
                $updateData['has_scholarship_enabled'] = filter_var($updateData['has_scholarship_enabled'], FILTER_VALIDATE_BOOLEAN);
            }

            // Combiner nom + prénom pour le champ legacy 'name'
            if (!empty($updateData['last_name']) && !empty($updateData['first_name'])) {
                $updateData['name'] = $updateData['last_name'] . ' ' . $updateData['first_name'];
            }

            // Gérer l'upload de photo
            if ($request->hasFile('photo')) {
                // Supprimer l'ancienne photo si elle existe
                if ($student->photo && Storage::disk('public')->exists($student->photo)) {
                    Storage::disk('public')->delete($student->photo);
                }

                $photoPath = $this->handlePhotoUpload($request->file('photo'), $student->student_number);
                $updateData['photo'] = $photoPath;
            }

            $student->update($updateData);
            $student->load(['schoolYear', 'classSeries']);

            return response()->json([
                'success' => true,
                'data' => $student,
                'message' => 'Élève mis à jour avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de l\'élève',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour un élève avec photo (via POST pour FormData)
     */
    public function updateWithPhoto(Request $request, Student $student)
    {
        // Debug: logger les données reçues
        \Log::info('Student update with photo request data:', $request->all());
        \Log::info('Student update with photo files:', $request->allFiles());

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'date_of_birth' => 'required|date',
            'place_of_birth' => 'required|string|max:255',
            'gender' => 'required|in:M,F',
            'parent_name' => 'required|string|max:255',
            'parent_phone' => 'nullable|string|max:20',
            'parent_email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
            'class_series_id' => 'required|exists:class_series,id',
            'school_year_id' => 'nullable|exists:school_years,id', // Make nullable for update
            'is_active' => 'nullable|boolean',
            'photo' => 'nullable|image|mimes:jpeg,jpg,png,gif|max:5120' // 5MB max
        ]);

        if ($validator->fails()) {
            \Log::error('Student update with photo validation failed:', $validator->errors()->toArray());
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $updateData = $request->except(['photo']);

            // Si school_year_id n'est pas fourni, utiliser l'année de travail de l'utilisateur
            if (empty($updateData['school_year_id'])) {
                $workingYear = $this->getUserWorkingYear();
                if ($workingYear) {
                    $updateData['school_year_id'] = $workingYear->id;
                }
            }
            
            // Convertir les chaînes boolean en vrais boolean
            if (isset($updateData['has_scholarship_enabled'])) {
                $updateData['has_scholarship_enabled'] = filter_var($updateData['has_scholarship_enabled'], FILTER_VALIDATE_BOOLEAN);
            }

            // Combiner nom + prénom pour le champ legacy 'name'
            if (!empty($updateData['last_name']) && !empty($updateData['first_name'])) {
                $updateData['name'] = $updateData['last_name'] . ' ' . $updateData['first_name'];
            }

            // Gérer l'upload de photo
            if ($request->hasFile('photo')) {
                // Supprimer l'ancienne photo si elle existe
                if ($student->photo && Storage::disk('public')->exists($student->photo)) {
                    Storage::disk('public')->delete($student->photo);
                }

                $photoPath = $this->handlePhotoUpload($request->file('photo'), $student->student_number);
                $updateData['photo'] = $photoPath;
            }

            $student->update($updateData);
            $student->load(['schoolYear', 'classSeries']);

            return response()->json([
                'success' => true,
                'data' => $student,
                'message' => 'Élève mis à jour avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de l\'élève',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer un élève
     */
    public function destroy(Student $student)
    {
        try {
            // Supprimer la photo si elle existe
            if ($student->photo && Storage::disk('public')->exists($student->photo)) {
                Storage::disk('public')->delete($student->photo);
            }

            $student->delete();

            return response()->json([
                'success' => true,
                'message' => 'Élève supprimé avec succès'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression de l\'élève',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exporter la liste des élèves en CSV
     */
    public function exportCsv($seriesId)
    {
        try {
            // Utiliser l'année de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $students = Student::with(['schoolYear', 'classSeries'])
                ->forSeries($seriesId)
                ->forYear($workingYear->id)
                ->active()
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get();

            $series = ClassSeries::with(['schoolClass.level.section'])->find($seriesId);

            $filename = 'eleves_' . str_replace(' ', '_', $series->name) . '_' . date('Y-m-d') . '.csv';

            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => "attachment; filename=\"$filename\"",
            ];

            $callback = function () use ($students) {
                $file = fopen('php://output', 'w');

                // Headers CSV
                fputcsv($file, [
                    'Numéro',
                    'Nom',
                    'Prénom',
                    'Date de naissance',
                    'Lieu de naissance',
                    'Sexe',
                    'Nom du parent',
                    'Téléphone parent',
                    'Email parent',
                    'Adresse'
                ], ';');

                // Données
                foreach ($students as $student) {
                    fputcsv($file, [
                        $student->student_number,
                        $student->last_name,
                        $student->first_name,
                        $student->date_of_birth ? $student->date_of_birth->format('d/m/Y') : '',
                        $student->place_of_birth,
                        $student->gender === 'M' ? 'Masculin' : 'Féminin',
                        $student->parent_name,
                        $student->parent_phone,
                        $student->parent_email,
                        $student->address
                    ], ';');
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exporter la liste des élèves en PDF
     */
    public function exportPdf($seriesId)
    {
        try {
            // Utiliser l'année de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $students = Student::with(['schoolYear', 'classSeries'])
                ->forSeries($seriesId)
                ->forYear($workingYear->id)
                ->active()
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get();

            $series = ClassSeries::with(['schoolClass.level.section'])->find($seriesId);

            // Générer le HTML pour le PDF
            $html = $this->generateStudentListHtml($students, $series, $workingYear);

            $filename = 'eleves_' . str_replace(' ', '_', $series->name) . '_' . date('Y-m-d') . '.pdf';

            // Générer le HTML optimisé pour impression/PDF
            $optimizedHtml = $this->generatePdfFromHtml($html, $filename);

            // Retourner le HTML formaté que le navigateur peut imprimer en PDF
            return response($optimizedHtml, 200, [
                'Content-Type' => 'text/html',
                'Content-Disposition' => "inline; filename=\"students_list.html\"",
                'X-Suggested-Filename' => $filename
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Générer le HTML pour la liste des élèves
     */
    private function generateStudentListHtml($students, $series, $schoolYear)
    {
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Liste des Élèves - ' . $series->name . '</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2c3e50; margin-bottom: 5px; }
        .header p { color: #7f8c8d; margin: 5px 0; }
        .info-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #3498db; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .student-number { font-weight: bold; color: #2c3e50; }
        .gender-m { background-color: #e3f2fd; color: #1976d2; }
        .gender-f { background-color: #fce4ec; color: #c2185b; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #7f8c8d; }
        @media print {
            body { margin: 10px; }
            .header h1 { font-size: 18px; }
            th, td { padding: 5px; font-size: 10px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>COLLEGE POLYVALENT BILINGUE DE DOUALA</h1>
        <p>Liste des Élèves</p>
    </div>

    <div class="info-box">
        <div class="info-row">
            <strong>Série:</strong> <span>' . $series->name . '</span>
        </div>
        <div class="info-row">
            <strong>Classe:</strong> <span>' . $series->schoolClass->name . '</span>
        </div>
        <div class="info-row">
            <strong>Niveau:</strong> <span>' . $series->schoolClass->level->name . '</span>
        </div>
        <div class="info-row">
            <strong>Section:</strong> <span>' . $series->schoolClass->level->section->name . '</span>
        </div>
        <div class="info-row">
            <strong>Année scolaire:</strong> <span>' . $schoolYear->name . '</span>
        </div>
        <div class="info-row">
            <strong>Nombre d\'élèves:</strong> <span>' . $students->count() . '</span>
        </div>
        <div class="info-row">
            <strong>Date d\'export:</strong> <span>' . date('d/m/Y à H:i') . '</span>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 8%;">N°</th>
                <th style="width: 25%;">Nom & Prénom</th>
                <th style="width: 12%;">Date naiss.</th>
                <th style="width: 15%;">Lieu naiss.</th>
                <th style="width: 8%;">Sexe</th>
                <th style="width: 20%;">Parent</th>
                <th style="width: 12%;">Téléphone</th>
            </tr>
        </thead>
        <tbody>';

        foreach ($students as $index => $student) {
            $html .= '<tr>
                <td class="student-number">' . ($index + 1) . '</td>
                <td><strong>' . $student->last_name . ' ' . $student->first_name . '</strong></td>
                <td>' . ($student->date_of_birth ? $student->date_of_birth->format('d/m/Y') : '') . '</td>
                <td>' . $student->place_of_birth . '</td>
                <td class="' . ($student->gender === 'M' ? 'gender-m' : 'gender-f') . '">' .
                ($student->gender === 'M' ? 'M' : 'F') . '</td>
                <td>' . $student->parent_name . '</td>
                <td>' . $student->parent_phone . '</td>
            </tr>';
        }

        $html .= '</tbody>
    </table>

    <div class="footer">
        <p>Document généré automatiquement le ' . date('d/m/Y à H:i:s') . '</p>
        <p>COLLEGE POLYVALENT BILINGUE DE DOUALA</p>
    </div>
</body>
</html>';

        return $html;
    }

    /**
     * Générer un PDF à partir du HTML (méthode simple mais robuste)
     */
    private function generatePdfFromHtml($html, $filename)
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
     * Importer des élèves depuis un fichier CSV
     */
    public function importCsv(Request $request)
    {
        // Obtenir l'année de travail de l'utilisateur
        $workingYear = $this->getUserWorkingYear();

        if (!$workingYear) {
            return response()->json([
                'success' => false,
                'message' => 'Aucune année scolaire définie'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:2048',
            'class_series_id' => 'nullable|exists:class_series,id'
        ]);
        
        // Validation supplémentaire pour l'extension CSV
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $extension = strtolower($file->getClientOriginalExtension());
            if (!in_array($extension, ['csv', 'txt'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format de fichier non supporté. Utilisez csv ou txt.',
                    'errors' => ['file' => ['Le fichier doit être au format csv ou txt.']]
                ], 422);
            }
        }

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Fichier invalide',
                'errors' => $validator->errors()
            ], 422);
        }

        $classSeriesId = $request->class_series_id;
        
        // Si pas de class_series_id fourni, essayer de le détecter automatiquement
        if (!$classSeriesId) {
            $classSeriesId = $this->detectSeriesFromContext($request);
        }
        
        if (!$classSeriesId) {
            return response()->json([
                'success' => false,
                'message' => 'Aucune série spécifiée. Utilisez la route /api/students/series/{seriesId}/import/csv ou spécifiez class_series_id.',
                'help' => 'Nouvelles routes recommandées: POST /api/students/series/{seriesId}/import/csv'
            ], 400);
        }

        try {
            $file = $request->file('file');
            $csvData = array_map(function ($line) {
                return str_getcsv($line, ';', '"', '\\');
            }, file($file->getRealPath()));

            // Ignorer la première ligne (headers)
            $headers = array_shift($csvData);

            $imported = 0;
            $errors = [];
            $schoolYear = SchoolYear::find($request->school_year_id);

            DB::beginTransaction();

            foreach ($csvData as $index => $row) {
                if (count($row) < 6) { // Minimum requis
                    $errors[] = "Ligne " . ($index + 2) . ": données insuffisantes";
                    continue;
                }

                try {
                    $studentNumber = Student::generateStudentNumber(
                        $schoolYear->start_date,
                        $request->class_series_id
                    );

                    $lastName = trim($row[0] ?? '');
                    $firstName = trim($row[1] ?? '');

                    // Validation des champs obligatoires
                    if (empty($lastName) || empty($firstName)) {
                        $errors[] = "Ligne " . ($index + 2) . ": Nom et prénom obligatoires";
                        continue;
                    }

                    // Traitement de la date de naissance avec plusieurs formats possibles
                    $dateOfBirth = null;
                    if (!empty($row[2])) {
                        $dateStr = trim($row[2]);
                        // Essayer différents formats de date
                        $formats = ['d/m/Y', 'Y-m-d', 'd-m-Y', 'd.m.Y'];
                        foreach ($formats as $format) {
                            $dateObj = \DateTime::createFromFormat($format, $dateStr);
                            if ($dateObj && $dateObj->format($format) === $dateStr) {
                                $dateOfBirth = $dateObj->format('Y-m-d');
                                break;
                            }
                        }
                        if (!$dateOfBirth) {
                            $errors[] = "Ligne " . ($index + 2) . ": Format de date invalide (utilisez DD/MM/YYYY)";
                            continue;
                        }
                    }

                    // Traitement du sexe
                    $gender = strtoupper(trim($row[4] ?? ''));
                    if (!in_array($gender, ['M', 'F'])) {
                        $gender = $gender === 'MASCULIN' || $gender === 'HOMME' ? 'M' : ($gender === 'FEMININ' || $gender === 'FÉMININ' || $gender === 'FEMME' ? 'F' : 'M');
                    }

                    // Calculer l'ordre automatiquement
                    $maxOrder = Student::where('class_series_id', $classSeriesId)
                        ->where('school_year_id', $workingYear->id)
                        ->max('order') ?: 0;

                    Student::create([
                        'last_name' => $lastName,
                        'first_name' => $firstName,
                        'name' => $lastName . ' ' . $firstName, // Combiner pour compatibilité
                        'date_of_birth' => $dateOfBirth,
                        'place_of_birth' => trim($row[3] ?? ''),
                        'gender' => $gender,
                        'parent_name' => trim($row[5] ?? ''),
                        'parent_phone' => trim($row[6] ?? null),
                        'parent_email' => trim($row[7] ?? null),
                        'address' => trim($row[8] ?? null),
                        'class_series_id' => $classSeriesId,
                        'school_year_id' => $workingYear->id,
                        'student_number' => $studentNumber,
                        'order' => $maxOrder + 1,
                        'is_active' => true
                    ]);

                    $imported++;
                } catch (\Exception $e) {
                    $errors[] = "Ligne " . ($index + 2) . ": " . $e->getMessage();
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "$imported élève(s) importé(s) avec succès",
                'data' => [
                    'imported' => $imported,
                    'errors' => $errors
                ]
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
     * Obtenir les années scolaires disponibles
     */
    public function getSchoolYears()
    {
        try {
            $years = SchoolYear::where('is_active', true)
                ->orderBy('start_date', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $years
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in getSchoolYears: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des années scolaires',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Réorganiser les élèves par drag & drop
     */
    public function reorder(Request $request)
    {
        // Obtenir l'année de travail de l'utilisateur
        $workingYear = $this->getUserWorkingYear();

        if (!$workingYear) {
            return response()->json([
                'success' => false,
                'message' => 'Aucune année scolaire définie'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'students' => 'required|array',
            'students.*.id' => 'required|exists:students,id',
            'students.*.order' => 'required|integer|min:1',
            'class_series_id' => 'required|exists:class_series,id'
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

            foreach ($request->students as $studentData) {
                Student::where('id', $studentData['id'])
                    ->where('class_series_id', $request->class_series_id)
                    ->where('school_year_id', $workingYear->id)
                    ->update(['order' => $studentData['order']]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Ordre des élèves mis à jour avec succès'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la réorganisation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reclasser les élèves par ordre alphabétique
     */
    public function sortAlphabetically(Request $request, $seriesId)
    {
        // Obtenir l'année de travail de l'utilisateur
        $workingYear = $this->getUserWorkingYear();

        if (!$workingYear) {
            return response()->json([
                'success' => false,
                'message' => 'Aucune année scolaire définie'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Récupérer les élèves de la série et année scolaire
            $students = Student::where('class_series_id', $seriesId)
                ->where('school_year_id', $workingYear->id)
                ->where('is_active', true)
                ->orderByRaw('COALESCE(last_name, name) ASC')
                ->orderByRaw('COALESCE(first_name, subname) ASC')
                ->get();

            // Assigner les nouveaux ordres
            foreach ($students as $index => $student) {
                $student->update(['order' => $index + 1]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Élèves reclassés par ordre alphabétique avec succès',
                'data' => $students->load(['schoolYear', 'classSeries'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du reclassement alphabétique',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour uniquement le statut d'un élève
     */
    public function updateStatus(Request $request, Student $student)
    {
        $validator = Validator::make($request->all(), [
            'student_status' => 'required|in:new,old'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $student->update([
                'student_status' => $request->student_status
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Statut mis à jour avec succès',
                'data' => $student->fresh()
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
     * Transférer un élève vers une nouvelle série
     */
    public function transferToSeries(Request $request, Student $student)
    {
        $validator = Validator::make($request->all(), [
            'class_series_id' => 'required|exists:class_series,id'
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

            $newSeriesId = $request->class_series_id;
            $oldSeriesId = $student->class_series_id;

            // Vérifier que la nouvelle série est différente de l'actuelle
            if ($oldSeriesId == $newSeriesId) {
                return response()->json([
                    'success' => false,
                    'message' => 'L\'élève est déjà dans cette série'
                ], 422);
            }

            // Récupérer les informations de la nouvelle série
            $newSeries = ClassSeries::with(['schoolClass', 'schoolClass.level', 'schoolClass.level.section'])
                ->find($newSeriesId);

            if (!$newSeries) {
                return response()->json([
                    'success' => false,
                    'message' => 'Série de destination non trouvée'
                ], 404);
            }

            // Vérifier que la série est active
            if (!$newSeries->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'La série de destination n\'est pas active'
                ], 422);
            }

            // Récupérer les informations de l'ancienne série pour le log
            $oldSeries = null;
            if ($oldSeriesId) {
                $oldSeries = ClassSeries::with(['schoolClass'])->find($oldSeriesId);
            }

            // Déterminer le nouvel ordre dans la série de destination
            $maxOrder = Student::where('class_series_id', $newSeriesId)
                ->where('school_year_id', $student->school_year_id)
                ->max('order') ?? 0;
            $newOrder = $maxOrder + 1;

            // Effectuer le transfert
            $student->update([
                'class_series_id' => $newSeriesId,
                'order' => $newOrder
            ]);

            // Log du transfert
            \Log::info('Student transfer completed', [
                'student_id' => $student->id,
                'student_name' => $student->first_name . ' ' . $student->last_name,
                'from_series' => $oldSeries ? $oldSeries->name : 'Aucune série',
                'from_class' => $oldSeries ? $oldSeries->schoolClass->name : 'Aucune classe',
                'to_series' => $newSeries->name,
                'to_class' => $newSeries->schoolClass->name,
                'new_order' => $newOrder,
                'transferred_by' => Auth::user()->username ?? 'Unknown'
            ]);

            DB::commit();

            // Recharger l'élève avec ses nouvelles relations
            $student = $student->fresh()->load([
                'classSeries',
                'classSeries.schoolClass',
                'classSeries.schoolClass.level',
                'classSeries.schoolClass.level.section',
                'schoolYear'
            ]);

            return response()->json([
                'success' => true,
                'message' => sprintf(
                    'Élève transféré avec succès vers %s - %s',
                    $newSeries->schoolClass->name,
                    $newSeries->name
                ),
                'data' => $student,
                'transfer_info' => [
                    'from' => [
                        'series_name' => $oldSeries ? $oldSeries->name : 'Aucune série',
                        'class_name' => $oldSeries ? $oldSeries->schoolClass->name : 'Aucune classe'
                    ],
                    'to' => [
                        'series_name' => $newSeries->name,
                        'class_name' => $newSeries->schoolClass->name,
                        'section_name' => $newSeries->schoolClass->level->section->name ?? '',
                        'level_name' => $newSeries->schoolClass->level->name ?? ''
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Student transfer failed', [
                'student_id' => $student->id,
                'class_series_id' => $request->class_series_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du transfert de l\'élève',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export students to Excel (global export with filters)
     */
    public function exportStudentsExcel(Request $request)
    {
        try {
            // Obtenir l'année de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $filters = [];
            
            // Appliquer les filtres optionnels
            if ($request->has('class_series_id')) {
                $filters['class_series_id'] = $request->class_series_id;
            }
            
            if ($request->has('section_id')) {
                $filters['section_id'] = $request->section_id;
            }
            
            if ($request->has('level_id')) {
                $filters['level_id'] = $request->level_id;
            }
            
            if ($request->has('is_active')) {
                $filters['is_active'] = $request->boolean('is_active');
            }

            $filename = 'eleves_' . date('Y-m-d_H-i-s') . '.xlsx';
            
            return Excel::download(new StudentsExport($filters, $workingYear->id), $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export Excel',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export students to CSV (global export with filters)
     */
    public function exportStudentsCsv(Request $request)
    {
        try {
            // Obtenir l'année de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $filters = [];
            
            // Appliquer les filtres optionnels
            if ($request->has('class_series_id')) {
                $filters['class_series_id'] = $request->class_series_id;
            }
            
            if ($request->has('section_id')) {
                $filters['section_id'] = $request->section_id;
            }
            
            if ($request->has('level_id')) {
                $filters['level_id'] = $request->level_id;
            }
            
            if ($request->has('is_active')) {
                $filters['is_active'] = $request->boolean('is_active');
            }

            $filename = 'eleves_' . date('Y-m-d_H-i-s') . '.csv';
            
            return Excel::download(new StudentsExport($filters, $workingYear->id), $filename, \Maatwebsite\Excel\Excel::CSV);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export students to Excel (by series - legacy method)
     */
    public function exportExcel($seriesId)
    {
        try {
            // Utiliser l'année de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $filters = ['class_series_id' => $seriesId];
            $filename = 'eleves_' . date('Y-m-d_H-i-s') . '.xlsx';
            
            return Excel::download(new StudentsExport($filters, $workingYear->id), $filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export Excel',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import students for a specific series
     */
    public function importForSeries(Request $request, $seriesId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|max:2048'
            ]);
            
            // Validation supplémentaire pour l'extension
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $extension = strtolower($file->getClientOriginalExtension());
                if (!in_array($extension, ['xlsx', 'xls', 'csv'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Format de fichier non supporté. Utilisez xlsx, xls ou csv.',
                        'errors' => ['file' => ['Le fichier doit être au format xlsx, xls ou csv.']]
                    ], 422);
                }
            }

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fichier invalide',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Vérifier que la série existe
            $classSeries = ClassSeries::find($seriesId);
            if (!$classSeries) {
                return response()->json([
                    'success' => false,
                    'message' => 'Série de classe non trouvée'
                ], 404);
            }

            // Obtenir l'année de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $import = new StudentsImport($workingYear->id, $seriesId);
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
     * Import students CSV for a specific series
     */
    public function importCsvForSeries(Request $request, $seriesId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'file' => 'required|file|max:2048'
            ]);
            
            // Validation supplémentaire pour l'extension CSV
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $extension = strtolower($file->getClientOriginalExtension());
                if (!in_array($extension, ['csv', 'txt'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Format de fichier non supporté. Utilisez csv ou txt.',
                        'errors' => ['file' => ['Le fichier doit être au format csv ou txt.']]
                    ], 422);
                }
            }

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fichier invalide',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Vérifier que la série existe
            $classSeries = ClassSeries::find($seriesId);
            if (!$classSeries) {
                return response()->json([
                    'success' => false,
                    'message' => 'Série de classe non trouvée'
                ], 404);
            }

            // Obtenir l'année de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $import = new StudentsImport($workingYear->id, $seriesId);
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
     * Import students from Excel
     */
    public function importExcel(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'file' => 'required|mimes:xlsx,xls,csv|max:2048',
                'class_series_id' => 'nullable|exists:class_series,id'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fichier invalide',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Obtenir l'année de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $classSeriesId = $request->class_series_id;
            
            // Si pas de class_series_id fourni, essayer de le détecter automatiquement
            if (!$classSeriesId) {
                $classSeriesId = $this->detectSeriesFromContext($request);
            }
            
            if (!$classSeriesId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune série spécifiée. Utilisez la route /api/students/series/{seriesId}/import ou spécifiez class_series_id.',
                    'help' => 'Nouvelles routes recommandées: POST /api/students/series/{seriesId}/import'
                ], 400);
            }

            $import = new StudentsImport($workingYear->id, $classSeriesId);
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
     * Export students in importable CSV format
     */
    public function exportImportable(Request $request)
    {
        try {
            // Obtenir l'année de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $filters = [];
            
            // Appliquer les filtres optionnels
            if ($request->has('class_series_id')) {
                $filters['class_series_id'] = $request->class_series_id;
            }
            
            if ($request->has('section_id')) {
                $filters['section_id'] = $request->section_id;
            }
            
            if ($request->has('level_id')) {
                $filters['level_id'] = $request->level_id;
            }
            
            if ($request->has('is_active')) {
                $filters['is_active'] = $request->boolean('is_active');
            }

            $filename = 'eleves_importable_' . date('Y-m-d_H-i-s') . '.csv';
            return Excel::download(new StudentsImportableExport($filters, $workingYear->id), $filename, \Maatwebsite\Excel\Excel::CSV);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV importable',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export students to PDF
     */
    public function exportStudentsPdf(Request $request)
    {
        try {
            // Obtenir l'année de travail de l'utilisateur
            $workingYear = $this->getUserWorkingYear();

            if (!$workingYear) {
                return response()->json([
                    'success' => false,
                    'message' => 'Aucune année scolaire définie'
                ], 400);
            }

            $filters = [];
            
            // Appliquer les filtres optionnels
            if ($request->has('class_series_id')) {
                $filters['class_series_id'] = $request->class_series_id;
            }
            
            if ($request->has('section_id')) {
                $filters['section_id'] = $request->section_id;
            }
            
            if ($request->has('level_id')) {
                $filters['level_id'] = $request->level_id;
            }
            
            if ($request->has('is_active')) {
                $filters['is_active'] = $request->boolean('is_active');
            }

            $filename = 'eleves_' . date('Y-m-d_H-i-s') . '.pdf';
            return Excel::download(new StudentsExport($filters, $workingYear->id), $filename, \Maatwebsite\Excel\Excel::DOMPDF);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Detect class series ID from request context
     */
    private function detectSeriesFromContext(Request $request)
    {
        // 1. Vérifier dans les headers personnalisés
        if ($request->hasHeader('X-Class-Series-ID')) {
            return $request->header('X-Class-Series-ID');
        }
        
        // 2. Vérifier dans le referer URL
        $referer = $request->header('referer');
        if ($referer) {
            // Chercher des patterns comme /series/123, /class-series/123, /students/series/123, etc.
            $patterns = [
                '/(?:students\/)?series\/(\d+)/',           // /series/123 ou /students/series/123
                '/(?:students\/)?class-series\/(\d+)/',     // /class-series/123 ou /students/class-series/123
                '/seriesId[=:](\d+)/',                      // seriesId=123 ou seriesId:123
                '/class_series_id[=:](\d+)/'                // class_series_id=123 ou class_series_id:123
            ];
            
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $referer, $matches)) {
                    return (int) $matches[1];
                }
            }
        }
        
        // 3. Vérifier dans les paramètres d'URL cachés
        if ($request->has('series_id')) {
            return $request->get('series_id');
        }
        
        // 4. Vérifier dans le contexte de session (si disponible)
        try {
            if ($request->hasSession() && $request->session()->has('current_series_id')) {
                return $request->session()->get('current_series_id');
            }
        } catch (\Exception $e) {
            // Ignorer silencieusement les erreurs de session
        }
        
        return null;
    }

    /**
     * Download CSV template for students import
     */
    public function downloadTemplate()
    {
        try {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="template_eleves.csv"'
            ];

            $csvData = "id,nom,prenom,date_naissance,lieu_naissance,sexe,nom_parent,telephone_parent,email_parent,adresse,statut_etudiant,statut\n";
            $csvData .= ",DUPONT,Jean,01/01/2010,Douala,M,Marie DUPONT,123456789,marie@example.com,Douala,nouveau,1\n";
            $csvData .= ",MARTIN,Sophie,15/06/2009,Yaoundé,F,Paul MARTIN,987654321,paul@example.com,Yaoundé,ancien,1\n";
            $csvData .= "123,BERNARD,Alice,12/03/2009,Douala,F,Pierre BERNARD,654321987,pierre@example.com,Douala,ancien,0\n";

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
     * Upload en lot de photos d'étudiants
     * Les photos doivent être nommées avec le matricule de l'étudiant
     */
    public function bulkUploadPhotos(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'photos' => 'required|array',
                'photos.*' => 'required|file|image|mimes:jpeg,jpg,png,gif|max:5120', // 5MB max par photo
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fichiers invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $photos = $request->file('photos');
            $results = [
                'total' => count($photos),
                'success' => 0,
                'errors' => 0,
                'details' => []
            ];

            foreach ($photos as $photo) {
                $originalName = $photo->getClientOriginalName();
                $filename = pathinfo($originalName, PATHINFO_FILENAME); // Nom sans extension
                
                // Extraire le matricule du nom du fichier
                // Supporte différents formats: 20240008.jpg, 25A00014.png, student_20240008.png, etc.
                preg_match('/([0-9]{2}[A-Z]?[0-9]{5,}|\d{8,})/', $filename, $matches);
                
                if (!empty($matches[1])) {
                    $studentNumber = $matches[1];
                    
                    // Rechercher l'étudiant par matricule
                    $student = Student::where('student_number', $studentNumber)->first();
                    
                    if ($student) {
                        // Supprimer l'ancienne photo si elle existe
                        if ($student->photo && Storage::disk('public')->exists($student->photo)) {
                            Storage::disk('public')->delete($student->photo);
                        }
                        
                        // Uploader la nouvelle photo
                        $photoPath = $this->handlePhotoUpload($photo, $studentNumber);
                        
                        if ($photoPath) {
                            $student->photo = $photoPath;
                            $student->save();
                            
                            $results['success']++;
                            $results['details'][] = [
                                'file' => $originalName,
                                'student_number' => $studentNumber,
                                'student_name' => $student->name,
                                'status' => 'success',
                                'message' => 'Photo mise à jour avec succès'
                            ];
                        } else {
                            $results['errors']++;
                            $results['details'][] = [
                                'file' => $originalName,
                                'student_number' => $studentNumber,
                                'status' => 'error',
                                'message' => 'Erreur lors de l\'upload de la photo'
                            ];
                        }
                    } else {
                        $results['errors']++;
                        $results['details'][] = [
                            'file' => $originalName,
                            'student_number' => $studentNumber,
                            'status' => 'error',
                            'message' => 'Étudiant non trouvé avec ce matricule'
                        ];
                    }
                } else {
                    $results['errors']++;
                    $results['details'][] = [
                        'file' => $originalName,
                        'student_number' => null,
                        'status' => 'error',
                        'message' => 'Matricule non détecté dans le nom du fichier'
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Upload terminé: {$results['success']} succès, {$results['errors']} erreurs",
                'data' => $results
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'upload en lot',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
