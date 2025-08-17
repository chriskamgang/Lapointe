<?php

namespace App\Exports;

use App\Models\ClassSeries;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SeriesImportableExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
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
        $query = ClassSeries::with(['schoolClass.level.section']);
        
        if (!empty($this->filters['class_id'])) {
            $query->where('class_id', $this->filters['class_id']);
        }
        
        if (!empty($this->filters['section_id'])) {
            $query->whereHas('schoolClass.level.section', function($q) {
                $q->where('id', $this->filters['section_id']);
            });
        }
        
        return $query->orderBy('name')->get();
    }

    /**
     * @return array
     */
    public function headings(): array
    {
        return [
            'id',
            'nom',
            'code',
            'classe',
            'niveau',
            'section',
            'capacite',
            'statut'
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
            $series->code ?? '',
            $series->schoolClass->name ?? '',
            $series->schoolClass->level->name ?? '',
            $series->schoolClass->level->section->name ?? '',
            $series->capacity ?? '',
            $series->is_active ? 'actif' : 'inactif'
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
                    'startColor' => ['argb' => 'FF6B35']
                ]
            ]
        ];
    }
}