<?php

namespace App\Exports;

use App\Models\Level;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LevelsImportableExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    protected $sectionId;

    public function __construct($sectionId = null)
    {
        $this->sectionId = $sectionId;
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        $query = Level::with(['section']);
        
        if ($this->sectionId) {
            $query->where('section_id', $this->sectionId);
            // Si la section n'a pas de niveaux, retourner tous les niveaux
            $filteredLevels = $query->get();
            if ($filteredLevels->isEmpty()) {
                return Level::with(['section'])->orderBy('name')->get();
            }
            return $filteredLevels;
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
            'section_id',
            'description',
            'statut'
        ];
    }

    /**
     * @var Level $level
     */
    public function map($level): array
    {
        return [
            $level->id,
            $level->name,
            $level->section_id,
            $level->description ?? '',
            $level->is_active ? 1 : 0
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
                    'startColor' => ['argb' => '50C878']
                ]
            ]
        ];
    }
}