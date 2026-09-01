<?php

namespace App\Services;

class BilingualViewService
{
    /**
     * Obtenir les traductions selon le niveau et la spécialité
     */
    public function getTranslations($levelType, $specialtyName = null)
    {
        // Déterminer la langue principale selon le niveau
        $language = $this->detectLanguage($levelType, $specialtyName);
        
        return [
            'language' => $language,
            'translations' => $this->getLanguageTranslations($language),
            'level_display' => $this->getLevelDisplay($levelType, $language),
            'specialty_display' => $this->getSpecialtyDisplay($specialtyName, $language)
        ];
    }

    /**
     * Détecter la langue selon le niveau/spécialité
     */
    private function detectLanguage($levelType, $specialtyName = null)
    {
        // Niveaux anglophones INSSAS
        $anglophoneLevels = ['HND', 'PROFESSIONAL_LICENSE', 'BACHELOR', 'PROFESSIONAL_MASTER'];
        
        // Spécialités anglophones
        $anglophoneSpecialties = [
            'Health HND',
            'Professional License in Health Sciences',
            'Bachelor in Nursing',
            'Professional Master in Health Management'
        ];
        
        // Vérifier le niveau
        if (in_array($levelType, $anglophoneLevels)) {
            return 'en';
        }
        
        // Vérifier la spécialité
        if ($specialtyName && in_array($specialtyName, $anglophoneSpecialties)) {
            return 'en';
        }
        
        return 'fr'; // Français par défaut
    }

