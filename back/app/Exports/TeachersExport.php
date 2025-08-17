<?php

namespace App\Exports;

use App\Models\Teacher;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TeachersExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        return Teacher::with(['user', 'mainClasses'])
            ->orderBy('last_name')
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
            'nom_complet',
            'telephone',
            'email',
            'adresse',
            'date_naissance',
            'sexe',
            'qualification',
            'date_embauche',
            'compte_utilisateur',
            'nom_utilisateur',
            'classes_principales',
            'statut',
            'date_creation',
            'date_modification'
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
            $teacher->full_name,
            $teacher->phone_number,
            $teacher->email ?? 'N/A',
            $teacher->address ?? 'N/A',
            $teacher->date_of_birth ? $teacher->date_of_birth->format('d/m/Y') : 'N/A',
            $teacher->gender === 'm' ? 'Masculin' : ($teacher->gender === 'f' ? 'Féminin' : 'N/A'),
            $teacher->qualification ?? 'N/A',
            $teacher->hire_date ? $teacher->hire_date->format('d/m/Y') : 'N/A',
            $teacher->user ? 'Oui' : 'Non',
            $teacher->user?->username ?? 'N/A',
            $teacher->mainClasses->count() > 0 ? $teacher->mainClasses->pluck('name')->join(', ') : 'Aucune',
            $teacher->is_active ? 'Actif' : 'Inactif',
            $teacher->created_at->format('d/m/Y H:i'),
            $teacher->updated_at->format('d/m/Y H:i')
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