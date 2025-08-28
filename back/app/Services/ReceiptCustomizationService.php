<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\School;
use App\Models\SchoolSetting;
use App\Models\PaymentTranche;
use App\Services\BilingualViewService;

class ReceiptCustomizationService
{
    /**
     * Générer le HTML personnalisé du reçu selon l'école
     */
    public function generateCustomizedReceiptHtml($payment, $schoolSettings)
    {
        $student = $payment->student;
        $school = $student->classSeries->schoolClass->level->school;
        $level = $student->classSeries->schoolClass->level;
        $schoolClass = $student->classSeries->schoolClass ?? null;
        
        // Service bilingue pour INSSAS
        $bilingualService = new BilingualViewService();
        $translations = $bilingualService->getTranslations(
            $level->level_type,
            $schoolClass ? $schoolClass->name : null
        );
        $t = $translations['translations'];
        $language = $translations['language'];
        
        // Obtenir les couleurs et styles par école
        $schoolStyle = $this->getSchoolStyle($school);
        
        // Générer les lignes de frais complètes
        $feeLines = $this->generateCompleteFeeLines($payment, $school, $t);
        
        // Formatage des montants selon la langue
        $formatAmount = function ($amount) use ($bilingualService, $language) {
            return $bilingualService->formatAmount($amount, $language);
        };

        $workingYear = $payment->schoolYear;

        $html = "
        <div style='font-family: Arial, sans-serif; font-size: 12px; color: {$schoolStyle['text_color']};'>
            <div style='width: 100%; max-width: 800px; margin: 0 auto;'>
                
                <!-- En-tête école -->
                <div style='text-align: center; margin-bottom: 20px; border-bottom: 2px solid {$schoolStyle['primary_color']}; padding-bottom: 15px;'>
                    <div style='display: flex; align-items: center; justify-content: center;'>
                        " . ($this->getSchoolLogo($school) ? "<img src='{$this->getSchoolLogo($school)}' style='width: 80px; height: 80px; margin-right: 20px;' />" : "") . "
                        <div>
                            <h1 style='margin: 0; font-size: 18px; color: {$schoolStyle['primary_color']}; font-weight: bold;'>{$schoolSettings->school_name}</h1>
                            <h2 style='margin: 5px 0; font-size: 16px; color: {$schoolStyle['secondary_color']}; font-weight: bold;'>{$school->name}</h2>
                            <div style='font-size: 11px; color: {$schoolStyle['text_color']};'>
                                <div>{$schoolSettings->school_address}</div>
                                <div>Tél: {$schoolSettings->school_phone} | Email: {$schoolSettings->school_email}</div>
                                <div style='font-weight: bold; color: {$schoolStyle['accent_color']};'>{$this->getSchoolMotto($school)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Titre du reçu -->
                <div style='text-align: center; margin: 20px 0;'>
                    <h2 style='margin: 0; font-size: 16px; color: {$schoolStyle['primary_color']}; border: 2px solid {$schoolStyle['primary_color']}; padding: 8px 16px; display: inline-block;'>
                        " . strtoupper($t['payment_receipt']) . " N° {$payment->receipt_number}
                    </h2>
                </div>

                <!-- Informations étudiant -->
                <div style='background-color: {$schoolStyle['bg_light']}; border: 1px solid {$schoolStyle['border_color']}; padding: 12px; margin-bottom: 15px; border-radius: 5px;'>
                    <div style='display: flex; justify-content: space-between;'>
                        <div style='width: 60%;'>
                            <div><strong>{$t['last_name']} {$t['first_name']}:</strong> {$student->nom} {$student->prenom}</div>
                            <div><strong>{$t['registration_number']}:</strong> {$student->matricule}</div>
                            <div><strong>{$t['date_of_birth']}:</strong> " . ($student->date_naissance ? $bilingualService->formatDate($student->date_naissance, $language) : 'N/A') . "</div>
                        </div>
                        <div style='width: 35%;'>
                            <div><strong>{$t['class']}:</strong> " . ($schoolClass ? $schoolClass->name : 'N/A') . "</div>
                            <div><strong>{$t['series']}:</strong> " . ($student->classSeries ? $student->classSeries->code : 'N/A') . "</div>
                            <div><strong>{$t['school_year']}:</strong> {$workingYear->name}</div>
                        </div>
                    </div>
                </div>

                <!-- Détail complet des frais -->
                <div style='margin-bottom: 20px;'>
                    <h3 style='color: {$schoolStyle['primary_color']}; border-bottom: 1px solid {$schoolStyle['primary_color']}; padding-bottom: 5px; margin-bottom: 10px;'>
                        DÉTAIL DES FRAIS PAYÉS
                    </h3>
                    
                    <table style='width: 100%; border-collapse: collapse; margin-bottom: 15px;'>
                        <thead>
                            <tr style='background-color: {$schoolStyle['primary_color']}; color: white;'>
                                <th style='border: 1px solid #000; padding: 8px; text-align: left;'>DÉSIGNATION</th>
                                <th style='border: 1px solid #000; padding: 8px; text-align: center; width: 100px;'>MONTANT (FCFA)</th>
                                <th style='border: 1px solid #000; padding: 8px; text-align: center; width: 100px;'>STATUT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {$feeLines}
                        </tbody>
                    </table>
                </div>

                <!-- Récapitulatif financier -->
                <div style='display: flex; justify-content: space-between; margin-bottom: 20px;'>
                    <div style='width: 48%; border: 1px solid {$schoolStyle['border_color']}; padding: 10px; border-radius: 5px;'>
                        <h4 style='color: {$schoolStyle['primary_color']}; margin-top: 0;'>RÉCAPITULATIF PAIEMENT</h4>
                        <div><strong>Date de paiement:</strong> " . \Carbon\Carbon::parse($payment->payment_date)->format('d/m/Y') . "</div>
                        <div><strong>Mode de paiement:</strong> {$payment->payment_method}</div>
                        <div><strong>Référence:</strong> {$payment->reference_number}</div>
                        <div style='color: {$schoolStyle['accent_color']}; font-weight: bold; font-size: 14px; margin-top: 8px;'>
                            <strong>Montant total payé: " . $formatAmount($payment->total_amount) . " FCFA</strong>
                        </div>
                    </div>
                    
                    <div style='width: 48%; border: 1px solid {$schoolStyle['border_color']}; padding: 10px; border-radius: 5px;'>
                        <h4 style='color: {$schoolStyle['primary_color']}; margin-top: 0;'>INFORMATIONS COMPLÉMENTAIRES</h4>
                        " . $this->getSchoolSpecificInfo($school, $student, $payment) . "
                    </div>
                </div>

                <!-- Mentions légales et signatures -->
                <div style='margin-top: 30px; border-top: 1px solid {$schoolStyle['border_color']}; padding-top: 15px;'>
                    <div style='display: flex; justify-content: space-between; margin-bottom: 20px;'>
                        <div style='width: 45%; text-align: center;'>
                            <div style='border: 1px dashed {$schoolStyle['border_color']}; height: 60px; margin-bottom: 5px;'></div>
                            <div><strong>Signature de l'étudiant</strong></div>
                        </div>
                        <div style='width: 45%; text-align: center;'>
                            <div style='border: 1px dashed {$schoolStyle['border_color']}; height: 60px; margin-bottom: 5px;'></div>
                            <div><strong>Cachet et signature de l'école</strong></div>
                        </div>
                    </div>
                    
                    <div style='font-size: 10px; text-align: center; color: {$schoolStyle['muted_color']}; border-top: 1px solid {$schoolStyle['border_color']}; padding-top: 10px;'>
                        <div>Les frais de scolarité et d'étude de dossier ne sont pas remboursables en cas d'abandon ou d'exclusion.</div>
                        <div>Ce reçu fait foi du paiement effectué - À conserver précieusement</div>
                        <div style='margin-top: 5px; font-style: italic;'>Généré le " . now()->format('d/m/Y à H:i') . " par le système {$schoolSettings->school_name}</div>
                    </div>
                </div>
            </div>
        </div>";

        return $html;
    }

    /**
     * Obtenir le style personnalisé par école
     */
    private function getSchoolStyle($school)
    {
        switch ($school->code) {
            case 'INSSAS':
                return [
                    'primary_color' => '#2E8B57',      // Vert médical
                    'secondary_color' => '#4682B4',     // Bleu acier
                    'accent_color' => '#DC143C',        // Rouge
                    'text_color' => '#2F4F4F',          // Gris foncé
                    'bg_light' => '#F0FFF0',            // Vert très clair
                    'border_color' => '#2E8B57',
                    'muted_color' => '#708090'
                ];
            
            case 'ESGIT':
                return [
                    'primary_color' => '#1E3A8A',       // Bleu tech
                    'secondary_color' => '#3B82F6',     // Bleu clair
                    'accent_color' => '#F59E0B',        // Orange
                    'text_color' => '#1F2937',
                    'bg_light' => '#EBF8FF',
                    'border_color' => '#1E3A8A',
                    'muted_color' => '#6B7280'
                ];
                
            case 'ESJEC':
                return [
                    'primary_color' => '#7C2D12',       // Brun juridique
                    'secondary_color' => '#A16207',     // Or foncé
                    'accent_color' => '#DC2626',        // Rouge
                    'text_color' => '#374151',
                    'bg_light' => '#FEF3C7',
                    'border_color' => '#7C2D12',
                    'muted_color' => '#6B7280'
                ];
                
            case 'ESSIT':
                return [
                    'primary_color' => '#B45309',       // Orange BTP
                    'secondary_color' => '#D97706',     // Orange vif
                    'accent_color' => '#EF4444',        // Rouge sécurité
                    'text_color' => '#374151',
                    'bg_light' => '#FFF7ED',
                    'border_color' => '#B45309',
                    'muted_color' => '#6B7280'
                ];
                
            case 'ISTPM':
                return [
                    'primary_color' => '#6366F1',       // Indigo formation
                    'secondary_color' => '#8B5CF6',     // Violet
                    'accent_color' => '#EF4444',        // Rouge
                    'text_color' => '#374151',
                    'bg_light' => '#EEF2FF',
                    'border_color' => '#6366F1',
                    'muted_color' => '#6B7280'
                ];
                
            case 'ISTMS':
                return [
                    'primary_color' => '#059669',       // Vert santé
                    'secondary_color' => '#10B981',     // Vert clair
                    'accent_color' => '#F59E0B',        // Amber
                    'text_color' => '#374151',
                    'bg_light' => '#ECFDF5',
                    'border_color' => '#059669',
                    'muted_color' => '#6B7280'
                ];
                
            default:
                return [
                    'primary_color' => '#1F2937',
                    'secondary_color' => '#374151',
                    'accent_color' => '#EF4444',
                    'text_color' => '#111827',
                    'bg_light' => '#F9FAFB',
                    'border_color' => '#D1D5DB',
                    'muted_color' => '#6B7280'
                ];
        }
    }

    /**
     * Générer les lignes complètes des frais
     */
    private function generateCompleteFeeLines($payment, $school, $translations)
    {
        $bilingualService = new BilingualViewService();
        $language = $bilingualService->getTranslations($payment->student->classSeries->schoolClass->level->level_type)['language'];
        
        $formatAmount = function ($amount) use ($bilingualService, $language) {
            return $bilingualService->formatAmount($amount, $language);
        };

        $lines = '';
        $student = $payment->student;
        $workingYear = $payment->schoolYear;

        // Récupérer toutes les tranches possibles
        $allTranches = PaymentTranche::orderBy('order')->get();
        
        // Récupérer les paiements de cet étudiant pour cette année
        $studentPayments = Payment::where('student_id', $student->id)
            ->where('school_year_id', $workingYear->id)
            ->with(['paymentDetails.paymentTranche'])
            ->get();

        // Créer un mapping des tranches payées
        $paidTranches = [];
        foreach ($studentPayments as $studentPayment) {
            foreach ($studentPayment->paymentDetails as $detail) {
                $trancheId = $detail->payment_tranche_id;
                if (!isset($paidTranches[$trancheId])) {
                    $paidTranches[$trancheId] = 0;
                }
                $paidTranches[$trancheId] += $detail->amount;
            }
        }

        // Ajouter d'abord les frais spéciaux selon l'école
        $lines .= $this->getSchoolSpecificFeeLines($school, $student, $paidTranches, $formatAmount);

        // Ensuite ajouter les tranches de scolarité payées dans ce paiement
        foreach ($payment->paymentDetails as $detail) {
            $tranche = $detail->paymentTranche;
            $status = '<span style="color: #059669; font-weight: bold;">✓ PAYÉ</span>';
            
            $lines .= "
                <tr>
                    <td style='border: 1px solid #ddd; padding: 6px;'>{$tranche->description}</td>
                    <td style='border: 1px solid #ddd; padding: 6px; text-align: right;'>" . $formatAmount($detail->amount) . "</td>
                    <td style='border: 1px solid #ddd; padding: 6px; text-align: center;'>{$status}</td>
                </tr>
            ";
        }

        return $lines;
    }

    /**
     * Obtenir les lignes de frais spécifiques à l'école
     */
    private function getSchoolSpecificFeeLines($school, $student, $paidTranches, $formatAmount)
    {
        $lines = '';

        // Montants par école selon le UniversitySeeder
        switch ($school->code) {
            case 'INSSAS':
                $lines .= $this->addFeeLineIfExists('Frais Étude Dossier', 10000, $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Inscription', 200000, $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Rames Papier', '6 rames', $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Tutelle Universitaire', 50000, $paidTranches, $formatAmount);
                break;
                
            case 'ESGIT':
                $lines .= $this->addFeeLineIfExists('Frais Étude Dossier', 5000, $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Inscription', 40000, $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Rames Papier', '4 rames', $paidTranches, $formatAmount);
                break;
                
            case 'ESJEC':
                $lines .= $this->addFeeLineIfExists('Frais Étude Dossier', 10000, $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Inscription', 50000, $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Rames Papier', '4 rames', $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Tutelle Universitaire', 50000, $paidTranches, $formatAmount);
                break;
                
            case 'ESSIT':
                $lines .= $this->addFeeLineIfExists('Frais Étude Dossier', 8000, $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Inscription', 45000, $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Rames Papier', '4 rames', $paidTranches, $formatAmount);
                break;
                
            case 'ISTPM':
                $lines .= $this->addFeeLineIfExists('Frais Étude Dossier', 5000, $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Inscription', 20000, $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Rames Papier', '2 rames', $paidTranches, $formatAmount);
                break;
                
            case 'ISTMS':
                $lines .= $this->addFeeLineIfExists('Frais Étude Dossier', 8000, $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Inscription', 35000, $paidTranches, $formatAmount);
                $lines .= $this->addFeeLineIfExists('Rames Papier', '3 rames', $paidTranches, $formatAmount);
                break;
        }

        return $lines;
    }

    /**
     * Ajouter une ligne de frais si elle existe dans les paiements
     */
    private function addFeeLineIfExists($trancheName, $expectedAmount, $paidTranches, $formatAmount)
    {
        $tranche = PaymentTranche::where('name', $trancheName)->first();
        
        if ($tranche && isset($paidTranches[$tranche->id])) {
            $paidAmount = $paidTranches[$tranche->id];
            $status = '<span style="color: #059669; font-weight: bold;">✓ PAYÉ</span>';
            
            $displayAmount = is_numeric($expectedAmount) ? $formatAmount($paidAmount) : $expectedAmount;
            
            return "
                <tr>
                    <td style='border: 1px solid #ddd; padding: 6px;'>{$tranche->description}</td>
                    <td style='border: 1px solid #ddd; padding: 6px; text-align: right;'>{$displayAmount}</td>
                    <td style='border: 1px solid #ddd; padding: 6px; text-align: center;'>{$status}</td>
                </tr>
            ";
        }
        
        return '';
    }

    /**
     * Obtenir le logo de l'école
     */
    private function getSchoolLogo($school)
    {
        // Pour l'instant, utiliser le logo principal
        // Plus tard, on pourra avoir des logos spécifiques par école
        $schoolSetting = SchoolSetting::getSettings();
        if ($schoolSetting->school_logo) {
            $logoPath = storage_path('app/public/' . $schoolSetting->school_logo);
            if (file_exists($logoPath)) {
                return 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath));
            }
        }
        return null;
    }

    /**
     * Obtenir la devise de l'école
     */
    private function getSchoolMotto($school)
    {
        $mottos = [
            'INSSAS' => 'Excellence en Sciences de la Santé',
            'ESGIT' => 'Innovation Technologique et Génie Informatique',
            'ESJEC' => 'Droit, Justice et Excellence Académique',
            'ESSIT' => 'Bâtir l\'Avenir avec Excellence',
            'ISTPM' => 'Formation Professionnelle de Qualité',
            'ISTMS' => 'Santé, Médecine et Service'
        ];
        
        return $mottos[$school->code] ?? 'Excellence et Formation de Qualité';
    }

    /**
     * Obtenir les informations spécifiques à l'école
     */
    private function getSchoolSpecificInfo($school, $student, $payment)
    {
        $info = '';
        
        switch ($school->code) {
            case 'INSSAS':
                if ($student->scholarship_amount > 0) {
                    $info .= "<div><strong>Bourse INSSAS:</strong> " . number_format($student->scholarship_amount, 0, ',', ' ') . " FCFA</div>";
                }
                if ($student->laptop_eligible) {
                    $info .= "<div style='color: #059669;'><strong>✓ Éligible ordinateur portable</strong></div>";
                }
                $info .= "<div><strong>Formation:</strong> Sciences de la Santé</div>";
                break;
                
            case 'ESGIT':
                if ($student->bts_mention) {
                    $info .= "<div><strong>Mention BTS:</strong> {$student->bts_mention}</div>";
                }
                if ($student->scholarship_amount > 0) {
                    $info .= "<div><strong>Bourse ESGIT:</strong> " . number_format($student->scholarship_amount, 0, ',', ' ') . " FCFA</div>";
                }
                break;
                
            case 'ISTPM':
                if ($student->scholarship_amount > 0) {
                    $info .= "<div><strong>Bourse ISTPM:</strong> " . number_format($student->scholarship_amount, 0, ',', ' ') . " FCFA</div>";
                }
                break;
        }
        
        if (empty($info)) {
            $info = "<div>Année scolaire: {$payment->schoolYear->name}</div>";
        }
        
        return $info;
    }
}