    /**
     * Obtenir les traductions par langue
     */
    private function getLanguageTranslations($language)
    {
        if ($language === 'en') {
            return [
                // Interface générale
                'school_name' => 'BILINGUAL POLYTECHNIC COLLEGE OF DOUALA',
                'student' => 'Student',
                'students' => 'Students',
                'registration' => 'Registration',
                'payment' => 'Payment',
                'receipt' => 'Receipt',
                'amount' => 'Amount',
                'date' => 'Date',
                'status' => 'Status',
                'paid' => 'Paid',
                'unpaid' => 'Unpaid',
                'pending' => 'Pending',
                
                // Informations étudiant
                'student_info' => 'Student Information',
                'first_name' => 'First Name',
                'last_name' => 'Last Name',
                'registration_number' => 'Registration Number',
                'date_of_birth' => 'Date of Birth',
                'place_of_birth' => 'Place of Birth',
                'gender' => 'Gender',
                'male' => 'Male',
                'female' => 'Female',
                'address' => 'Address',
                'phone' => 'Phone',
                'email' => 'Email',
                'parent_name' => 'Parent/Guardian Name',
                'parent_phone' => 'Parent/Guardian Phone',
                'parent_email' => 'Parent/Guardian Email',
                
                // Académique
                'academic_info' => 'Academic Information',
                'class' => 'Class',
                'series' => 'Series',
                'level' => 'Level',
                'speciality' => 'Speciality',
                'school_year' => 'Academic Year',
                'semester' => 'Semester',
                'trimester' => 'Trimester',
                
                // Paiements
                'payment_info' => 'Payment Information',
                'tuition_fees' => 'Tuition Fees',
                'registration_fee' => 'Registration Fee',
                'file_processing_fee' => 'File Processing Fee',
                'paper_ream_fee' => 'Paper Ream Fee',
                'university_supervision_fee' => 'University Supervision Fee',
                'diploma_establishment_fee' => 'Diploma Establishment Fee',
                'first_installment' => '1st Installment',
                'second_installment' => '2nd Installment',
                'third_installment' => '3rd Installment',
                'total_amount' => 'Total Amount',
                'amount_paid' => 'Amount Paid',
                'remaining_balance' => 'Remaining Balance',
                'payment_method' => 'Payment Method',
                'reference_number' => 'Reference Number',
                'payment_receipt' => 'Payment Receipt',
                
                // Bourses et équipements
                'scholarship' => 'Scholarship',
                'scholarship_amount' => 'Scholarship Amount',
                'laptop_eligible' => 'Laptop Eligible',
                'equipment' => 'Equipment',
                'required_equipment' => 'Required Equipment',
                'medical_equipment' => 'Medical Equipment',
                'clothing' => 'Clothing',
                'uniform' => 'Uniform',
                'lab_coat' => 'Lab Coat',
                
                // Spécialisations INSSAS anglophones
                'health_sciences' => 'Health Sciences',
                'nursing' => 'Nursing',
                'midwifery' => 'Midwifery',
                'medical_laboratory' => 'Medical Laboratory Technology',
                'physiotherapy' => 'Physiotherapy',
                'pharmacy_tech' => 'Pharmacy Technology',
                'health_management' => 'Health Management',
                'public_health' => 'Public Health',
                
                // Messages système
                'success' => 'Success',
                'error' => 'Error',
                'warning' => 'Warning',
                'info' => 'Information',
                'loading' => 'Loading...',
                'save' => 'Save',
                'cancel' => 'Cancel',
                'delete' => 'Delete',
                'edit' => 'Edit',
                'view' => 'View',
                'print' => 'Print',
                'download' => 'Download',
                'search' => 'Search',
                'filter' => 'Filter',
                'export' => 'Export',
                
                // Statuts et mentions
                'very_good' => 'Very Good',
                'good' => 'Good',
                'fairly_good' => 'Fairly Good',
                'pass' => 'Pass',
                'fail' => 'Fail',
                
                // Mentions légales
                'legal_notice' => 'Legal Notice',
                'terms_conditions' => 'Terms and Conditions',
                'non_refundable' => 'Tuition and processing fees are non-refundable in case of withdrawal or exclusion.',
                'keep_receipt' => 'This receipt serves as proof of payment - Keep it safe',
                'generated_by' => 'Generated by',
                'signature_student' => 'Student Signature',
                'signature_school' => 'School Stamp and Signature'
            ];
        }
        
        // Traductions françaises (par défaut)
        return [
            'school_name' => 'COLLÈGE POLYTECHNIQUE BILINGUE DE DOUALA',
            'student' => 'Étudiant',
            'students' => 'Étudiants',
            'registration' => 'Inscription',
            'payment' => 'Paiement',
            'receipt' => 'Reçu',
            'amount' => 'Montant',
            'date' => 'Date',
            'status' => 'Statut',
            'paid' => 'Payé',
            'unpaid' => 'Non payé',
            'pending' => 'En attente',
            
            'student_info' => 'Informations Étudiant',
            'first_name' => 'Prénom',
            'last_name' => 'Nom',
            'registration_number' => 'Matricule',
            'date_of_birth' => 'Date de naissance',
            'place_of_birth' => 'Lieu de naissance',
            'gender' => 'Sexe',
            'male' => 'Masculin',
            'female' => 'Féminin',
            'address' => 'Adresse',
            'phone' => 'Téléphone',
            'email' => 'Email',
            'parent_name' => 'Nom du parent/tuteur',
            'parent_phone' => 'Téléphone parent/tuteur',
            'parent_email' => 'Email parent/tuteur',
            
            'academic_info' => 'Informations Académiques',
            'class' => 'Classe',
            'series' => 'Série',
            'level' => 'Niveau',
            'speciality' => 'Spécialité',
            'school_year' => 'Année scolaire',
            'semester' => 'Semestre',
            'trimester' => 'Trimestre',
            
            'payment_info' => 'Informations de Paiement',
            'tuition_fees' => 'Frais de scolarité',
            'registration_fee' => 'Frais d\'inscription',
            'file_processing_fee' => 'Frais d\'étude de dossier',
            'paper_ream_fee' => 'Frais de rames de papier',
            'university_supervision_fee' => 'Frais de tutelle universitaire',
            'diploma_establishment_fee' => 'Frais d\'établissement de diplôme',
            'first_installment' => '1ère Tranche',
            'second_installment' => '2ème Tranche',
            'third_installment' => '3ème Tranche',
            'total_amount' => 'Montant total',
            'amount_paid' => 'Montant payé',
            'remaining_balance' => 'Solde restant',
            'payment_method' => 'Mode de paiement',
            'reference_number' => 'Numéro de référence',
            'payment_receipt' => 'Reçu de paiement',
            
            'scholarship' => 'Bourse',
            'scholarship_amount' => 'Montant de la bourse',
            'laptop_eligible' => 'Éligible ordinateur portable',
            'equipment' => 'Équipement',
            'required_equipment' => 'Équipement requis',
            'medical_equipment' => 'Équipement médical',
            'clothing' => 'Vêtement',
            'uniform' => 'Uniforme',
            'lab_coat' => 'Blouse',
            
            'health_sciences' => 'Sciences de la Santé',
            'nursing' => 'Sciences Infirmières',
            'midwifery' => 'Sage-Femme/Maïeutique',
            'medical_laboratory' => 'Techniques de Laboratoire Médical',
            'physiotherapy' => 'Kinésithérapie',
            'pharmacy_tech' => 'Techniques Pharmaceutiques',
            'health_management' => 'Gestion de la Santé',
            'public_health' => 'Santé Publique',
            
            'success' => 'Succès',
            'error' => 'Erreur',
            'warning' => 'Attention',
            'info' => 'Information',
            'loading' => 'Chargement...',
            'save' => 'Enregistrer',
            'cancel' => 'Annuler',
            'delete' => 'Supprimer',
            'edit' => 'Modifier',
            'view' => 'Voir',
            'print' => 'Imprimer',
            'download' => 'Télécharger',
            'search' => 'Rechercher',
            'filter' => 'Filtrer',
            'export' => 'Exporter',
            
            'very_good' => 'Très Bien',
            'good' => 'Bien',
            'fairly_good' => 'Assez Bien',
            'pass' => 'Passable',
            'fail' => 'Échec',
            
            'legal_notice' => 'Mention Légale',
            'terms_conditions' => 'Termes et Conditions',
            'non_refundable' => 'Les frais de scolarité et d\'étude de dossier ne sont pas remboursables en cas d\'abandon ou d\'exclusion.',
            'keep_receipt' => 'Ce reçu fait foi du paiement effectué - À conserver précieusement',
            'generated_by' => 'Généré par',
            'signature_student' => 'Signature de l\'étudiant',
            'signature_school' => 'Cachet et signature de l\'école'
        ];
    }

