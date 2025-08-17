<?php

namespace App\Exports;

use App\Models\SchoolClass;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SchoolClassesExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
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
            $query->whereHas('level', function($q) {
                $q->where('section_id', $this->filters['section_id']);
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
            'ID',
            'Nom',
            'Section',
            'Niveau',
            'Description',
            'Nombre de Séries',
            'Statut',
            'Date de Création',
            'Dernière Mise à Jour'
        ];
    }

    /**
     * @var SchoolClass $schoolClass
     */
    public function map($schoolClass): array
    {
        return [
            $schoolClass->id,
            $schoolClass->name,
            $schoolClass->level->section->name ?? 'N/A',
            $schoolClass->level->name ?? 'N/A',
            $schoolClass->description ?? 'N/A',
            $schoolClass->series ? $schoolClass->series->count() : 0,
            $schoolClass->is_active ? 'Actif' : 'Inactif',
            $schoolClass->created_at->format('d/m/Y H:i'),
            $schoolClass->updated_at->format('d/m/Y H:i')
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