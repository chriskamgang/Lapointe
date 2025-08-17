<?php

namespace App\Http\Controllers;

use App\Models\Need;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use Barryvdh\DomPDF\Facade\Pdf;

class NeedController extends Controller
{
    protected $whatsappService;

    public function __construct(WhatsAppService $whatsappService)
    {
        $this->whatsappService = $whatsappService;
    }

    /**
     * Lister tous les besoins (admin uniquement)
     */
    public function index(Request $request)
    {
        try {
            $query = Need::with(['user', 'approvedBy'])
                         ->orderBy('created_at', 'desc');

            // Filtrer par statut
            if ($request->has('status') && $request->status !== '') {
                $query->where('status', $request->status);
            }

            // Filtrer par utilisateur
            if ($request->has('user_id') && $request->user_id !== '') {
                $query->where('user_id', $request->user_id);
            }

            // Filtrer par période
            if ($request->has('from_date') && $request->from_date !== '') {
                $query->whereDate('created_at', '>=', $request->from_date);
            }

            if ($request->has('to_date') && $request->to_date !== '') {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            // Recherche par nom ou description
            if ($request->has('search') && $request->search !== '') {
                $searchTerm = $request->search;
                $query->where(function($q) use ($searchTerm) {
                    $q->where('name', 'like', "%{$searchTerm}%")
                      ->orWhere('description', 'like', "%{$searchTerm}%");
                });
            }

            $needs = $query->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $needs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des besoins',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lister les besoins de l'utilisateur connecté
     */
    public function myNeeds(Request $request)
    {
        try {
            $query = Need::where('user_id', auth()->id())
                         ->with(['approvedBy'])
                         ->orderBy('created_at', 'desc');

            // Filtrer par statut
            if ($request->has('status') && $request->status !== '') {
                $query->where('status', $request->status);
            }

            $needs = $query->paginate($request->get('per_page', 10));

            return response()->json([
                'success' => true,
                'data' => $needs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de vos besoins',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Créer un nouveau besoin
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'required|string|max:2000',
                'amount' => 'required|numeric|min:0|max:999999999'
            ], [
                'name.required' => 'Le nom du besoin est obligatoire',
                'name.max' => 'Le nom ne peut pas dépasser 255 caractères',
                'description.required' => 'La description est obligatoire',
                'description.max' => 'La description ne peut pas dépasser 2000 caractères',
                'amount.required' => 'Le montant est obligatoire',
                'amount.numeric' => 'Le montant doit être un nombre',
                'amount.min' => 'Le montant doit être positif',
                'amount.max' => 'Le montant est trop élevé'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            $need = Need::create([
                'name' => $request->name,
                'description' => $request->description,
                'amount' => $request->amount,
                'user_id' => auth()->id(),
                'status' => Need::STATUS_PENDING
            ]);

            DB::commit();

            // Envoyer la notification WhatsApp
            try {
                $result = $this->whatsappService->sendNewNeedNotification($need);
                $need->update(['whatsapp_sent' => $result]);
            } catch (\Exception $e) {
                // Ne pas faire échouer la création si l'envoi WhatsApp échoue
                \Log::error('Erreur envoi WhatsApp pour besoin #' . $need->id . ': ' . $e->getMessage());
            }

            $need->load(['user', 'approvedBy']);

            return response()->json([
                'success' => true,
                'message' => 'Besoin soumis avec succès',
                'data' => $need
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du besoin',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Afficher un besoin spécifique
     */
    public function show(Need $need)
    {
        try {
            // Vérifier les permissions : admin ou propriétaire du besoin
            if (!in_array(auth()->user()->role, ['admin']) && $need->user_id !== auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Accès non autorisé à ce besoin'
                ], 403);
            }

            $need->load(['user', 'approvedBy']);

            return response()->json([
                'success' => true,
                'data' => $need
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération du besoin',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approuver un besoin (admin uniquement)
     */
    public function approve(Need $need)
    {
        try {
            if ($need->status !== Need::STATUS_PENDING) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce besoin a déjà été traité'
                ], 422);
            }

            $previousStatus = $need->status_label;

            $need->update([
                'status' => Need::STATUS_APPROVED,
                'approved_by' => auth()->id(),
                'approved_at' => now(),
                'rejection_reason' => null
            ]);

            // Envoyer notifications WhatsApp
            try {
                // Notification à l'admin
                $this->whatsappService->sendStatusUpdateNotification($need, $previousStatus);
                // Notification au demandeur
                $this->whatsappService->sendStatusUpdateNotificationToRequester($need, $previousStatus);
            } catch (\Exception $e) {
                \Log::error('Erreur envoi WhatsApp pour approbation besoin #' . $need->id . ': ' . $e->getMessage());
            }

            $need->load(['user', 'approvedBy']);

            return response()->json([
                'success' => true,
                'message' => 'Besoin approuvé avec succès',
                'data' => $need
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'approbation du besoin',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rejeter un besoin (admin uniquement)
     */
    public function reject(Request $request, Need $need)
    {
        try {
            $validator = Validator::make($request->all(), [
                'rejection_reason' => 'required|string|max:1000'
            ], [
                'rejection_reason.required' => 'Le motif du rejet est obligatoire',
                'rejection_reason.max' => 'Le motif ne peut pas dépasser 1000 caractères'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            if ($need->status !== Need::STATUS_PENDING) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ce besoin a déjà été traité'
                ], 422);
            }

            $previousStatus = $need->status_label;

            $need->update([
                'status' => Need::STATUS_REJECTED,
                'approved_by' => auth()->id(),
                'approved_at' => now(),
                'rejection_reason' => $request->rejection_reason
            ]);

            // Envoyer notifications WhatsApp
            try {
                // Notification à l'admin
                $this->whatsappService->sendStatusUpdateNotification($need, $previousStatus);
                // Notification au demandeur
                $this->whatsappService->sendStatusUpdateNotificationToRequester($need, $previousStatus);
            } catch (\Exception $e) {
                \Log::error('Erreur envoi WhatsApp pour rejet besoin #' . $need->id . ': ' . $e->getMessage());
            }

            $need->load(['user', 'approvedBy']);

            return response()->json([
                'success' => true,
                'message' => 'Besoin rejeté avec succès',
                'data' => $need
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du rejet du besoin',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour un besoin (propriétaire uniquement, seulement si en attente)
     */
    public function update(Request $request, Need $need)
    {
        try {
            // Vérifier que l'utilisateur est propriétaire du besoin
            if ($need->user_id !== auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'êtes pas autorisé à modifier ce besoin'
                ], 403);
            }

            // Vérifier que le besoin est en attente
            if ($need->status !== Need::STATUS_PENDING) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seuls les besoins en attente peuvent être modifiés'
                ], 422);
            }

            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'required|string|max:2000',
                'amount' => 'required|numeric|min:0|max:999999999'
            ], [
                'name.required' => 'Le nom du besoin est obligatoire',
                'name.max' => 'Le nom ne peut pas dépasser 255 caractères',
                'description.required' => 'La description est obligatoire',
                'description.max' => 'La description ne peut pas dépasser 2000 caractères',
                'amount.required' => 'Le montant est obligatoire',
                'amount.numeric' => 'Le montant doit être un nombre',
                'amount.min' => 'Le montant doit être positif',
                'amount.max' => 'Le montant est trop élevé'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Données invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $need->update([
                'name' => $request->name,
                'description' => $request->description,
                'amount' => $request->amount
            ]);

            $need->load(['user', 'approvedBy']);

            return response()->json([
                'success' => true,
                'message' => 'Besoin modifié avec succès',
                'data' => $need
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la modification du besoin',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Supprimer un besoin (propriétaire uniquement, seulement si en attente)
     */
    public function destroy(Need $need)
    {
        try {
            // Vérifier que l'utilisateur est propriétaire du besoin
            if ($need->user_id !== auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous n\'êtes pas autorisé à supprimer ce besoin'
                ], 403);
            }

            // Vérifier que le besoin est en attente
            if ($need->status !== Need::STATUS_PENDING) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seuls les besoins en attente peuvent être supprimés'
                ], 422);
            }

            $need->delete();

            return response()->json([
                'success' => true,
                'message' => 'Besoin supprimé avec succès'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression du besoin',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques des besoins (admin uniquement)
     */
    public function statistics()
    {
        try {
            $stats = [
                'total' => Need::count(),
                'pending' => Need::pending()->count(),
                'approved' => Need::approved()->count(),
                'rejected' => Need::rejected()->count(),
                'total_amount_pending' => Need::pending()->sum('amount'),
                'total_amount_approved' => Need::approved()->sum('amount'),
                'total_amount_rejected' => Need::rejected()->sum('amount'),
            ];

            // Statistiques par mois (6 derniers mois)
            $monthlyStats = [];
            for ($i = 5; $i >= 0; $i--) {
                $date = now()->subMonths($i);
                $monthlyStats[] = [
                    'month' => $date->format('Y-m'),
                    'month_name' => $date->translatedFormat('F Y'),
                    'count' => Need::whereMonth('created_at', $date->month)
                                 ->whereYear('created_at', $date->year)
                                 ->count(),
                    'amount' => Need::whereMonth('created_at', $date->month)
                              ->whereYear('created_at', $date->year)
                              ->sum('amount')
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'summary' => $stats,
                    'monthly' => $monthlyStats
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Tester la configuration WhatsApp (admin uniquement)
     */
    public function testWhatsApp()
    {
        try {
            $result = $this->whatsappService->testConfiguration();

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message']
            ], $result['success'] ? 200 : 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du test WhatsApp',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exporter les besoins en PDF
     */
    public function exportPdf(Request $request)
    {
        try {
            $needs = $this->getFilteredNeeds($request);
            
            $pdf = Pdf::loadView('exports.needs.pdf', [
                'needs' => $needs,
                'status_filter' => $request->get('status', 'all'),
                'generated_at' => now()->format('d/m/Y H:i')
            ]);
            
            $filename = 'besoins_' . ($request->get('status', 'all')) . '_' . now()->format('Y_m_d_H_i_s') . '.pdf';
            
            return $pdf->download($filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export PDF',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exporter les besoins en Excel
     */
    public function exportExcel(Request $request)
    {
        try {
            $needs = $this->getFilteredNeeds($request);
            
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            
            // Ajouter le logo si disponible
            $logoPath = public_path('assets/logo.png');
            if (file_exists($logoPath)) {
                $drawing = new \PhpOffice\PhpSpreadsheet\Worksheet\Drawing();
                $drawing->setName('Logo');
                $drawing->setDescription('Logo du Collège');
                $drawing->setPath($logoPath);
                $drawing->setHeight(60);
                $drawing->setCoordinates('A1');
                $drawing->setWorksheet($sheet);
                
                // Décaler les headers vers le bas
                $startRow = 4;
            } else {
                $startRow = 1;
            }
            
            // Titre principal
            if (file_exists($logoPath)) {
                $sheet->setCellValue('C1', 'COLLÈGE POLYVALENT BILINGUE DE DOUALA');
                $sheet->getStyle('C1')->getFont()->setBold(true)->setSize(16);
                $sheet->setCellValue('C2', 'Liste des Besoins');
                $sheet->getStyle('C2')->getFont()->setBold(true)->setSize(14);
            }
            
            // Headers
            $sheet->setCellValue('A' . $startRow, 'ID');
            $sheet->setCellValue('B' . $startRow, 'Nom');
            $sheet->setCellValue('C' . $startRow, 'Description');
            $sheet->setCellValue('D' . $startRow, 'Montant (FCFA)');
            $sheet->setCellValue('E' . $startRow, 'Statut');
            $sheet->setCellValue('F' . $startRow, 'Demandeur');
            $sheet->setCellValue('G' . $startRow, 'Date de création');
            $sheet->setCellValue('H' . $startRow, 'Approuvé par');
            $sheet->setCellValue('I' . $startRow, 'Date d\'approbation');
            $sheet->setCellValue('J' . $startRow, 'Motif de rejet');
            
            // Style des headers
            $headerStyle = [
                'font' => ['bold' => true],
                'fill' => ['fillType' => 'solid', 'color' => ['rgb' => 'CCCCCC']]
            ];
            $sheet->getStyle('A' . $startRow . ':J' . $startRow)->applyFromArray($headerStyle);
            
            // Data
            $row = $startRow + 1;
            foreach ($needs as $need) {
                $sheet->setCellValue('A' . $row, $need->id);
                $sheet->setCellValue('B' . $row, $need->name);
                $sheet->setCellValue('C' . $row, $need->description);
                $sheet->setCellValue('D' . $row, number_format($need->amount, 0, ',', ' '));
                $sheet->setCellValue('E' . $row, $need->status_label);
                $sheet->setCellValue('F' . $row, $need->user ? $need->user->name : '');
                $sheet->setCellValue('G' . $row, $need->created_at->format('d/m/Y H:i'));
                $sheet->setCellValue('H' . $row, $need->approvedBy ? $need->approvedBy->name : '');
                $sheet->setCellValue('I' . $row, $need->approved_at ? $need->approved_at->format('d/m/Y H:i') : '');
                $sheet->setCellValue('J' . $row, $need->rejection_reason ?? '');
                $row++;
            }
            
            // Auto-adjust column widths
            foreach (range('A', 'J') as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }
            
            $filename = 'besoins_' . ($request->get('status', 'all')) . '_' . now()->format('Y_m_d_H_i_s') . '.xlsx';
            
            $writer = new Xlsx($spreadsheet);
            $tempFile = tempnam(sys_get_temp_dir(), 'needs_export');
            $writer->save($tempFile);
            
            return Response::download($tempFile, $filename)->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export Excel',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exporter les besoins en Word
     */
    public function exportWord(Request $request)
    {
        try {
            $needs = $this->getFilteredNeeds($request);
            
            $phpWord = new PhpWord();
            $section = $phpWord->addSection();
            
            // Ajouter le logo et l'en-tête
            $logoPath = public_path('assets/logo.png');
            if (file_exists($logoPath)) {
                // Créer un tableau pour le header avec logo
                $headerTable = $section->addTable();
                $headerTable->addRow();
                $cellLogo = $headerTable->addCell(2000);
                $cellLogo->addImage($logoPath, ['width' => 80, 'height' => 80]);
                
                $cellTitle = $headerTable->addCell(8000);
                $cellTitle->addText('COLLÈGE POLYVALENT BILINGUE DE DOUALA', ['bold' => true, 'size' => 16], ['alignment' => 'center']);
                $cellTitle->addTextBreak();
                
                // Titre du rapport
                $statusLabel = match($request->get('status', 'all')) {
                    'pending' => 'En Attente',
                    'approved' => 'Approuvés',
                    'rejected' => 'Rejetés',
                    default => 'Tous'
                };
                
                $cellTitle->addText('Liste des Besoins - ' . $statusLabel, ['bold' => true, 'size' => 14], ['alignment' => 'center']);
                $section->addTextBreak();
            } else {
                // Titre sans logo
                $statusLabel = match($request->get('status', 'all')) {
                    'pending' => 'En Attente',
                    'approved' => 'Approuvés',
                    'rejected' => 'Rejetés',
                    default => 'Tous'
                };
                
                $section->addTitle('COLLÈGE POLYVALENT BILINGUE DE DOUALA', 1);
                $section->addTitle('Liste des Besoins - ' . $statusLabel, 2);
            }
            
            $section->addText('Généré le ' . now()->format('d/m/Y à H:i'));
            $section->addTextBreak(2);
            
            // Table
            $table = $section->addTable([
                'borderSize' => 6,
                'borderColor' => '000000',
                'cellMargin' => 80
            ]);
            
            // Headers
            $table->addRow();
            $table->addCell(800)->addText('ID', ['bold' => true]);
            $table->addCell(2000)->addText('Nom', ['bold' => true]);
            $table->addCell(3000)->addText('Description', ['bold' => true]);
            $table->addCell(1500)->addText('Montant', ['bold' => true]);
            $table->addCell(1200)->addText('Statut', ['bold' => true]);
            $table->addCell(1500)->addText('Demandeur', ['bold' => true]);
            $table->addCell(1200)->addText('Date', ['bold' => true]);
            
            // Data
            foreach ($needs as $need) {
                $table->addRow();
                $table->addCell()->addText($need->id);
                $table->addCell()->addText($need->name);
                $table->addCell()->addText($need->description);
                $table->addCell()->addText($need->formatted_amount);
                $table->addCell()->addText($need->status_label);
                $table->addCell()->addText($need->user ? $need->user->name : '');
                $table->addCell()->addText($need->created_at->format('d/m/Y'));
            }
            
            $filename = 'besoins_' . ($request->get('status', 'all')) . '_' . now()->format('Y_m_d_H_i_s') . '.docx';
            $tempFile = tempnam(sys_get_temp_dir(), 'needs_export');
            
            $objWriter = IOFactory::createWriter($phpWord, 'Word2007');
            $objWriter->save($tempFile);
            
            return Response::download($tempFile, $filename)->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export Word',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Méthode helper pour récupérer les besoins filtrés
     */
    private function getFilteredNeeds(Request $request)
    {
        $query = Need::with(['user', 'approvedBy'])
                     ->orderBy('created_at', 'desc');

        // Filtrer par statut
        if ($request->has('status') && $request->status !== '' && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filtrer par utilisateur
        if ($request->has('user_id') && $request->user_id !== '') {
            $query->where('user_id', $request->user_id);
        }

        // Filtrer par période
        if ($request->has('from_date') && $request->from_date !== '') {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->has('to_date') && $request->to_date !== '') {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        // Recherche par nom ou description
        if ($request->has('search') && $request->search !== '') {
            $searchTerm = $request->search;
            $query->where(function($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                  ->orWhere('description', 'like', "%{$searchTerm}%");
            });
        }

        return $query->get();
    }
}