    /**
     * Obtenir l'affichage du niveau selon la langue
     */
    private function getLevelDisplay($levelType, $language)
    {
        if ($language === 'en') {
            $englishLevels = [
                'HND' => 'Higher National Diploma (HND)',
                'PROFESSIONAL_LICENSE' => 'Professional License',
                'BACHELOR' => 'Bachelor\'s Degree',
                'PROFESSIONAL_MASTER' => 'Professional Master\'s Degree',
                'BTS' => 'Higher Technician Certificate (HTC)',
                'LICENCE_PRO' => 'Professional License',
                'MASTER' => 'Master\'s Degree',
                'INGENIERIE' => 'Engineering Degree'
            ];
            return $englishLevels[$levelType] ?? $levelType;
        }
        
        // Affichage français
        $frenchLevels = [
            'BTS' => 'Brevet de Technicien Supérieur (BTS)',
            'HND' => 'Higher National Diploma (HND)',
            'LICENCE_ACA' => 'Licence Académique',
            'LICENCE_PRO' => 'Licence Professionnelle',
            'PROFESSIONAL_LICENSE' => 'Licence Professionnelle',
            'BACHELOR' => 'Bachelor',
            'MASTER' => 'Master',
            'PROFESSIONAL_MASTER' => 'Master Professionnel',
            'CQP' => 'Certificat de Qualification Professionnelle (CQP)',
            'DQP' => 'Diplôme de Qualification Professionnelle (DQP)',
            'TMS' => 'Technicien Médico-Sanitaire (TMS)',
            'INGENIERIE' => 'Diplôme d\'Ingénieur'
        ];
        return $frenchLevels[$levelType] ?? $levelType;
    }

    /**
     * Obtenir l'affichage de la spécialité selon la langue
     */
    private function getSpecialtyDisplay($specialtyName, $language)
    {
        if (!$specialtyName) return null;
        
        if ($language === 'en') {
            $englishSpecialties = [
                'Sciences Infirmières' => 'Nursing Sciences',
                'Sage-Femme / Maïeuticien' => 'Midwifery',
                'Techniques de Laboratoire d\'Analyses Médicales' => 'Medical Laboratory Technology',
                'Kinésithérapie' => 'Physiotherapy',
                'Sciences et Techniques Pharmaceutiques' => 'Pharmaceutical Sciences and Technology',
                'Médecine' => 'Medicine',
                'Santé publique' => 'Public Health',
                'Gestion de la santé' => 'Health Management'
            ];
            return $englishSpecialties[$specialtyName] ?? $specialtyName;
        }
        
        return $specialtyName; // Retourner tel quel pour le français
    }

    /**
     * Formater une date selon la langue
     */
    public function formatDate($date, $language = 'fr')
    {
        if (!$date) return null;
        
        if ($language === 'en') {
            return \Carbon\Carbon::parse($date)->format('m/d/Y');
        }
        
        return \Carbon\Carbon::parse($date)->format('d/m/Y');
    }

    /**
     * Formater un montant selon la langue
     */
    public function formatAmount($amount, $language = 'fr')
    {
        if ($language === 'en') {
            return number_format($amount, 0, '.', ',') . ' FCFA';
        }
        
        return number_format($amount, 0, ',', ' ') . ' FCFA';
    }
}