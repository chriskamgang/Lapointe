<?php

namespace App\Imports;

use App\Models\ClassSeries;
use App\Models\SchoolClass;
use App\Models\Level;
use App\Models\Section;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class SeriesImport implements ToCollection, WithHeadingRow
{
    protected $results = [
        'created' => 0,
        'updated' => 0,
        'errors' => []
    ];

    public function collection(Collection $rows)
    {
        foreach ($rows as $index => $row) {
            try {
                $validator = Validator::make($row->toArray(), [
                    'id' => 'nullable|integer|exists:class_series,id',
                    'nom' => 'required|string|max:255',
                    'code' => 'nullable|string|max:10',
                    'classe' => 'required|string|max:255',
                    'niveau' => 'required|string|max:255',
                    'section' => 'required|string|max:255',
                    'capacite' => 'nullable|integer|min:1|max:200',
                    'statut' => 'nullable|string|in:actif,inactif,Actif,Inactif,ACTIF,INACTIF'
                ]);

                if ($validator->fails()) {
                    $this->results['errors'][] = [
                        'line' => $index + 2,
                        'errors' => $validator->errors()->toArray()
                    ];
                    continue;
                }

                // Trouver la section
                $section = Section::where('name', $row['section'])->first();
                if (!$section) {
                    $this->results['errors'][] = [
                        'line' => $index + 2,
                        'errors' => ['Section non trouvée: ' . $row['section']]
                    ];
                    continue;
                }

                // Trouver le niveau
                $level = Level::where('name', $row['niveau'])
                             ->where('section_id', $section->id)
                             ->first();
                if (!$level) {
                    $this->results['errors'][] = [
                        'line' => $index + 2,
                        'errors' => ['Niveau non trouvé: ' . $row['niveau'] . ' dans la section ' . $row['section']]
                    ];
                    continue;
                }

                // Trouver la classe
                $schoolClass = SchoolClass::where('name', $row['classe'])
                                        ->where('level_id', $level->id)
                                        ->first();
                if (!$schoolClass) {
                    $this->results['errors'][] = [
                        'line' => $index + 2,
                        'errors' => ['Classe non trouvée: ' . $row['classe'] . ' dans le niveau ' . $row['niveau']]
                    ];
                    continue;
                }

                $data = [
                    'name' => $row['nom'],
                    'code' => $row['code'] ?? null,
                    'class_id' => $schoolClass->id,
                    'capacity' => $row['capacite'] ?? null,
                    'is_active' => $this->parseStatus($row['statut'] ?? 'actif')
                ];

                $existingSeries = null;
                
                // Si un ID est fourni, chercher par ID
                if (!empty($row['id'])) {
                    $existingSeries = ClassSeries::find($row['id']);
                    if ($existingSeries) {
                        $existingSeries->update($data);
                        $this->results['updated']++;
                    } else {
                        // ID fourni mais inexistant (ne devrait pas arriver grâce à la validation exists)
                        $this->results['errors'][] = [
                            'line' => $index + 2,
                            'errors' => ['ID ' . $row['id'] . ' non trouvé']
                        ];
                        continue;
                    }
                } else {
                    // Pas d'ID fourni, comportement classique : chercher par nom et classe
                    $existingSeries = ClassSeries::where('name', $data['name'])
                                                ->where('class_id', $schoolClass->id)
                                                ->first();
                    
                    if ($existingSeries) {
                        $existingSeries->update($data);
                        $this->results['updated']++;
                    } else {
                        ClassSeries::create($data);
                        $this->results['created']++;
                    }
                }

            } catch (\Exception $e) {
                $this->results['errors'][] = [
                    'line' => $index + 2,
                    'errors' => ['Erreur lors du traitement: ' . $e->getMessage()]
                ];
            }
        }
    }

    private function parseStatus($status)
    {
        if (is_string($status)) {
            return strtolower($status) === 'actif';
        }
        return (bool) $status;
    }

    public function getResults()
    {
        return $this->results;
    }
}