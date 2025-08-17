<?php

namespace App\Exports;

use App\Models\Student;
use App\Models\SchoolYear;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class StudentsExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    protected $filters;
    protected $schoolYearId;

    public function __construct($filters = [], $schoolYearId = null)
    {
        $this->filters = $filters;
        $this->schoolYearId = $schoolYearId;
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        $query = Student::with([
            'classSeries',
            'classSeries.schoolClass',
            'classSeries.schoolClass.level', 
            'classSeries.schoolClass.level.section',
            'schoolYear'
        ]);
        
        // Filtrer par année scolaire
        if ($this->schoolYearId) {
            $query->where('school_year_id', $this->schoolYearId);
        }
        
        // Filtres supplémentaires
        if (!empty($this->filters['class_series_id'])) {
            $query->where('class_series_id', $this->filters['class_series_id']);
        }
        
        if (!empty($this->filters['section_id'])) {
            $query->whereHas('classSeries.schoolClass.level', function($q) {
                $q->where('section_id', $this->filters['section_id']);
            });
        }
        
        if (!empty($this->filters['level_id'])) {
            $query->whereHas('classSeries.schoolClass.level', function($q) {
                $q->where('id', $this->filters['level_id']);
            });
        }
        
        if (isset($this->filters['is_active'])) {
            $query->where('is_active', $this->filters['is_active']);
        }
        
        return $query->orderBy('last_name')
                    ->orderBy('first_name')
                    ->get();
    }

    /**
     * @return array
     */
    public function headings(): array
    {
        return [
            'Numéro Étudiant',
            'Nom',
            'Prénom',
            'Date de Naissance',
            'Lieu de Naissance',
            'Sexe',
            'Nom du Parent',
            'Téléphone Parent',
            'Email Parent',
            'Adresse',
            'Série',
            'Classe',
            'Section',
            'Niveau',
            'Année Scolaire',
            'Statut Étudiant',
            'Statut',
            'Date d\'Inscription'
        ];
    }

    /**
     * @var Student $student
     */
    public function map($student): array
    {
        return [
            $student->student_number ?? 'N/A',
            $student->last_name ?? $student->subname ?? 'N/A',
            $student->first_name ?? $student->name ?? 'N/A',
            $student->date_of_birth ? $student->date_of_birth->format('d/m/Y') : ($student->birthday ? $student->birthday->format('d/m/Y') : 'N/A'),
            $student->place_of_birth ?? $student->birthday_place ?? 'N/A',
            $student->gender ?? $student->sex ?? 'N/A',
            $student->parent_name ?? $student->father_name ?? 'N/A',
            $student->parent_phone ?? $student->phone_number ?? 'N/A',
            $student->parent_email ?? $student->email ?? 'N/A',
            $student->address ?? 'N/A',
            $student->classSeries ? $student->classSeries->name : 'N/A',
            $student->classSeries && $student->classSeries->schoolClass ? $student->classSeries->schoolClass->name : 'N/A',
            $student->classSeries && $student->classSeries->schoolClass && $student->classSeries->schoolClass->level && $student->classSeries->schoolClass->level->section ? $student->classSeries->schoolClass->level->section->name : 'N/A',
            $student->classSeries && $student->classSeries->schoolClass && $student->classSeries->schoolClass->level ? $student->classSeries->schoolClass->level->name : 'N/A',
            $student->schoolYear ? $student->schoolYear->name : 'N/A',
            $student->student_status ?? ($student->is_new ? 'Nouveau' : 'Ancien'),
            $student->is_active ? 'Actif' : 'Inactif',
            $student->created_at ? $student->created_at->format('d/m/Y H:i') : 'N/A'
        ];
    }

    /**
     * @param Worksheet $sheet
     * @return array
     */
    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => [
                    'bold' => true,
                    'color' => ['argb' => 'FFFFFF']
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'E74C3C']
                ]
            ]
        ];
    }
}