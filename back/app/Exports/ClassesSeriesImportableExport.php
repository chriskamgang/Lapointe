<?php

namespace App\Exports;

use App\Models\SchoolClass;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ClassesSeriesImportableExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
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
        $query = SchoolClass::with(['level.section', 'series']);
        
        if (!empty($this->filters['section_id'])) {
            $query->whereHas('level.section', function($q) {
                $q->where('id', $this->filters['section_id']);
            });
        }
        
        if (!empty($this->filters['level_id'])) {
            $query->where('level_id', $this->filters['level_id']);
        }
        
        $results = $query->orderBy('name')->get();
        
        // Si aucun résultat avec les filtres, retourner toutes les classes
        if ($results->isEmpty() && (!empty($this->filters['section_id']) || !empty($this->filters['level_id']))) {
            return SchoolClass::with(['level.section', 'series'])->orderBy('name')->get();
        }
        
        return $results;
    }

    /**
     * @return array
     */
    public function headings(): array
    {
        return [
            'class_id',
            'class_nom',
            'level_id',
            'class_description',
            'class_statut',
            'series'
        ];
    }

    /**
     * @var SchoolClass $schoolClass
     */
    public function map($schoolClass): array
    {
        // Construire la chaîne des séries: id:nom:code:capacité:statut|...
        $seriesString = '';
        if ($schoolClass->series->isNotEmpty()) {
            $seriesParts = [];
            foreach ($schoolClass->series as $serie) {
                $seriesParts[] = implode(':', [
                    $serie->id,
                    $serie->name,
                    $serie->code ?? '',
                    $serie->capacity ?? '',
                    $serie->is_active ? 1 : 0
                ]);
            }
            $seriesString = implode('|', $seriesParts);
        }

        return [
            $schoolClass->id,
            $schoolClass->name,
            $schoolClass->level_id,
            $schoolClass->description ?? '',
            $schoolClass->is_active ? 1 : 0,
            $seriesString
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
                    'startColor' => ['argb' => 'FF8C00']
                ]
            ]
        ];
    }
}