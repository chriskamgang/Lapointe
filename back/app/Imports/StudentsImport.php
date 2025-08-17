<?php

namespace App\Imports;

use App\Models\Student;
use App\Models\ClassSeries;
use App\Models\SchoolYear;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class StudentsImport implements ToCollection, WithHeadingRow
{
    protected $results = [
        'created' => 0,
        'updated' => 0,
        'errors' => []
    ];

    protected $schoolYearId;
    protected $classSeriesId;

    public function __construct($schoolYearId = null, $classSeriesId = null)
    {
        $this->schoolYearId = $schoolYearId;
        $this->classSeriesId = $classSeriesId;
    }

    public function collection(Collection $rows)
    {
        // Obtenir l'année scolaire par défaut si non fournie
        if (!$this->schoolYearId) {
            $user = Auth::user();
            if ($user && $user->working_school_year_id) {
                $workingYear = SchoolYear::find($user->working_school_year_id);
                if ($workingYear && $workingYear->is_active) {
                    $this->schoolYearId = $workingYear->id;
                }
            }
            
            if (!$this->schoolYearId) {
                $currentYear = SchoolYear::where('is_current', true)->first();
                if (!$currentYear) {
                    $currentYear = SchoolYear::where('is_active', true)->first();
                }
                $this->schoolYearId = $currentYear ? $currentYear->id : null;
            }
        }

        foreach ($rows as $index => $row) {
            try {
                $rowData = is_array($row) ? $row : $row->toArray();
                // Nettoyer et convertir les données appropriées
                foreach ($rowData as $key => $value) {
                    if ($value === '' || $value === null) {
                        $rowData[$key] = null;
                    } elseif ($key === 'id' || $key === 'statut') {
                        // Garder les entiers pour id et statut
                        $rowData[$key] = $value;
                    } else {
                        // Convertir en string pour les autres champs
                        $rowData[$key] = (string) $value;
                    }
                }

                $validator = Validator::make($rowData, [
                    'id' => 'nullable|integer',
                    'nom' => 'required|string|max:255',
                    'prenom' => 'required|string|max:255',
                    'date_naissance' => 'nullable|string',
                    'lieu_naissance' => 'nullable|string|max:255',
                    'sexe' => 'nullable|in:M,F,Masculin,Féminin,m,f,masculin,féminin',
                    'nom_parent' => 'nullable|string|max:255',
                    'telephone_parent' => 'nullable|string|max:20',
                    'email_parent' => 'nullable|email|max:255',
                    'adresse' => 'nullable|string|max:500',
                    'statut_etudiant' => 'nullable|in:nouveau,ancien,new,old,Nouveau,Ancien',
                    'statut' => 'nullable|in:0,1'
                ]);

                if ($validator->fails()) {
                    $this->results['errors'][] = [
                        'line' => $index + 2,
                        'errors' => $validator->errors()->toArray()
                    ];
                    continue;
                }

                // Traitement des données
                $data = [
                    'last_name' => trim($rowData['nom'] ?? ''),
                    'first_name' => trim($rowData['prenom'] ?? ''),
                    'name' => trim($rowData['nom'] ?? '') . ' ' . trim($rowData['prenom'] ?? ''),
                    'place_of_birth' => trim($rowData['lieu_naissance'] ?? ''),
                    'parent_name' => trim($rowData['nom_parent'] ?? ''),
                    'parent_phone' => trim($rowData['telephone_parent'] ?? ''),
                    'parent_email' => trim($rowData['email_parent'] ?? ''),
                    'address' => trim($rowData['adresse'] ?? ''),
                    'is_active' => $this->parseStatus($rowData['statut'] ?? 1),
                    'school_year_id' => $this->schoolYearId
                ];

                // Traitement de la date de naissance
                if (!empty($rowData['date_naissance'])) {
                    $dateOfBirth = $this->parseDate($rowData['date_naissance']);
                    if ($dateOfBirth) {
                        $data['date_of_birth'] = $dateOfBirth;
                    }
                }

                // Traitement du sexe
                if (!empty($rowData['sexe'])) {
                    $data['gender'] = $this->parseGender($rowData['sexe']);
                }

                // Traitement du statut étudiant
                if (!empty($rowData['statut_etudiant'])) {
                    $data['student_status'] = $this->parseStudentStatus($rowData['statut_etudiant']);
                }

                // La série de classe est obligatoirement celle passée au constructeur
                if (!$this->classSeriesId) {
                    $this->results['errors'][] = [
                        'line' => $index + 2,
                        'errors' => ['Série de classe non spécifiée dans l\'import']
                    ];
                    continue;
                }

                $data['class_series_id'] = $this->classSeriesId;

                $existingStudent = null;

                // Si un ID est fourni, chercher par ID pour modification
                if (!empty($rowData['id'])) {
                    $existingStudent = Student::find($rowData['id']);
                    
                    if ($existingStudent) {
                        // Vérifier que l'étudiant appartient à la bonne année scolaire
                        if ($existingStudent->school_year_id != $this->schoolYearId) {
                            $this->results['errors'][] = [
                                'line' => $index + 2,
                                'errors' => ['L\'étudiant avec l\'ID ' . $rowData['id'] . ' n\'appartient pas à l\'année scolaire courante']
                            ];
                            continue;
                        }
                        
                        $existingStudent->update($data);
                        $this->results['updated']++;
                    } else {
                        $this->results['errors'][] = [
                            'line' => $index + 2,
                            'errors' => ['Étudiant avec l\'ID ' . $rowData['id'] . ' non trouvé']
                        ];
                        continue;
                    }
                } else {
                    // Pas d'ID fourni, créer un nouvel étudiant
                    $this->createNewStudent($data);
                }

            } catch (\Exception $e) {
                $this->results['errors'][] = [
                    'line' => $index + 2,
                    'errors' => ['Erreur lors du traitement: ' . $e->getMessage()]
                ];
            }
        }
    }

    private function createNewStudent($data)
    {
        // Générer automatiquement un numéro d'étudiant
        $schoolYear = SchoolYear::find($this->schoolYearId);
        $data['student_number'] = Student::generateStudentNumber(
            $schoolYear->start_date,
            $data['class_series_id']
        );

        // Calculer l'ordre
        $maxOrder = Student::where('class_series_id', $data['class_series_id'])
            ->where('school_year_id', $this->schoolYearId)
            ->max('order') ?: 0;
        $data['order'] = $maxOrder + 1;

        Student::create($data);
        $this->results['created']++;
    }

    private function parseDate($dateString)
    {
        if (empty($dateString)) {
            return null;
        }

        $dateStr = trim($dateString);
        $formats = ['d/m/Y', 'Y-m-d', 'd-m-Y', 'd.m.Y', 'm/d/Y'];
        
        foreach ($formats as $format) {
            $dateObj = \DateTime::createFromFormat($format, $dateStr);
            if ($dateObj && $dateObj->format($format) === $dateStr) {
                return $dateObj->format('Y-m-d');
            }
        }
        
        return null;
    }

    private function parseGender($gender)
    {
        if (empty($gender)) {
            return 'M';
        }

        $genderLower = strtolower(trim($gender));
        
        if (in_array($genderLower, ['f', 'féminin', 'feminin', 'femme'])) {
            return 'F';
        }
        
        return 'M';
    }

    private function parseStudentStatus($status)
    {
        if (empty($status)) {
            return 'new';
        }

        $statusLower = strtolower(trim($status));
        
        if (in_array($statusLower, ['ancien', 'old'])) {
            return 'old';
        }
        
        return 'new';
    }

    private function parseStatus($status)
    {
        // Accepter seulement 0 ou 1
        if ($status === '1' || $status === 1) {
            return true;
        }
        
        if ($status === '0' || $status === 0) {
            return false;
        }
        
        // Par défaut, actif
        return true;
    }

    public function getResults()
    {
        return $this->results;
    }
}