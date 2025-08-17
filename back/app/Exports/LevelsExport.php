<?php

namespace App\Exports;

use App\Models\Level;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class LevelsExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
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
        $query = Level::with(['section', 'schoolClasses']);
        
        if ($this->sectionId) {
            $query->where('section_id', $this->sectionId);
            // Si la section n'a pas de niveaux, retourner tous les niveaux
            $filteredLevels = $query->get();
            if ($filteredLevels->isEmpty()) {
                return Level::with(['section', 'schoolClasses'])->orderBy('name')->get();
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
            'ID',
            'Nom',
            'Section',
            'Description',
            'Nombre de Classes',
            'Statut',
            'Date de Création',
            'Dernière Mise à Jour'
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
            $level->section->name ?? 'N/A',
            $level->description ?? 'N/A',
            $level->schoolClasses->count(),
            $level->is_active ? 'Actif' : 'Inactif',
            $level->created_at->format('d/m/Y H:i'),
            $level->updated_at->format('d/m/Y H:i')
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