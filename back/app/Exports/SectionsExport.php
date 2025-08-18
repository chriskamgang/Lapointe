<?php

namespace App\Exports;

use App\Models\School;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SchoolsExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        return School::with(['classes'])
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
     * @var School $school
     */
    public function map($school): array
    {
        return [
            $school->id,
            $school->name,
            $school->description ?? 'N/A',
            $school->classes->count(),
            $school->is_active ? 'Actif' : 'Inactif',
            $school->created_at->format('d/m/Y H:i'),
            $school->updated_at->format('d/m/Y H:i')
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