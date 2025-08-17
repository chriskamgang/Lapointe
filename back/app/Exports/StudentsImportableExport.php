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

class StudentsImportableExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
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
            'id',
            'nom',
            'prenom',
            'date_naissance',
            'lieu_naissance',
            'sexe',
            'nom_parent',
            'telephone_parent',
            'email_parent',
            'adresse',
            'statut_etudiant',
            'statut'
        ];
    }

    /**
     * @var Student $student
     */
    public function map($student): array
    {
        return [
            $student->id,
            $student->last_name ?? $student->subname ?? '',
            $student->first_name ?? $student->name ?? '',
            $student->date_of_birth ? $student->date_of_birth->format('d/m/Y') : ($student->birthday ? $student->birthday->format('d/m/Y') : ''),
            $student->place_of_birth ?? $student->birthday_place ?? '',
            $student->gender ?? $student->sex ?? 'M',
            $student->parent_name ?? $student->father_name ?? '',
            $student->parent_phone ?? $student->phone_number ?? '',
            $student->parent_email ?? $student->email ?? '',
            $student->address ?? '',
            $student->student_status ?? ($student->is_new ? 'nouveau' : 'ancien'),
            $student->is_active ? '1' : '0'
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
                    'startColor' => ['argb' => '27AE60']
                ]
            ]
        ];
    }
}