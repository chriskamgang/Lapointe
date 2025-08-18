<?php

namespace App\Http\Controllers;

use App\Models\School;
use App\Models\Level;
use App\Models\SchoolClass;
use App\Models\UniversityFee;
use App\Models\UniversityScholarship;
use Illuminate\Http\Request;

class PublicUniversityController extends Controller
{
    /**
     * Obtenir toutes les écoles avec leurs informations de base
     * Route publique pour le site web/prospectus
     */
    public function getSchools()
    {
        try {
            $schools = School::where('is_active', true)
                ->with(['levels' => function($query) {
                    $query->where('is_active', true)
                        ->with(['schoolClasses' => function($q) {
                            $q->where('is_active', true);
                        }]);
                }])
                ->orderBy('order')
                ->get();

            $schoolsData = $schools->map(function($school) {
                return [
                    'id' => $school->id,
                    'name' => $school->name,
                    'code' => $school->code,
                    'description' => $school->description,
                    'director_name' => $school->director_name,
                    'director_email' => $school->director_email,
                    'director_phone' => $school->director_phone,
                    'total_levels' => $school->levels->count(),
                    'total_specialities' => $school->levels->sum(function($level) {
                        return $level->schoolClasses->count();
                    }),
                    'level_types' => $school->levels->pluck('level_type')->unique()->values(),
                    'programs_overview' => $this->getSchoolProgramsOverview($school)
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $schoolsData,
                'message' => 'Écoles récupérées avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des écoles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les programmes d'une école spécifique
     */
    public function getSchoolPrograms($schoolId)
    {
        try {
            $school = School::with([
                'levels.schoolClasses.series',
                'universityFees',
                'universityScholarships'
            ])->findOrFail($schoolId);

            $programs = [];
            
            foreach ($school->levels as $level) {
                $levelPrograms = [
                    'level_id' => $level->id,
                    'level_name' => $level->name,
                    'level_type' => $level->level_type,
                    'level_type_display' => $level->level_type_display,
                    'duration_years' => $level->duration_years,
                    'specialities' => []
                ];

                foreach ($level->schoolClasses as $speciality) {
                    $specialityData = [
                        'id' => $speciality->id,
                        'name' => $speciality->name,
                        'code' => $speciality->speciality_code,
                        'description' => $speciality->description,
                        'max_capacity' => $speciality->max_capacity,
                        'career_prospects' => $speciality->career_prospects_list,
                        'admission_requirements' => $speciality->admission_requirements_list,
                        'rooms_count' => $speciality->series->count(),
                        'fees' => $this->getSpecialityFees($school->id, $level->level_type, $speciality->speciality_code),
                        'scholarships' => $this->getSpecialityScholarships($school->id, $level->level_type)
                    ];

                    $levelPrograms['specialities'][] = $specialityData;
                }

                if (!empty($levelPrograms['specialities'])) {
                    $programs[] = $levelPrograms;
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'school' => [
                        'id' => $school->id,
                        'name' => $school->name,
                        'code' => $school->code,
                        'description' => $school->description,
                        'director_name' => $school->director_name,
                        'director_email' => $school->director_email,
                        'director_phone' => $school->director_phone
                    ],
                    'programs' => $programs
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des programmes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les frais d'une école par code
     */
    public function getFees($schoolCode)
    {
        try {
            $school = School::where('code', $schoolCode)->where('is_active', true)->first();
            
            if (!$school) {
                return response()->json([
                    'success' => false,
                    'message' => 'École non trouvée'
                ], 404);
            }

            $fees = UniversityFee::where('school_id', $school->id)
                ->where('is_active', true)
                ->orderBy('level_type')
                ->orderBy('speciality')
                ->get();

            $organizedFees = [];
            
            foreach ($fees as $fee) {
                $levelType = $fee->level_type;
                
                if (!isset($organizedFees[$levelType])) {
                    $organizedFees[$levelType] = [
                        'level_type' => $levelType,
                        'level_type_display' => $this->getLevelTypeDisplay($levelType),
                        'specialities' => []
                    ];
                }

                $organizedFees[$levelType]['specialities'][] = [
                    'speciality' => $fee->speciality,
                    'inscription_fee' => $fee->inscription_fee,
                    'first_installment' => $fee->first_installment,
                    'second_installment' => $fee->second_installment,
                    'third_installment' => $fee->third_installment,
                    'total_annual_fee' => $fee->total_annual_fee,
                    'duration_years' => $fee->duration_years,
                    'included_benefits' => $fee->included_benefits_array,
                    'formatted_total_fee' => $fee->formatted_total_fee
                ];
            }

            // Informations générales sur les frais
            $generalInfo = [
                'inscription_fee_general' => 40000, // Frais d'inscription standard
                'bus_fee_per_trip' => 100,
                'bus_subscription_fee' => 5000,
                'included_benefits_standard' => [
                    'Connexion Wifi illimitée et gratuite',
                    'Accès à une bibliothèque numérique et physique',
                    'Accès aux laboratoires spécialisés',
                    'Participation à des séminaires professionnels',
                    'Attestations de fin de formation',
                    'Certifications internationales via e-learning',
                    'Excursions pédagogiques et visites d\'entreprise',
                    'Réalisation d\'un projet professionnel encadré',
                    'Supports de cours gratuits'
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'school' => [
                        'name' => $school->name,
                        'code' => $school->code
                    ],
                    'general_info' => $generalInfo,
                    'fees_by_level' => array_values($organizedFees)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des frais',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les bourses d'une école par code
     */
    public function getScholarships($schoolCode)
    {
        try {
            $school = School::where('code', $schoolCode)->where('is_active', true)->first();
            
            if (!$school) {
                return response()->json([
                    'success' => false,
                    'message' => 'École non trouvée'
                ], 404);
            }

            $scholarships = UniversityScholarship::where('school_id', $school->id)
                ->where('is_active', true)
                ->orderBy('level_type')
                ->orderBy('scholarship_amount', 'desc')
                ->get();

            $organizedScholarships = [];
            
            foreach ($scholarships as $scholarship) {
                $levelType = $scholarship->level_type;
                
                if (!isset($organizedScholarships[$levelType])) {
                    $organizedScholarships[$levelType] = [
                        'level_type' => $levelType,
                        'level_type_display' => $this->getLevelTypeDisplay($levelType),
                        'scholarships' => []
                    ];
                }

                $organizedScholarships[$levelType]['scholarships'][] = [
                    'formation_name' => $scholarship->formation_name,
                    'scholarship_amount' => $scholarship->scholarship_amount,
                    'formatted_amount' => number_format($scholarship->scholarship_amount, 0, ',', ' ') . ' FCFA',
                    'laptop_included' => $scholarship->laptop_included,
                    'conditions' => $scholarship->conditions
                ];
            }

            // Informations générales sur les bourses
            $generalInfo = [
                'laptop_distribution_note' => 'La distribution des ordinateurs portables se fera uniquement après le règlement de la deuxième tranche des frais de scolarité.',
                'scholarship_conditions_general' => 'Les bourses sont attribuées selon les critères d\'admission et les performances académiques.',
                'laptop_benefits' => [
                    'Ordinateur portable offert selon les formations',
                    'Maintenance et support technique inclus',
                    'Logiciels pédagogiques pré-installés'
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'school' => [
                        'name' => $school->name,
                        'code' => $school->code
                    ],
                    'general_info' => $generalInfo,
                    'scholarships_by_level' => array_values($organizedScholarships)
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des bourses',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les conditions d'admission
     */
    public function getAdmissionRequirements()
    {
        try {
            $requirements = [
                'premier_cycle' => [
                    'title' => 'PREMIER CYCLE (Niveau 1 et 2)',
                    'documents' => [
                        'Une fiche individuelle à retirer au Campus A, dûment timbrée à 1 500 F CFA',
                        'Une photocopie certifiée conforme de l\'acte de naissance (moins de 3 mois)',
                        'Une photocopie certifiée conforme du Baccalauréat ou GCE/AL (scientifique)',
                        'Un certificat médical délivré par un médecin de l\'administration',
                        'Une enveloppe format A4, timbrée à 1 000 F CFA',
                        'Une photocopie du reçu de paiement des frais de concours',
                        'Paiement des frais de concours : 20 000 F CFA'
                    ]
                ],
                'second_cycle' => [
                    'title' => 'SECOND CYCLE (Niveau 3, 4 et 5)',
                    'documents' => [
                        'Une fiche individuelle à retirer au Campus A, dûment timbrée à 1 500 F CFA',
                        'Une photocopie certifiée conforme de l\'acte de naissance (moins de 3 mois)',
                        'Une photocopie certifiée conforme du diplôme ouvrant droit au concours',
                        'Photocopies certifiées des relevés de notes des 1ère, 2ème et 3ème années',
                        'Photocopies certifiées du Probatoire ou GCE/OL et Baccalauréat',
                        'Un certificat médical d\'aptitude aux études supérieures',
                        'Une enveloppe format A4, timbrée à 1 000 F CFA',
                        'Une photocopie du reçu de paiement des frais de concours',
                        'Paiement des frais de concours : 25 000 F CFA'
                    ]
                ],
                'niveau_bts' => [
                    'title' => 'NIVEAU BTS',
                    'documents' => [
                        'Fiche d\'inscription à retirer à l\'établissement',
                        'Photocopie de la CNI',
                        'Photocopie de l\'acte de naissance',
                        'Photocopie conforme du relevé de notes ou bordereau de réussite au Bac',
                        'Photocopie des bulletins de la classe de Terminale',
                        '2 photos couleurs 4×4',
                        'Chemise à sangle + 2 chemises cartonnées A4',
                        'Frais d\'étude de dossier : 10 000 FCFA',
                        'Frais d\'inscription : 40 000 FCFA + 6 rames de papiers',
                        'Polo personnalisé (6500 FCFA) ou Blouse (7500 FCFA pour santé)'
                    ]
                ],
                'licence_pro' => [
                    'title' => 'LICENCE PROFESSIONNELLE',
                    'documents' => [
                        'Fiche de préinscription fournie par l\'Institut',
                        'Copie conforme d\'acte de naissance (certifiée à la sous-préfecture)',
                        'Copie conforme du diplôme exigé (BTS, DUT, etc.)',
                        '2 photos couleurs d\'identité (4×4)',
                        'Copie conforme du Bac (certifié à la sous-préfecture)',
                        'Chemise à sangle et 2 chemises cartonnées',
                        'Frais d\'étude de dossier : 10 000 FCFA',
                        'Frais d\'inscription : 50 000 FCFA + 4 rames de papiers',
                        'Frais de tutelle universitaire : 50 000 FCFA/AN',
                        'Frais d\'établissement du diplôme : 15 000 FCFA'
                    ]
                ],
                'master' => [
                    'title' => 'MASTER PROFESSIONNEL',
                    'documents' => [
                        'Fiche de préinscription fournie par l\'Institut',
                        'Copie conforme d\'acte de naissance (certifiée à la sous-préfecture)',
                        'Copie conforme du diplôme exigé (Licence Pro/Bachelor)',
                        '2 photos couleurs d\'identité (4×4)',
                        'Chemise à sangle et 2 chemises cartonnées',
                        'Inscription à tout programme de Master : 150 000 FCFA'
                    ]
                ]
            ];

            $contactInfo = [
                'address' => 'PO.BOX 1362 Bafoussam',
                'emails' => ['inssas@yahoo.fr', 'contact@iu-pointe.fr'],
                'phones' => ['+237 6 92.15.09.52', '+237 675.52.51.00'],
                'website' => 'www.iu-pointe.fr',
                'elearning_platform' => 'www.iupointe/elearning.com'
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'requirements' => $requirements,
                    'contact_info' => $contactInfo,
                    'note' => 'Tous les documents doivent être authentiques et certifiés par les autorités compétentes.'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des conditions d\'admission',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Helpers privées
     */
    private function getSchoolProgramsOverview($school)
    {
        $overview = [];
        $levelTypes = $school->levels->pluck('level_type')->unique();
        
        foreach ($levelTypes as $levelType) {
            $count = $school->levels->where('level_type', $levelType)
                ->sum(function($level) {
                    return $level->schoolClasses->count();
                });
            
            $overview[] = [
                'level_type' => $levelType,
                'level_type_display' => $this->getLevelTypeDisplay($levelType),
                'specialities_count' => $count
            ];
        }
        
        return $overview;
    }

    private function getSpecialityFees($schoolId, $levelType, $specialityCode)
    {
        return UniversityFee::where('school_id', $schoolId)
            ->where('level_type', $levelType)
            ->where('speciality', $specialityCode)
            ->first();
    }

    private function getSpecialityScholarships($schoolId, $levelType)
    {
        return UniversityScholarship::where('school_id', $schoolId)
            ->where('level_type', $levelType)
            ->where('is_active', true)
            ->get();
    }

    private function getLevelTypeDisplay($levelType)
    {
        $types = [
            'BTS' => 'Brevet de Technicien Supérieur',
            'HND' => 'Higher National Diploma',
            'LICENCE' => 'Licence',
            'LICENCE_PRO' => 'Licence Professionnelle',
            'BACHELOR' => 'Bachelor',
            'MASTER' => 'Master',
            'CQP' => 'Certificat de Qualification Professionnelle',
            'DQP' => 'Diplôme de Qualification Professionnelle',
            'TMS' => 'Technicien Médico-Sanitaire',
            'INGENIERIE' => 'Cycle d\'Ingénierie'
        ];

        return $types[$levelType] ?? $levelType;
    }
}