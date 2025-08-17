<?php

namespace App\Imports;

use App\Models\Section;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;

class SectionsImport implements ToCollection, WithHeadingRow
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
                    'id' => 'nullable|integer|exists:sections,id',
                    'nom' => 'required|string|max:255',
                    'description' => 'nullable|string',
                    'statut' => 'nullable|in:0,1,actif,inactif,Actif,Inactif,ACTIF,INACTIF'
                ]);

                if ($validator->fails()) {
                    $this->results['errors'][] = [
                        'line' => $index + 2, // +2 car on compte l'en-tête et l'index commence à 0
                        'errors' => $validator->errors()->toArray()
                    ];
                    continue;
                }

                $data = [
                    'name' => $row['nom'],
                    'description' => $row['description'] ?? null,
                    'is_active' => $this->parseStatus($row['statut'] ?? 1)
                ];

                $existingSection = null;
                
                // Si un ID est fourni, chercher par ID
                if (!empty($row['id'])) {
                    $existingSection = Section::find($row['id']);
                    if ($existingSection) {
                        $existingSection->update($data);
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
                    // Pas d'ID fourni, créer une nouvelle section
                    // (La modification se fait uniquement par ID pour éviter les ambiguïtés)
                    Section::create($data);
                    $this->results['created']++;
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