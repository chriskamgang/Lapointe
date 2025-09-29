<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\SchoolSetting;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

class ReceiptCustomizationService
{
    protected $paymentStatusService;

    public function __construct(PaymentStatusService $paymentStatusService)
    {
        $this->paymentStatusService = $paymentStatusService;
    }

    public function generateCustomizedReceiptHtml($payment, $schoolSettings)
    {
        $student = $payment->student;
        if (!$student) {
            throw new \Exception("Étudiant non trouvé pour le paiement ID: {$payment->id}");
        }

        $classSeries = $student->classSeries;
        $schoolClass = $classSeries ? $classSeries->schoolClass : null;
        $level = $schoolClass ? $schoolClass->level : null;
        $school = $level ? $level->school : null;

        $paymentStatus = $this->paymentStatusService->getStatusForStudent($student, $payment->schoolYear);

        $formatAmount = function ($amount) {
            return number_format($amount, 0, ', ', ' ');
        };

        $logoUrl = '';
        if ($schoolSettings->school_logo && Storage::exists('public/' . $schoolSettings->school_logo)) {
            $logoUrl = asset('storage/' . $schoolSettings->school_logo);
        } else {
            $logoUrl = asset('assets/logo.png');
        }

        $institutName = $schoolSettings->school_name ?? 'INSTITUT UNIVERSITAIRE DE LA POINTE';
        $schoolName = $school ? $school->name : 'École non définie';
        $location = $schoolSettings->school_address ?? 'Bafoussam';
        $companyNumber = 'M06T216274500L';
        $email = $schoolSettings->school_email ?? 'contact@iu-pointe.fr';
        $website = $schoolSettings->school_website ?? 'www.iu-pointe.fr';
        $phone = $schoolSettings->school_phone ?? '+237 655 12 49 21';

        $receiptNumber = $payment->receipt_number;
        $paymentDate = Carbon::parse($payment->payment_date)->format('d/m/Y');
        $currentDateTime = now()->format('d/m/Y à H:i');

        $totalRequired = $paymentStatus->total_required;
        $totalPaid = $paymentStatus->total_paid;
        $remainingAmount = $paymentStatus->total_remaining;
        
        $isFirstPayment = ($totalPaid - $payment->total_amount) == 0;
        $hasScholarship = $payment->has_scholarship && $payment->scholarship_amount > 0 && $isFirstPayment;

        $paymentDeadline = $paymentStatus->discount_deadline ? $paymentStatus->discount_deadline->format('d/m/Y') : 'N/A';

        $receiptContent = '';
        for ($copy = 1; $copy <= 2; $copy++) {
            $receiptContent .= $this->generateReceiptCopy(
                $logoUrl,
                $institutName,
                $schoolName,
                $location,
                $companyNumber,
                $email,
                $website,
                $phone,
                $receiptNumber,
                $paymentDate,
                $currentDateTime,
                $student,
                $schoolClass,
                $classSeries,
                $payment,
                $formatAmount,
                $totalRequired,
                $totalPaid,
                $remainingAmount,
                $hasScholarship,
                $paymentDeadline,
                $schoolSettings,
                $paymentStatus
            );
        }

        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <title>Reçu de Paiement - {$receiptNumber}</title>
            <style>
                @page {
                    size: A4 landscape;
                    margin: 0.5cm;
                }
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    font-size: 9px;
                    line-height: 1.3;
                    color: #333;
                }
                .receipt-main-container {
                    display: flex;
                    flex-direction: row;
                    gap: 5mm;
                }
                .receipt-copy {
                    width: 140mm;
                    height: 175mm;
                    padding: 5mm;
                    border: 1px solid #000;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #000;
                    padding-bottom: 3mm;
                    margin-bottom: 3mm;
                }
                .header-left .logo-section {
                    margin-bottom: 2mm;
                }
                .header-left .logo-section img {
                    width: 25mm;
                    height: auto;
                }
                .header-left .institute-info h2 {
                    margin: 0; font-size: 11px; font-weight: bold; color: #000;
                }
                .header-left .institute-info h3 {
                    margin: 0; font-size: 10px; color: #000;
                }
                .header-left .institute-info div {
                    font-size: 8px; margin-top: 1px;
                }
                .receipt-title-section {
                    text-align: right;
                }
                .receipt-title {
                    font-size: 14px; font-weight: bold; margin: 0 0 1mm 0;
                }
                .receipt-date { font-size: 10px; }
                .payment-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 8px;
                    margin-bottom: 3mm;
                }
                .payment-table th, .payment-table td {
                    border: 1px solid #999;
                    padding: 1.5mm;
                    text-align: center;
                }
                .payment-table th { background-color: #f2f2f2; font-weight: bold; }
                .payment-table .text-left { text-align: left; }
                .payment-table .text-right { text-align: right; }
                .scholarship-row td { background-color: #e8f5e9; font-weight: bold; }
                .summary-section {
                    border-top: 1px solid #000;
                    padding-top: 2mm;
                    margin-top: 2mm;
                }
                .summary-line {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 1mm;
                }
                .summary-line span {
                    display: inline-block;
                    width: 30mm;
                    text-align: right;
                }
                .summary-line span.label { font-weight: normal; }
                .summary-line span.value { font-weight: bold; }
                .bottom-section {
                    border-top: 1px solid #000;
                    padding-top: 2mm;
                    margin-top: 2mm;
                    font-size: 8px;
                }
                .signature-section {
                    margin-top: auto; /* Pushes to the bottom */
                    padding-top: 5mm;
                    text-align: center;
                }
                .signature-line {
                    border-top: 1px dotted #000;
                    width: 60mm;
                    margin: 0 auto;
                    padding-top: 1mm;
                    font-size: 9px;
                }
                .footer {
                    font-size: 7px;
                    color: #666;
                    text-align: center;
                    border-top: 1px solid #eee;
                    padding-top: 2mm;
                    margin-top: 3mm;
                }
            </style>
        </head>
        <body>
            <div class='receipt-main-container'>
               {$receiptContent}
            </div>
        </body>
        </html>
        ";

        return $html;
    }

    private function generateReceiptCopy(
        $logoUrl,
        $institutName,
        $schoolName,
        $location,
        $companyNumber,
        $email,
        $website,
        $phone,
        $receiptNumber,
        $paymentDate,
        $currentDateTime,
        $student,
        $schoolClass,
        $classSeries,
        $payment,
        $formatAmount,
        $totalRequired,
        $totalPaid,
        $remainingAmount,
        $hasScholarship,
        $paymentDeadline,
        $schoolSettings,
        $paymentStatus
    ) {
        $tableRows = '';
        $rowNumber = 1;
        $totalTTC_sum = 0;

        $details = $payment->paymentDetails->sortBy(function ($detail) {
            if (stripos($detail->paymentTranche->name, 'Rame') !== false) {
                return 0; // "Rame" comes first
            }
            return 1; // Everything else after
        });

        // Vérifier si la rame a été payée physiquement pour cet étudiant
        $ramePhysicalStatus = \App\Models\StudentEquipmentStatus::where('student_id', $student->id)
            ->where('school_year_id', $payment->school_year_id)
            ->where('equipment_type', 'rame')
            ->where('brought_physical', true)
            ->first();

        $rameAlreadyHandled = false;
        // Si la rame a été payée physiquement, l'ajouter au reçu
        if ($ramePhysicalStatus) {
            $rameTranche = \App\Models\PaymentTranche::where(function($query) {
                $query->where('name', 'LIKE', '%rame%')
                      ->orWhere('name', 'LIKE', '%Rame%');
            })->first();
            
            if ($rameTranche) {
                $rameAmount = $rameTranche->getAmountForStudent($student, false, false, false);
                if ($rameAmount > 0) {
                    $totalTTC_sum += $rameAmount;
                    $tableRows .= "
                    <tr>
                        <td class='text-left'>Rames de papier (Apport physique)</td>
                        <td>REF-" . str_pad($rowNumber, 2, '0', STR_PAD_LEFT) . "</td>
                        <td class='text-right'>{$formatAmount($rameAmount)}</td>
                        <td class='text-right'>{$formatAmount($rameAmount)}</td>
                        <td class='text-right'>0%</td>
                        <td class='text-right'>0</td>
                        <td class='text-right'>{$formatAmount($rameAmount)}</td>
                    </tr>";
                    $rowNumber++;
                    $rameAlreadyHandled = true;
                }
            }
        }

        foreach ($details as $detail) {
            if ($rameAlreadyHandled && $detail->paymentTranche && stripos($detail->paymentTranche->name, 'Rames de papier') !== false) {
                continue;
            }

            $trancheName = $detail->paymentTranche->name;
            $totalTTC = $detail->amount_allocated;
            $totalTTC_sum += $totalTTC;

            $tableRows .= "
            <tr>
                <td class='text-left'>{$trancheName}</td>
                <td>REF-" . str_pad($rowNumber, 2, '0', STR_PAD_LEFT) . "</td>
                <td class='text-right'>{$formatAmount($totalTTC)}</td>
                <td class='text-right'>{$formatAmount($totalTTC)}</td>
                <td class='text-right'>0%</td>
                <td class='text-right'>0</td>
                <td class='text-right'>{$formatAmount($totalTTC)}</td>
            </tr>";
            $rowNumber++;
        }

        // Afficher la bourse SEULEMENT sur le premier reçu
        $studentScholarshipAmount = $paymentStatus->total_scholarship_amount;
        // Le premier reçu = le reçu du paiement avec l'ID le plus petit pour cet étudiant
        $firstPayment = \App\Models\Payment::where('student_id', $student->id)
            ->where('school_year_id', $payment->school_year_id)
            ->orderBy('id', 'asc')
            ->first();
        $isFirstReceipt = ($firstPayment && $firstPayment->id == $payment->id);
        
        if ($studentScholarshipAmount > 0 && $isFirstReceipt) {
            $tableRows .= "
            <tr class='scholarship-row'>
                <td class='text-left'>🎓 Bourse d'études (Information)</td>
                <td>INFO</td>
                <td class='text-right'>-{$formatAmount($studentScholarshipAmount)}</td>
                <td class='text-right'>-{$formatAmount($studentScholarshipAmount)}</td>
                <td class='text-right'>0%</td>
                <td class='text-right'>0</td>
                <td class='text-right'>-{$formatAmount($studentScholarshipAmount)}</td>
            </tr>";
        }

        // Afficher également la bourse du paiement actuel si c'est un premier paiement avec bourse
        if ($hasScholarship && $payment->scholarship_amount > 0) {
            $scholarshipAmount = $payment->scholarship_amount;
            $totalTTC_sum -= $scholarshipAmount;
            // Si on n'a pas déjà affiché la bourse générale, l'afficher
            if ($studentScholarshipAmount == 0) {
                $tableRows .= "
                <tr class='scholarship-row'>
                    <td class='text-left'>Bourse d'études</td>
                    <td>BOURSE</td>
                    <td class='text-right'>-{$formatAmount($scholarshipAmount)}</td>
                    <td class='text-right'>-{$formatAmount($scholarshipAmount)}</td>
                    <td class='text-right'>0%</td>
                    <td class='text-right'>0</td>
                    <td class='text-right'>-{$formatAmount($scholarshipAmount)}</td>
                </tr>";
            }
        }

        return "
        <div class='receipt-copy'>
            <div class='header'>
                <div class='header-left'>
                    <div class='logo-section'>
                        <img src='{$logoUrl}' alt='Logo Institut'>
                    </div>
                    <div class='institute-info'>
                        <h2>{$institutName}</h2>
                        <h3>{$schoolName}</h3>
                        <div>{$location}</div>
                        <div><strong>N° Contribuable:</strong> {$companyNumber}</div>
                        <div><strong>Email:</strong> {$email}</div>
                        <div><strong>Web:</strong> {$website}</div>
                        <div><strong>Tél:</strong> {$phone}</div>
                    </div>
                </div>
                <div class='receipt-title-section'>
                    <div class='receipt-title'>Reçu de paiement N° {$receiptNumber}</div>
                    <div class='receipt-date'>Date: {$paymentDate}</div>
                </div>
            </div>

            <div style='padding: 1mm 0; font-size: 9px; border-top: 1px solid #EEE; border-bottom: 1px solid #EEE; margin-bottom: 1mm;'>
                <strong>Étudiant:</strong> {$student->full_name}<br>
                <strong>Matricule:</strong> {$student->student_number}<br>
                <strong>Spécialité:</strong> " . ($schoolClass ? $schoolClass->name : 'N/A') . "
            </div>

            <table class='payment-table'>
                <thead>
                    <tr>
                        <th style='width: 34%'>Désignation</th>
                        <th style='width: 10%'>Réf.</th>
                        <th style='width: 12%'>PU HT</th>
                        <th style='width: 12%'>Total HT</th>
                        <th style='width: 8%'>TVA</th>
                        <th style='width: 12%'>Total TVA</th>
                        <th style='width: 12%'>TOTAL TTC</th>
                    </tr>
                </thead>
                <tbody>
                    {$tableRows}
                </tbody>
            </table>

            <div class='summary-section'>
                <div class='summary-line'><span class='label'>Total HT:</span><span class='value'>{$formatAmount($totalTTC_sum)}</span></div>
                <div class='summary-line'><span class='label'>Total TVA:</span><span class='value'>0 FCFA</span></div>
                <div class='summary-line'><span class='label'>Total TTC:</span><span class='value'>{$formatAmount($totalTTC_sum)}</span></div>
            </div>

            <div class='bottom-section'>
                <div><strong>Montant déjà payé:</strong> {$formatAmount($totalPaid)}</div>
                <div><strong>Reste à payer:</strong> {$formatAmount($remainingAmount)}</div>
                " . ($studentScholarshipAmount > 0 && $isFirstReceipt ? "<div style='color: #28a745;'><strong>🎓 Bonne nouvelle!</strong> Vous bénéficiez d'une bourse de " . $formatAmount($studentScholarshipAmount) . ". Cette réduction est automatiquement appliquée dans vos calculs.</div>" : "") . "
                <div><strong>Date limite de règlement:</strong> {$paymentDeadline}</div>
                <hr>
                <div><strong>Banque:</strong> CCA</div>
                <div><strong>IBAN:</strong> 10039-10001-01357922101-64</div>
                <div>LE PAIEMENT DES FRAIS DE SCOLARITE SE FAIT DANS LE COMPTE INSSAS n 10039-10001-01357922101-64 CCA BANK BAFOUSSAM</div>
            </div>

            <div class='signature-section'>
                <div class='signature-line'>Cachet et signature de l'école</div>
            </div>

            <div class='footer'>
                Les frais de scolarité et d'étude de dossier ne sont pas remboursables en cas d'abandon ou d'exclusion.
                Ce reçu fait foi du paiement effectué - À conserver précieusement<br>
                Généré le {$currentDateTime} par le système {$institutName}
            </div>
        </div>";
    }
