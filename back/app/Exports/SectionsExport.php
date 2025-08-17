<?php

namespace App\Exports;

use App\Models\Section;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SectionsExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        return Section::with(['classes'])
            ->orderBy('name')
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
            'description',
            'nombre_classes',
            'statut',
            'date_creation',
            'date_modification'
        ];
    }

    /**
     * @var Section $section
     */
    public function map($section): array
    {
        return [
            $section->id,
            $section->name,
            $section->description ?? 'N/A',
            $section->classes->count(),
            $section->is_active ? 'Actif' : 'Inactif',
            $section->created_at->format('d/m/Y H:i'),
            $section->updated_at->format('d/m/Y H:i')
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
                    'startColor' => ['argb' => '4A90E2']
                ]
            ]
        ];
    }
}