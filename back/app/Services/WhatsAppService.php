<?php

namespace App\Services;

use App\Models\SchoolSetting;
use App\Models\Need;
use App\Models\Student;
use App\Models\Attendance;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected $apiUrl;
    protected $apiKey;

    public function __construct()
    {
        // Configuration dynamique basée sur les paramètres de l'école
        $settings = SchoolSetting::getSettings();
        $this->apiUrl = $settings->whatsapp_api_url;
        $this->apiKey = $settings->whatsapp_token;
    }

    /**
     * Envoyer une notification WhatsApp pour un nouveau besoin
     */
    public function sendNewNeedNotification(Need $need)
    {
        $settings = SchoolSetting::getSettings();
        
        if (!$settings->whatsapp_notifications_enabled || 
            !$settings->whatsapp_notification_number ||
            !$settings->whatsapp_api_url ||
            !$settings->whatsapp_instance_id ||
            !$settings->whatsapp_token) {
            Log::info('Configuration WhatsApp incomplète');
            return false;
        }

        $message = $this->formatNewNeedMessage($need);
        
        return $this->sendMessage($settings->whatsapp_notification_number, $message);
    }


    /**
     * Envoyer une notification de changement de statut à l'admin
     */
    public function sendStatusUpdateNotification(Need $need, $previousStatus)
    {
        $settings = SchoolSetting::getSettings();
        
        if (!$this->isWhatsAppConfigured()) {
            return false;
        }

        $message = $this->formatStatusUpdateMessage($need, $previousStatus);
        
        return $this->sendMessage($settings->whatsapp_notification_number, $message);
    }

    /**
     * Envoyer une notification de changement de statut au demandeur
     */
    public function sendStatusUpdateNotificationToRequester(Need $need, $previousStatus)
    {
        if (!$this->isWhatsAppConfigured()) {
            return false;
        }

        // Vérifier que l'utilisateur a un numéro de téléphone
        if (!$need->user || !$need->user->contact) {
            Log::info('Utilisateur sans numéro de téléphone pour notification WhatsApp', [
                'need_id' => $need->id,
                'user_id' => $need->user_id
            ]);
            return false;
        }

        $message = $this->formatStatusUpdateMessageForRequester($need, $previousStatus);
        
        return $this->sendMessage($need->user->contact, $message);
    }

    /**
     * Envoyer une notification de paiement avec facture aux parents
     */
    public function sendPaymentNotification($payment)
    {
        if (!$this->isWhatsAppConfigured()) {
            return false;
        }

        $student = $payment->student;
        
        // Vérifier que l'étudiant a un contact parent
        if (!$student || !$student->parent_phone) {
            Log::info('Étudiant sans contact parent pour notification de paiement WhatsApp', [
                'payment_id' => $payment->id,
                'student_id' => $student ? $student->id : null
            ]);
            return false;
        }

        $message = $this->formatPaymentMessage($payment);
        
        // D'abord envoyer le message texte
        $textResult = $this->sendMessage($student->parent_phone, $message);
        
        // Ensuite générer et envoyer l'image du reçu
        $imageResult = false;
        try {
            $receiptImageUrl = $this->generateReceiptImage($payment);
            if ($receiptImageUrl) {
                $imageResult = $this->sendImageMessage($student->parent_phone, $receiptImageUrl, "Reçu de paiement N° {$payment->id}");
            }
        } catch (\Exception $e) {
            Log::error('Erreur lors de la génération/envoi de l\'image du reçu', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage()
            ]);
        }
        
        if ($textResult || $imageResult) {
            Log::info('Notification de paiement WhatsApp envoyée', [
                'payment_id' => $payment->id,
                'student_id' => $student->id,
                'parent_phone' => $student->parent_phone,
                'text_sent' => $textResult,
                'image_sent' => $imageResult
            ]);
        }
        
        return $textResult; // Au minimum le message texte doit passer
    }

    /**
     * Envoyer une notification d'alerte de stock faible
     */
    public function sendLowStockAlert($items)
    {
        $settings = SchoolSetting::getSettings();
        
        if (!$settings->whatsapp_notifications_enabled || 
            !$settings->whatsapp_notification_number ||
            !$settings->whatsapp_api_url ||
            !$settings->whatsapp_instance_id ||
            !$settings->whatsapp_token) {
            Log::info('Configuration WhatsApp incomplète pour alerte stock');
            return false;
        }

        $message = $this->formatLowStockMessage($items);
        
        return $this->sendMessage($settings->whatsapp_notification_number, $message);
    }

    /**
     * Envoyer une notification d'entrée/sortie aux parents
     */
    public function sendAttendanceNotification(Attendance $attendance)
    {
        if (!$this->isWhatsAppConfigured()) {
            return false;
        }

        $student = $attendance->student;
        
        // Vérifier que l'étudiant a un contact parent
        if (!$student || !$student->parent_phone) {
            Log::info('Étudiant sans contact parent pour notification WhatsApp', [
                'attendance_id' => $attendance->id,
                'student_id' => $student ? $student->id : null
            ]);
            return false;
        }

        $message = $this->formatAttendanceMessage($attendance);
        
        $result = $this->sendMessage($student->parent_phone, $message);
        
        if ($result) {
            // Marquer comme notifié
            $attendance->update([
                'parent_notified' => true,
                'notified_at' => now()
            ]);
        }
        
        return $result;
    }

    /**
     * Formater le message de notification de paiement
     */
    protected function formatPaymentMessage($payment)
    {
        $schoolName = SchoolSetting::getSettings()->school_name ?? 'École';
        $student = $payment->student;
        
        // Informations sur le paiement
        $paymentAmount = number_format($payment->total_amount, 0, ',', ' ') . ' FCFA';
        $paymentDate = $payment->payment_date->format('d/m/Y');
        $paymentTime = $payment->created_at->format('H:i');
        
        // Informations sur les réductions si applicable
        $reductionText = '';
        if ($payment->has_reduction && $payment->reduction_amount > 0) {
            $reductionAmount = number_format($payment->reduction_amount, 0, ',', ' ') . ' FCFA';
            $reductionText = "\n💰 *Réduction appliquée:* {$reductionAmount}";
        }
        
        // Méthode de paiement
        $paymentMethodText = match($payment->payment_method) {
            'cash' => '💵 Espèces',
            'card' => '💳 Carte bancaire',
            'transfer' => '🏦 Virement',
            'check' => '📝 Chèque',
            'rame_physical' => '🎫 RAME (Physique)',
            default => $payment->payment_method
        };
        
        // Numéro de référence si disponible
        $referenceText = $payment->reference_number ? 
            "\n📄 *Référence:* {$payment->reference_number}" : '';
        
        return "✅ *PAIEMENT CONFIRMÉ - {$schoolName}*\n\n" .
               "👤 *Élève:* {$student->full_name}\n" .
               "📚 *Classe:* " . ($student->classSeries->name ?? 'N/A') . "\n" .
               "💳 *Méthode:* {$paymentMethodText}\n" .
               "💰 *Montant payé:* {$paymentAmount}" . $reductionText . "\n" .
               "📅 *Date:* {$paymentDate} à {$paymentTime}" . $referenceText . "\n\n" .
               "📄 *Reçu de paiement:* Un reçu détaillé a été généré.\n\n" .
               "✨ Merci pour votre confiance !\n\n" .
               "📱 Notification automatique du système de gestion scolaire.";
    }

    /**
     * Générer le reçu de paiement (version simplifiée pour WhatsApp)
     */
    protected function generatePaymentReceipt($payment)
    {
        // Cette méthode pourrait générer un PDF du reçu ou retourner du HTML
        // Pour l'instant, on retourne les informations essentielles
        $student = $payment->student;
        $schoolName = SchoolSetting::getSettings()->school_name ?? 'École';
        
        return "REÇU DE PAIEMENT N° {$payment->id}\n" .
               "École: {$schoolName}\n" .
               "Élève: {$student->full_name}\n" .
               "Montant: " . number_format($payment->total_amount, 0, ',', ' ') . " FCFA\n" .
               "Date: " . $payment->payment_date->format('d/m/Y H:i');
    }

    /**
     * Formater le message de notification d'entrée/sortie
     */
    protected function formatAttendanceMessage(Attendance $attendance)
    {
        $schoolName = SchoolSetting::getSettings()->school_name ?? 'École';
        $student = $attendance->student;
        
        // Gérer les absences
        if (!$attendance->is_present) {
            return "⚠️ *ABSENCE SIGNALÉE - {$schoolName}*\n\n" .
                   "👤 *Élève:* {$student->full_name}\n" .
                   "📚 *Classe:* " . ($student->classSeries->name ?? 'N/A') . "\n" .
                   "📅 *Date:* " . $attendance->attendance_date->format('d/m/Y') . "\n" .
                   "🕐 *Heure de contrôle:* " . $attendance->scanned_at->format('H:i') . "\n\n" .
                   "❌ Votre enfant n'était pas présent lors du contrôle de présence.\n\n" .
                   "📞 Veuillez contacter l'école si votre enfant devait être présent.\n\n" .
                   "📱 Notification automatique du système de gestion scolaire.";
        }
        
        // Messages pour présences (entrée/sortie)
        $eventIcon = $attendance->event_type === 'entry' ? '🟢' : '🔴';
        $eventText = $attendance->event_type === 'entry' ? 'ENTRÉE' : 'SORTIE';
        $eventMessage = $attendance->event_type === 'entry' 
            ? 'est arrivé(e) à l\'école' 
            : 'a quitté l\'école';
        
        return "{$eventIcon} *{$eventText} DÉTECTÉE - {$schoolName}*\n\n" .
               "👤 *Élève:* {$student->full_name}\n" .
               "📚 *Classe:* " . ($student->classSeries->name ?? 'N/A') . "\n" .
               "🕐 *Heure:* " . $attendance->scanned_at->format('H:i') . "\n" .
               "📅 *Date:* " . $attendance->attendance_date->format('d/m/Y') . "\n\n" .
               "ℹ️ Votre enfant {$eventMessage} à {$attendance->scanned_at->format('H:i')}.\n\n" .
               "📱 Notification automatique du système de gestion scolaire.";
    }

    /**
     * Formater le message pour une alerte de stock faible
     */
    protected function formatLowStockMessage($items)
    {
        $schoolName = SchoolSetting::getSettings()->school_name ?? 'École';
        $itemCount = is_countable($items) ? count($items) : 0;
        
        if ($itemCount === 0) {
            return "✅ *STOCK NORMAL - {$schoolName}*\n\n" .
                   "Aucun article en stock faible actuellement.\n\n" .
                   "📱 Notification automatique du système de gestion d'inventaire.";
        }
        
        $message = "⚠️ *ALERTE STOCK FAIBLE - {$schoolName}*\n\n" .
                   "📦 *{$itemCount}* article" . ($itemCount > 1 ? 's' : '') . " nécessite" . ($itemCount > 1 ? 'nt' : '') . " un réapprovisionnement :\n\n";
        
        $count = 0;
        foreach ($items as $item) {
            if ($count >= 10) { // Limiter à 10 articles pour éviter des messages trop longs
                $remaining = $itemCount - $count;
                $message .= "➕ ... et {$remaining} autre" . ($remaining > 1 ? 's' : '') . " article" . ($remaining > 1 ? 's' : '') . "\n\n";
                break;
            }
            
            $stockLevel = $item->quantite <= 0 ? '❌ RUPTURE' : 
                         ($item->quantite <= $item->quantite_min / 2 ? '🔴 CRITIQUE' : '🟠 FAIBLE');
            
            $message .= "• *{$item->nom}* ({$item->categorie})\n" .
                       "  📍 {$item->localisation}\n" .
                       "  📊 Stock: {$item->quantite}/{$item->quantite_min} - {$stockLevel}\n\n";
            $count++;
        }
        
        $message .= "🎯 *Action requise :*\n" .
                   "• Vérifiez les stocks physiques\n" .
                   "• Planifiez les achats nécessaires\n" .
                   "• Contactez les responsables concernés\n\n" .
                   "📅 Alerte générée le " . now()->format('d/m/Y à H:i') . "\n\n" .
                   "📱 Notification automatique du système de gestion d'inventaire.";
        
        return $message;
    }

    /**
     * Formater le message pour un nouveau besoin
     */
    protected function formatNewNeedMessage(Need $need)
    {
        $schoolName = SchoolSetting::getSettings()->school_name ?? 'École';
        
        return "🔔 *NOUVEAU BESOIN - {$schoolName}*\n\n" .
               "👤 *Demandeur:* {$need->user->name}\n" .
               "📝 *Besoin:* {$need->name}\n" .
               "💰 *Montant:* {$need->formatted_amount}\n" .
               "📄 *Description:* {$need->description}\n\n" .
               "📅 *Soumis le:* " . $need->created_at->format('d/m/Y à H:i') . "\n\n" .
               "⚠️ Ce besoin nécessite votre attention pour approbation/rejet.";
    }


    /**
     * Formater le message pour un changement de statut (admin)
     */
    protected function formatStatusUpdateMessage(Need $need, $previousStatus)
    {
        $schoolName = SchoolSetting::getSettings()->school_name ?? 'École';
        $statusIcon = $need->isApproved() ? '✅' : '❌';
        
        $approvedByName = $need->approvedBy ? $need->approvedBy->name : 'Système';
        $approvedDate = $need->approved_at ? $need->approved_at->format('d/m/Y à H:i') : 'N/A';
        $rejectionText = $need->rejection_reason ? "📝 *Motif du rejet:* {$need->rejection_reason}\n\n" : '';
        
        return "{$statusIcon} *BESOIN MIS À JOUR - {$schoolName}*\n\n" .
               "👤 *Demandeur:* {$need->user->name}\n" .
               "📝 *Besoin:* {$need->name}\n" .
               "💰 *Montant:* {$need->formatted_amount}\n\n" .
               "🔄 *Statut:* {$previousStatus} → *{$need->status_label}*\n" .
               "👨‍💼 *Traité par:* {$approvedByName}\n" .
               "📅 *Le:* {$approvedDate}\n\n" .
               $rejectionText .
               "ℹ️ Besoin traité dans le système de gestion.";
    }

    /**
     * Formater le message pour un changement de statut (demandeur)
     */
    protected function formatStatusUpdateMessageForRequester(Need $need, $previousStatus)
    {
        $schoolName = SchoolSetting::getSettings()->school_name ?? 'École';
        $statusIcon = $need->isApproved() ? '✅' : '❌';
        
        if ($need->isApproved()) {
            return "✅ *BONNE NOUVELLE !*\n\n" .
                   "Votre demande de besoin a été *APPROUVÉE* par l'administration de {$schoolName}.\n\n" .
                   "📝 *Besoin:* {$need->name}\n" .
                   "💰 *Montant:* {$need->formatted_amount}\n" .
                   "📅 *Approuvé le:* " . $need->approved_at->format('d/m/Y à H:i') . "\n\n" .
                   "🎉 Votre demande a été acceptée. Vous pouvez vous rapprocher de l'administration pour la suite des démarches.\n\n" .
                   "Merci pour votre confiance !";
        } else {
            $rejectionText = $need->rejection_reason ? "\n\n📝 *Motif:* {$need->rejection_reason}" : '';
            
            return "❌ *DEMANDE REJETÉE*\n\n" .
                   "Nous regrettons de vous informer que votre demande de besoin a été *REJETÉE* par l'administration de {$schoolName}.\n\n" .
                   "📝 *Besoin:* {$need->name}\n" .
                   "💰 *Montant:* {$need->formatted_amount}\n" .
                   "📅 *Rejeté le:* " . $need->approved_at->format('d/m/Y à H:i') . 
                   $rejectionText . "\n\n" .
                   "💡 N'hésitez pas à contacter l'administration pour plus d'informations ou à soumettre une nouvelle demande si nécessaire.";
        }
    }

    /**
     * Générer une image du reçu de paiement
     */
    protected function generateReceiptImage($payment)
    {
        try {
            // Récupérer le HTML du reçu depuis le PaymentController via l'injection de dépendances
            $paymentController = app()->make(\App\Http\Controllers\PaymentController::class);
            $receiptResponse = $paymentController->generateReceipt($payment->id);
            $responseData = $receiptResponse->getData();
            
            if (!$responseData->success) {
                Log::error('Impossible de générer le HTML du reçu', ['payment_id' => $payment->id]);
                return null;
            }
            
            $receiptHtml = $responseData->data->html;
            
            // Utiliser wkhtmltoimage ou une alternative pour convertir HTML en image
            return $this->convertHtmlToImage($receiptHtml, $payment->id);
            
        } catch (\Exception $e) {
            Log::error('Erreur lors de la génération de l\'image du reçu', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Convertir HTML en image
     */
    protected function convertHtmlToImage($html, $paymentId)
    {
        try {
            // Créer un nom de fichier unique
            $filename = "receipt_payment_{$paymentId}_" . time() . ".png";
            $imagePath = storage_path("app/public/receipts/{$filename}");
            
            // Créer le dossier s'il n'existe pas
            $receiptDir = storage_path('app/public/receipts');
            if (!file_exists($receiptDir)) {
                mkdir($receiptDir, 0755, true);
            }
            
            // Méthode simple avec HTML to Image via navigateur headless (nécessite Chrome/Chromium)
            // Alternative : utiliser une bibliothèque comme Browsershot ou wkhtmltoimage
            
            // Pour une implémentation rapide, créons une image simple avec du texte
            $this->createSimpleReceiptImage($html, $imagePath, $paymentId);
            
            // Retourner l'URL publique
            // Note: Pour que UltraMsg puisse accéder à l'image, l'URL doit être publiquement accessible
            // En local, utiliser ngrok ou héberger sur un serveur public
            $publicUrl = url("storage/receipts/{$filename}");
            
            // Alternative : uploader sur un service cloud (à implémenter si nécessaire)
            // return $this->uploadToCloudService($imagePath, $filename);
            
            // Pour les tests locaux, essayons d'uploader sur un service temporaire
            if (app()->environment('local') && parse_url($publicUrl, PHP_URL_HOST) === 'localhost') {
                $uploadedUrl = $this->uploadToTempImageService($imagePath);
                if ($uploadedUrl) {
                    return $uploadedUrl;
                }
            }
            
            return $publicUrl;
            
        } catch (\Exception $e) {
            Log::error('Erreur lors de la conversion HTML vers image', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Créer une image simple du reçu (version basique sans HTML)
     */
    protected function createSimpleReceiptImage($html, $imagePath, $paymentId)
    {
        // Cette méthode crée une image basique avec GD
        // Pour une version plus avancée, utilisez Browsershot ou wkhtmltoimage
        
        $width = 600;
        $height = 800;
        
        // Créer l'image
        $image = imagecreate($width, $height);
        
        // Définir les couleurs
        $white = imagecolorallocate($image, 255, 255, 255);
        $black = imagecolorallocate($image, 0, 0, 0);
        $blue = imagecolorallocate($image, 0, 102, 204);
        $gray = imagecolorallocate($image, 128, 128, 128);
        
        // Remplir le fond
        imagefill($image, 0, 0, $white);
        
        // Récupérer les données du paiement
        $payment = \App\Models\Payment::with('student.classSeries.schoolClass', 'paymentDetails.paymentTranche')->find($paymentId);
        $schoolName = \App\Models\SchoolSetting::getSettings()->school_name ?? 'École';
        
        // Ajouter le titre
        $y = 30;
        imagestring($image, 5, 150, $y, 'RECU DE PAIEMENT', $blue);
        $y += 50;
        
        // Informations de l'école
        imagestring($image, 3, 50, $y, $schoolName, $black);
        $y += 30;
        
        // Numéro de reçu
        imagestring($image, 4, 50, $y, "Recu N° {$payment->id}", $black);
        $y += 40;
        
        // Informations de l'étudiant
        imagestring($image, 3, 50, $y, "Eleve: {$payment->student->full_name}", $black);
        $y += 25;
        imagestring($image, 3, 50, $y, "Classe: " . ($payment->student->classSeries->name ?? 'N/A'), $black);
        $y += 25;
        
        // Informations du paiement
        $y += 20;
        imagestring($image, 3, 50, $y, "Montant: " . number_format($payment->total_amount, 0, ',', ' ') . " FCFA", $black);
        $y += 25;
        imagestring($image, 3, 50, $y, "Date: " . $payment->payment_date->format('d/m/Y H:i'), $black);
        $y += 25;
        imagestring($image, 3, 50, $y, "Methode: " . ucfirst($payment->payment_method), $black);
        
        if ($payment->reference_number) {
            $y += 25;
            imagestring($image, 3, 50, $y, "Reference: {$payment->reference_number}", $black);
        }
        
        // Détails des tranches payées
        $y += 40;
        imagestring($image, 4, 50, $y, "DETAILS DU PAIEMENT:", $blue);
        $y += 30;
        
        foreach ($payment->paymentDetails as $detail) {
            if ($detail->amount_allocated > 0) {
                $trancheName = $detail->paymentTranche->name;
                $amount = number_format($detail->amount_allocated, 0, ',', ' ');
                imagestring($image, 2, 50, $y, "- {$trancheName}: {$amount} FCFA", $black);
                $y += 20;
            }
        }
        
        // Pied de page
        $y = $height - 80;
        imagestring($image, 2, 50, $y, "Merci pour votre confiance !", $gray);
        $y += 20;
        imagestring($image, 2, 50, $y, "Document genere automatiquement", $gray);
        
        // Sauvegarder l'image
        imagepng($image, $imagePath);
        imagedestroy($image);
    }

    /**
     * Uploader l'image sur un service temporaire accessible publiquement
     */
    protected function uploadToTempImageService($imagePath)
    {
        try {
            // Utiliser un service comme imgbb.com, postimages.org, ou similaire
            // Ici, nous utilisons imgbb.com comme exemple (nécessite une clé API gratuite)
            
            // Encoder l'image en base64
            $imageData = base64_encode(file_get_contents($imagePath));
            
            // Utiliser un service d'upload temporaire (exemple avec imgbb)
            // Vous pouvez créer un compte gratuit sur imgbb.com et obtenir une clé API
            $apiKey = env('IMGBB_API_KEY', null);
            
            if (!$apiKey) {
                Log::info('Aucune clé API imgbb configurée, utilisation de l\'URL locale');
                return null;
            }
            
            $response = Http::asForm()->post('https://api.imgbb.com/1/upload', [
                'key' => $apiKey,
                'image' => $imageData,
                'expiration' => 86400 // Expire dans 24h
            ]);
            
            if ($response->successful()) {
                $responseData = $response->json();
                if (isset($responseData['data']['url'])) {
                    Log::info('Image uploadée sur imgbb avec succès', [
                        'url' => $responseData['data']['url']
                    ]);
                    return $responseData['data']['url'];
                }
            }
            
            Log::warning('Échec upload imgbb', ['response' => $response->body()]);
            return null;
            
        } catch (\Exception $e) {
            Log::error('Erreur lors de l\'upload sur service temporaire', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Envoyer une image via WhatsApp UltraMsg
     */
    protected function sendImageMessage($phoneNumber, $imageUrl, $caption = '')
    {
        try {
            $settings = SchoolSetting::getSettings();
            
            if (!$settings->whatsapp_api_url || !$settings->whatsapp_instance_id || !$settings->whatsapp_token) {
                Log::info('Configuration WhatsApp incomplète pour envoi d\'image');
                return false;
            }

            // URL pour envoyer des images via UltraMsg
            $url = "https://api.ultramsg.com/instance{$settings->whatsapp_instance_id}/messages/image";
            
            $headers = [
                'Content-Type' => 'application/x-www-form-urlencoded'
            ];
            
            $params = [
                'token' => $settings->whatsapp_token,
                'to' => $this->formatPhoneNumber($phoneNumber),
                'image' => $imageUrl,
                'caption' => $caption
            ];

            $response = Http::withHeaders($headers)->asForm()->post($url, $params);

            if ($response->successful()) {
                $responseBody = $response->body();
                Log::info('Image WhatsApp envoyée via UltraMsg', [
                    'to' => $phoneNumber,
                    'image_url' => $imageUrl,
                    'response' => $responseBody
                ]);
                return true;
            } else {
                Log::error('Erreur HTTP lors de l\'envoi d\'image WhatsApp via UltraMsg', [
                    'to' => $phoneNumber,
                    'image_url' => $imageUrl,
                    'status' => $response->status(),
                    'response' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception lors de l\'envoi d\'image WhatsApp via UltraMsg', [
                'to' => $phoneNumber,
                'image_url' => $imageUrl,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Envoyer un message WhatsApp via UltraMsg API selon votre exemple d'intégration
     */
    protected function sendMessage($phoneNumber, $message)
    {
        try {
            $settings = SchoolSetting::getSettings();
            
            // Si aucune API n'est configurée, simuler l'envoi
            if (!$settings->whatsapp_api_url || !$settings->whatsapp_instance_id || !$settings->whatsapp_token) {
                Log::info('Simulation envoi WhatsApp', [
                    'to' => $phoneNumber,
                    'message' => $message
                ]);
                return true;
            }

            // Construction de l'URL selon votre exemple : https://api.ultramsg.com/instance97191/messages/chat
            $url = "https://api.ultramsg.com/instance{$settings->whatsapp_instance_id}/messages/chat";
            
            // Headers selon votre exemple
            $headers = [
                'Content-Type' => 'application/x-www-form-urlencoded'
            ];
            
            // Paramètres selon votre exemple exact
            $params = [
                'token' => $settings->whatsapp_token, // vdnvcpgsd1veydwc dans votre exemple
                'to' => $this->formatPhoneNumber($phoneNumber), // +237676781795 dans votre exemple
                'body' => $message // Le message à envoyer
            ];

            // Utilisation de Http::asForm() pour envoyer en application/x-www-form-urlencoded
            $response = Http::withHeaders($headers)->asForm()->post($url, $params);

            if ($response->successful()) {
                $responseBody = $response->body();
                Log::info('Réponse UltraMsg reçue', [
                    'response' => $responseBody
                ]);
                
                // UltraMsg peut retourner du texte ou du JSON selon le cas
                $responseData = json_decode($responseBody, true);
                
                if ($responseData && isset($responseData['sent']) && $responseData['sent'] === 'true') {
                    Log::info('Message WhatsApp envoyé avec succès via UltraMsg', [
                        'to' => $phoneNumber,
                        'message_id' => $responseData['id'] ?? null,
                        'response' => $responseData
                    ]);
                    return true;
                } else {
                    // Même si pas de JSON valide, considérer comme succès si HTTP 200
                    Log::info('Message WhatsApp probablement envoyé via UltraMsg', [
                        'to' => $phoneNumber,
                        'response' => $responseBody
                    ]);
                    return true;
                }
            } else {
                Log::error('Erreur HTTP lors de l\'envoi WhatsApp via UltraMsg', [
                    'to' => $phoneNumber,
                    'status' => $response->status(),
                    'response' => $response->body()
                ]);
                return false;
            }
        } catch (\Exception $e) {
            Log::error('Exception lors de l\'envoi WhatsApp via UltraMsg', [
                'to' => $phoneNumber,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    /**
     * Vérifier si WhatsApp est correctement configuré
     */
    protected function isWhatsAppConfigured()
    {
        $settings = SchoolSetting::getSettings();
        
        return $settings->whatsapp_notifications_enabled && 
               $settings->whatsapp_notification_number &&
               $settings->whatsapp_api_url &&
               $settings->whatsapp_instance_id &&
               $settings->whatsapp_token;
    }

    /**
     * Formater le numéro de téléphone au format international
     */
    protected function formatPhoneNumber($phoneNumber)
    {
        // Supprimer tous les caractères non numériques
        $cleaned = preg_replace('/[^0-9]/', '', $phoneNumber);
        
        // Si le numéro commence par 0, remplacer par +237 (Cameroun)
        if (substr($cleaned, 0, 1) === '0') {
            $cleaned = '237' . substr($cleaned, 1);
        }
        
        // Si le numéro ne commence pas par +, l'ajouter
        if (substr($cleaned, 0, 1) !== '+') {
            $cleaned = '+' . $cleaned;
        }
        
        return $cleaned;
    }

    /**
     * Tester la configuration WhatsApp
     */
    public function testConfiguration()
    {
        $settings = SchoolSetting::getSettings();
        
        if (!$settings->whatsapp_notifications_enabled || 
            !$settings->whatsapp_notification_number ||
            !$settings->whatsapp_api_url ||
            !$settings->whatsapp_instance_id ||
            !$settings->whatsapp_token) {
            return [
                'success' => false,
                'message' => 'Configuration WhatsApp incomplète. Vérifiez les paramètres API (URL, Instance ID, Token)'
            ];
        }

        $testMessage = "🧪 *TEST DE CONFIGURATION ULTRAMSG*\n\n" .
                      "Ce message confirme que les notifications WhatsApp sont correctement configurées pour " .
                      ($settings->school_name ?? 'votre école') . ".\n\n" .
                      "📅 " . now()->format('d/m/Y à H:i') . "\n\n" .
                      "✅ Configuration UltraMsg opérationnelle";

        $result = $this->sendMessage($settings->whatsapp_notification_number, $testMessage);

        if (!$result) {
            // Vérifier les logs pour donner un message d'erreur plus spécifique
            $recentLogs = $this->getRecentWhatsAppError();
            if (strpos($recentLogs, 'non-payment') !== false || strpos($recentLogs, 'Stopped') !== false) {
                return [
                    'success' => false,
                    'message' => '❌ Instance UltraMsg suspendue pour non-paiement. Veuillez renouveler votre abonnement UltraMsg.'
                ];
            } elseif (strpos($recentLogs, 'Path not found') !== false) {
                return [
                    'success' => false,
                    'message' => '❌ URL ou Instance ID incorrect. Vérifiez vos paramètres UltraMsg.'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => '❌ Échec de l\'envoi du test. Vérifiez votre configuration UltraMsg (Instance ID, Token, numéro de téléphone).'
                ];
            }
        }

        return [
            'success' => true,
            'message' => '✅ Test envoyé avec succès via UltraMsg'
        ];
    }

    /**
     * Récupérer la dernière erreur WhatsApp des logs
     */
    private function getRecentWhatsAppError()
    {
        try {
            $logFile = storage_path('logs/laravel.log');
            if (!file_exists($logFile)) return '';
            
            $logs = file_get_contents($logFile);
            $lines = explode("\n", $logs);
            $recentLines = array_slice($lines, -50); // Dernières 50 lignes
            
            foreach (array_reverse($recentLines) as $line) {
                if (strpos($line, 'WhatsApp') !== false || strpos($line, 'UltraMsg') !== false) {
                    return $line;
                }
            }
            
            return '';
        } catch (\Exception $e) {
            return '';
        }
    }
}