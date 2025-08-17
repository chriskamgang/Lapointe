<?php

namespace App\Exports;

use App\Models\ClassSeries;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ClassSeriesExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    protected $filters;

    public function __construct($filters = [])
    {
        $this->filters = $filters;
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        $query = ClassSeries::with(['schoolClass.section', 'schoolClass.level', 'students', 'mainTeacher']);
        
        if (!empty($this->filters['section_id'])) {
            $query->whereHas('schoolClass', function($q) {
                $q->where('section_id', $this->filters['section_id']);
            });
        }
        
        if (!empty($this->filters['level_id'])) {
            $query->whereHas('schoolClass', function($q) {
                $q->where('level_id', $this->filters['level_id']);
            });
        }
        
        if (!empty($this->filters['class_id'])) {
            $query->where('class_id', $this->filters['class_id']);
        }
        
        return $query->orderBy('name')->get();
    }

    /**
     * @return array
     */
    public function headings(): array
    {
        return [
            'ID',
            'Nom',
            'Classe',
            'Section',
            'Niveau',
            'Nombre d\'Élèves',
            'Professeur Principal',
            'Capacité Max',
            'Statut',
            'Date de Création'
        ];
    }

    /**
     * @var ClassSeries $series
     */
    public function map($series): array
    {
        return [
            $series->id,
            $series->name,
            $series->schoolClass->name ?? 'N/A',
            $series->schoolClass->section->name ?? 'N/A',
            $series->schoolClass->level->name ?? 'N/A',
            $series->students->count(),
            $series->mainTeacher->teacher->name ?? 'Non assigné',
            $series->max_capacity ?? 'N/A',
            $series->is_active ? 'Actif' : 'Inactif',
            $series->created_at->format('d/m/Y H:i')
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
                    'startColor' => ['argb' => '9B59B6']
                ]
            ]
        ];
    }
}