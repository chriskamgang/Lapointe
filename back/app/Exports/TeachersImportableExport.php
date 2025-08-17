<?php

namespace App\Exports;

use App\Models\Teacher;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TeachersImportableExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        return Teacher::orderBy('last_name')
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
            'telephone',
            'email',
            'adresse',
            'date_naissance',
            'sexe',
            'qualification',
            'date_embauche',
            'statut'
        ];
    }

    /**
     * @var Teacher $teacher
     */
    public function map($teacher): array
    {
        return [
            $teacher->id,
            $teacher->last_name,
            $teacher->first_name,
            $teacher->phone_number,
            $teacher->email ?? '',
            $teacher->address ?? '',
            $teacher->date_of_birth ? $teacher->date_of_birth->format('d/m/Y') : '',
            $teacher->gender ?? '',
            $teacher->qualification ?? '',
            $teacher->hire_date ? $teacher->hire_date->format('d/m/Y') : '',
            $teacher->is_active ? 1 : 0
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