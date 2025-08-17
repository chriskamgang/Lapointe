<?php

namespace App\Imports;

use App\Models\SchoolClass;
use App\Models\ClassSeries;
use App\Models\Level;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class SchoolClassesImport implements ToCollection, WithHeadingRow
{
    protected $results = [
        'classes_created' => 0,
        'classes_updated' => 0,
        'series_created' => 0,
        'series_updated' => 0,
        'errors' => []
    ];

    public function collection(Collection $rows)
    {
        foreach ($rows as $index => $row) {
            try {
                $validator = Validator::make($row->toArray(), [
                    'class_id' => 'nullable|integer|exists:school_classes,id',
                    'class_nom' => 'required|string|max:255',
                    'level_id' => 'required|integer|exists:levels,id',
                    'class_description' => 'nullable|string',
                    'class_statut' => 'nullable|in:0,1,actif,inactif',
                    'series' => 'nullable|string'
                ]);

                if ($validator->fails()) {
                    $this->results['errors'][] = [
                        'line' => $index + 2,
                        'errors' => $validator->errors()->toArray()
                    ];
                    continue;
                }

                // Gérer la classe
                $classData = [
                    'name' => $row['class_nom'],
                    'level_id' => $row['level_id'],
                    'description' => $row['class_description'] ?? null,
                    'is_active' => $this->parseStatus($row['class_statut'] ?? 1)
                ];

                $schoolClass = null;
                
                // Si un ID de classe est fourni, chercher par ID
                if (!empty($row['class_id'])) {
                    $schoolClass = SchoolClass::find($row['class_id']);
                    if ($schoolClass) {
                        $schoolClass->update($classData);
                        $this->results['classes_updated']++;
                    } else {
                        $this->results['errors'][] = [
                            'line' => $index + 2,
                            'errors' => ['Class ID ' . $row['class_id'] . ' non trouvé']
                        ];
                        continue;
                    }
                } else {
                    // Pas d'ID fourni, créer une nouvelle classe
                    $schoolClass = SchoolClass::create($classData);
                    $this->results['classes_created']++;
                }

                // Gérer les séries si présentes
                if (!empty($row['series']) && $schoolClass) {
                    $this->processSeries($row['series'], $schoolClass->id, $index + 2);
                }

            } catch (\Exception $e) {
                $this->results['errors'][] = [
                    'line' => $index + 2,
                    'errors' => ['Erreur lors du traitement: ' . $e->getMessage()]
                ];
            }
        }
    }

    private function processSeries($seriesString, $classId, $lineNumber)
    {
        // Format: id:nom:code:capacité:statut|id:nom:code:capacité:statut
        $seriesItems = explode('|', $seriesString);
        
        foreach ($seriesItems as $seriesItem) {
            $seriesItem = trim($seriesItem);
            if (empty($seriesItem)) continue;
            
            $parts = explode(':', $seriesItem);
            if (count($parts) < 2) {
                $this->results['errors'][] = [
                    'line' => $lineNumber,
                    'errors' => ['Format série invalide: ' . $seriesItem]
                ];
                continue;
            }
            
            $seriesId = !empty($parts[0]) ? (int)$parts[0] : null;
            $seriesName = $parts[1] ?? '';
            $seriesCode = $parts[2] ?? null;
            $seriesCapacity = !empty($parts[3]) ? (int)$parts[3] : null;
            $seriesStatus = isset($parts[4]) ? $this->parseStatus($parts[4]) : true;
            
            if (empty($seriesName)) {
                $this->results['errors'][] = [
                    'line' => $lineNumber,
                    'errors' => ['Nom de série manquant: ' . $seriesItem]
                ];
                continue;
            }
            
            $seriesData = [
                'name' => $seriesName,
                'code' => $seriesCode,
                'class_id' => $classId,
                'capacity' => $seriesCapacity,
                'is_active' => $seriesStatus,
                'school_year_id' => 1 // Par défaut, à adapter selon vos besoins
            ];
            
            // Si un ID de série est fourni, modifier
            if ($seriesId) {
                $existingSeries = ClassSeries::find($seriesId);
                if ($existingSeries) {
                    $existingSeries->update($seriesData);
                    $this->results['series_updated']++;
                } else {
                    $this->results['errors'][] = [
                        'line' => $lineNumber,
                        'errors' => ['Series ID ' . $seriesId . ' non trouvé']
                    ];
                }
            } else {
                // Pas d'ID fourni, créer une nouvelle série
                ClassSeries::create($seriesData);
                $this->results['series_created']++;
            }
        }
    }

    private function parseStatus($status)
    {
        if (is_string($status)) {
            $statusLower = strtolower($status);
            if ($statusLower === 'actif') return true;
            if ($statusLower === 'inactif') return false;
        }
        
        // Pour 0/1 ou autres valeurs numériques
        return (bool) $status;
    }

    public function getResults()
    {
        return $this->results;
    }
}