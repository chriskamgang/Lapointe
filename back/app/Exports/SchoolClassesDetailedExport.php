<?php

namespace App\Exports;

use App\Models\SchoolClass;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;

class SchoolClassesDetailedExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize, WithEvents
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
        
        $classes = $query->orderBy('name')->limit(50)->get(); // Limiter à 50 classes pour éviter les timeouts
        
        // Si aucun résultat avec les filtres, retourner les premières classes
        if ($classes->isEmpty() && (!empty($this->filters['section_id']) || !empty($this->filters['level_id']))) {
            $classes = SchoolClass::with(['level.section', 'series'])->orderBy('name')->limit(50)->get();
        }
        
        // Transformer pour avoir une ligne par série
        $detailedRows = collect();
        
        foreach ($classes as $class) {
            if ($class->series->isNotEmpty()) {
                foreach ($class->series as $serie) {
                    $detailedRows->push((object)[
                        'class_id' => $class->id,
                        'class_name' => $class->name,
                        'section_name' => $class->level->section->name ?? 'N/A',
                        'level_name' => $class->level->name ?? 'N/A',
                        'class_description' => $class->description,
                        'class_status' => $class->is_active,
                        'class_created_at' => $class->created_at,
                        'class_updated_at' => $class->updated_at,
                        'serie_id' => $serie->id,
                        'serie_name' => $serie->name,
                        'serie_code' => $serie->code,
                        'serie_capacity' => $serie->capacity,
                        'serie_status' => $serie->is_active
                    ]);
                }
            } else {
                // Classe sans série
                $detailedRows->push((object)[
                    'class_id' => $class->id,
                    'class_name' => $class->name,
                    'section_name' => $class->level->section->name ?? 'N/A',
                    'level_name' => $class->level->name ?? 'N/A',
                    'class_description' => $class->description,
                    'class_status' => $class->is_active,
                    'class_created_at' => $class->created_at,
                    'class_updated_at' => $class->updated_at,
                    'serie_id' => null,
                    'serie_name' => 'Aucune série',
                    'serie_code' => '-',
                    'serie_capacity' => '-',
                    'serie_status' => '-'
                ]);
            }
        }
        
        return $detailedRows;
    }

    /**
     * @return array
     */
    public function headings(): array
    {
        return [
            'ID Classe',
            'Nom de la Classe',
            'Section',
            'Niveau',
            'Description Classe',
            'Statut Classe',
            'ID Série',
            'Nom de la Série',
            'Code Série',
            'Capacité',
            'Statut Série',
            'Date de Création',
            'Dernière Mise à Jour'
        ];
    }

    /**
     * @param $row
     */
    public function map($row): array
    {
        return [
            $row->class_id,
            $row->class_name,
            $row->section_name,
            $row->level_name,
            $row->class_description ?? '-',
            $row->class_status ? 'Actif' : 'Inactif',
            $row->serie_id ?? '-',
            $row->serie_name,
            $row->serie_code ?? '-',
            $row->serie_capacity ?? '-',
            is_bool($row->serie_status) ? ($row->serie_status ? 'Actif' : 'Inactif') : $row->serie_status,
            $row->class_created_at ? $row->class_created_at->format('d/m/Y H:i') : '-',
            $row->class_updated_at ? $row->class_updated_at->format('d/m/Y H:i') : '-'
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
                    'size' => 12
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E8F4FD']
                ]
            ]
        ];
    }

    /**
     * Configure les événements pour l'orientation paysage
     */
    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                // Configuration simple de l'orientation paysage
                $event->sheet->getPageSetup()->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
            },
        ];
    }
}