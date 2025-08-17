<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\PaymentTrancheController;
use App\Http\Controllers\LevelController;
use App\Http\Controllers\SchoolClassController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\AccountantController;
use App\Http\Controllers\SchoolYearController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SchoolSettingsController;
use App\Http\Controllers\ClassScholarshipController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\PhotoUploadController;
use App\Http\Controllers\SubjectController;
use App\Http\Controllers\TeacherController;
use App\Http\Controllers\SeriesSubjectController;
use App\Http\Controllers\SeriesController;
use App\Http\Controllers\TeacherAssignmentController;
use App\Http\Controllers\MainTeacherController;
use App\Http\Controllers\NeedController;
use App\Http\Controllers\SupervisorController;
use App\Http\Controllers\StudentRameController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DocumentFolderController;
use App\Http\Controllers\ClassesSeriesController;
use App\Http\Controllers\TeacherAttendanceController;


// Routes d'authentification
Route::prefix('auth')->group(function () {
    // Routes publiques (pas d'authentification requise)
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);

    // Routes protégées (authentification JWT requise)
    Route::middleware('auth:api')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

// Route de test
Route::get('test', function () {
    return response()->json(['message' => 'API is working!']);
});

// Route de test pour school-settings
Route::get('test-school-settings', function () {
    try {
        $settings = App\Models\SchoolSetting::getSettings();
        return response()->json([
            'success' => true,
            'data' => $settings,
            'message' => 'School settings loaded successfully'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Test route pour inventory sans auth
Route::get('test-inventory', function () {
    try {
        return response()->json([
            'success' => true,
            'message' => 'Route inventory accessible',
            'items_count' => \App\Models\InventoryItem::count(),
            'timestamp' => now()->toDateTimeString()
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

Route::get('/user-management/{id}/professional-card', function () {
    return response('', 204)
        ->header('Access-Control-Allow-Origin', 'https://admin.cpb-douala.com')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With')
        ->header('Access-Control-Allow-Credentials', 'true')
        ->header('Access-Control-Max-Age', '1728000');
});
Route::get('/students', function () {
    return response('', 204)
        ->header('Access-Control-Allow-Origin', 'https://admin.cpb-douala.com')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With')
        ->header('Access-Control-Allow-Credentials', 'true')
        ->header('Access-Control-Max-Age', '1728000');
});
Route::post('/students', function () {
    return response('', 201)
        ->header('Access-Control-Allow-Origin', 'https://admin.cpb-douala.com')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With')
        ->header('Access-Control-Allow-Credentials', 'true')
        ->header('Access-Control-Max-Age', '1728000');
});
// Routes protégées
Route::middleware('auth:api')->group(function () {

    // Routes pour les sections
    Route::prefix('sections')->group(function () {

        Route::get('/dashboard', [SectionController::class, 'dashboard'])->middleware(['role:admin,accountant']);
        Route::get('/', [SectionController::class, 'index'])->middleware(['role:admin,accountant']);
        Route::get('/{section}', [SectionController::class, 'show'])->middleware(['role:admin,accountant']);
        
        // Export routes
        Route::get('/export/excel', [SectionController::class, 'exportExcel'])->middleware(['role:admin,accountant']);
        Route::get('/export/csv', [SectionController::class, 'exportCsv'])->middleware(['role:admin,accountant']);
        Route::get('/export/pdf', [SectionController::class, 'exportPdf'])->middleware(['role:admin,accountant']);
        Route::get('/export/importable', [SectionController::class, 'exportImportable'])->middleware(['role:admin,accountant']);
        Route::get('/template/download', [SectionController::class, 'downloadTemplate'])->middleware(['role:admin']);
        

        Route::get('/dashboard', [SectionController::class, 'dashboard'])->middleware(['role:admin,accountant,comptable_superieur']);
        Route::get('/', [SectionController::class, 'index'])->middleware(['role:admin,accountant,comptable_superieur']);
        Route::get('/{section}', [SectionController::class, 'show'])->middleware(['role:admin,accountant,comptable_superieur']);


        Route::post('/', [SectionController::class, 'store'])->middleware(['role:admin']);
        Route::put('/{section}', [SectionController::class, 'update'])->middleware(['role:admin']);
        Route::delete('/{section}', [SectionController::class, 'destroy'])->middleware(['role:admin']);
        Route::post('/{section}/toggle-status', [SectionController::class, 'toggleStatus'])->middleware(['role:admin']);
        Route::post('/import/csv', [SectionController::class, 'importCsv'])->middleware(['role:admin']);
    });

    // Routes pour les tranches de paiement
    Route::prefix('payment-tranches')->group(function () {
        Route::get('/', [PaymentTrancheController::class, 'index'])->middleware(['role:admin,accountant,comptable_superieur']);
        Route::get('/{paymentTranche}', [PaymentTrancheController::class, 'show'])->middleware(['role:admin,accountant,comptable_superieur']);
        Route::get('/{paymentTranche}/usage-stats', [PaymentTrancheController::class, 'usageStats'])->middleware(['role:admin,accountant,comptable_superieur']);

        Route::post('/', [PaymentTrancheController::class, 'store'])->middleware(['role:admin']);
        Route::put('/{paymentTranche}', [PaymentTrancheController::class, 'update'])->middleware(['role:admin']);
        Route::delete('/{paymentTranche}', [PaymentTrancheController::class, 'destroy'])->middleware(['role:admin']);
        Route::post('/reorder', [PaymentTrancheController::class, 'reorder'])->middleware(['role:admin']);
    });

    // Routes pour les niveaux
    Route::prefix('levels')->group(function () {
        Route::get('/dashboard', [LevelController::class, 'dashboard'])->middleware(['role:admin,accountant,comptable_superieur']);
        Route::get('/', [LevelController::class, 'index'])->middleware(['role:admin,accountant,comptable_superieur']);
        Route::get('/{level}', [LevelController::class, 'show'])->middleware(['role:admin,accountant,comptable_superieur']);

        // Export routes
        Route::get('/export/excel', [LevelController::class, 'exportExcel'])->middleware(['role:admin,accountant']);
        Route::get('/export/csv', [LevelController::class, 'exportCsv'])->middleware(['role:admin,accountant']);
        Route::get('/export/pdf', [LevelController::class, 'exportPdf'])->middleware(['role:admin,accountant']);
        Route::get('/export/importable', [LevelController::class, 'exportImportable'])->middleware(['role:admin,accountant']);
        Route::get('/template/download', [LevelController::class, 'downloadTemplate'])->middleware(['role:admin']);

        Route::post('/', [LevelController::class, 'store'])->middleware(['role:admin']);
        Route::put('/{level}', [LevelController::class, 'update'])->middleware(['role:admin']);
        Route::delete('/{level}', [LevelController::class, 'destroy'])->middleware(['role:admin']);
        Route::post('/{level}/toggle-status', [LevelController::class, 'toggleStatus'])->middleware(['role:admin']);
        Route::post('/import/csv', [LevelController::class, 'importCsv'])->middleware(['role:admin']);
    });

    // Routes pour les classes
    Route::prefix('school-classes')->group(function () {
        Route::get('/dashboard', [SchoolClassController::class, 'dashboard'])->middleware(['role:admin,accountant,comptable_superieur']);
        Route::get('/', [SchoolClassController::class, 'index'])->middleware(['role:admin,accountant,comptable_superieur']);
        Route::get('/{schoolClass}', [SchoolClassController::class, 'show'])->middleware(['role:admin,accountant,comptable_superieur']);

        // Export routes
        Route::get('/export/excel', [SchoolClassController::class, 'exportExcel'])->middleware(['role:admin,accountant']);
        Route::get('/export/csv', [SchoolClassController::class, 'exportCsv'])->middleware(['role:admin,accountant']);
        Route::get('/export/pdf', [SchoolClassController::class, 'exportPdf'])->middleware(['role:admin,accountant']);
        Route::get('/export/importable', [SchoolClassController::class, 'exportImportable'])->middleware(['role:admin,accountant']);
        Route::get('/template/download', [SchoolClassController::class, 'downloadTemplate'])->middleware(['role:admin']);

        Route::post('/', [SchoolClassController::class, 'store'])->middleware(['role:admin']);
        Route::put('/{schoolClass}', [SchoolClassController::class, 'update'])->middleware(['role:admin']);
        Route::delete('/{schoolClass}', [SchoolClassController::class, 'destroy'])->middleware(['role:admin']);
        Route::post('/{schoolClass}/toggle-status', [SchoolClassController::class, 'toggleStatus'])->middleware(['role:admin']);
        Route::post('/{schoolClass}/configure-payments', [SchoolClassController::class, 'configurePayments'])->middleware(['role:admin']);
        Route::post('/import/csv', [SchoolClassController::class, 'importCsv'])->middleware(['role:admin']);
    });

    // Routes pour les séries
    Route::prefix('series')->group(function () {
        Route::get('/', [SeriesController::class, 'index'])->middleware(['role:admin,accountant']);
        
        // Export routes
        Route::get('/export/excel', [SeriesController::class, 'exportExcel'])->middleware(['role:admin,accountant']);
        Route::get('/export/csv', [SeriesController::class, 'exportCsv'])->middleware(['role:admin,accountant']);
        Route::get('/export/pdf', [SeriesController::class, 'exportPdf'])->middleware(['role:admin,accountant']);
        Route::get('/export/importable', [SeriesController::class, 'exportImportable'])->middleware(['role:admin,accountant']);
        Route::get('/template/download', [SeriesController::class, 'downloadTemplate'])->middleware(['role:admin']);
        
        Route::post('/import/csv', [SeriesController::class, 'importCsv'])->middleware(['role:admin']);
    });

    // Routes pour les classes et séries combinées
    Route::prefix('classes-series')->group(function () {
        // Export routes
        Route::get('/export/excel', [ClassesSeriesController::class, 'exportExcel'])->middleware(['role:admin,accountant']);
        Route::get('/export/csv', [ClassesSeriesController::class, 'exportCsv'])->middleware(['role:admin,accountant']);
        Route::get('/export/pdf', [ClassesSeriesController::class, 'exportPdf'])->middleware(['role:admin,accountant']);
        Route::get('/template/download', [ClassesSeriesController::class, 'downloadTemplate'])->middleware(['role:admin']);
        Route::post('/import/csv', [ClassesSeriesController::class, 'importCsv'])->middleware(['role:admin']);
    });

    // Routes pour les élèves
    Route::prefix('students')->middleware(['role:admin,accountant,comptable_superieur'])->group(function () {
        Route::get('/class-series/{seriesId}', [StudentController::class, 'getByClassSeries']);
        
        // Export routes - amélioration des routes existantes
        Route::get('/export/excel', [StudentController::class, 'exportStudentsExcel']);
        Route::get('/export/csv', [StudentController::class, 'exportStudentsCsv']);
        Route::get('/export/pdf', [StudentController::class, 'exportStudentsPdf']);
        Route::get('/export/csv/{seriesId}', [StudentController::class, 'exportCsv']);
        Route::get('/export/excel/{seriesId}', [StudentController::class, 'exportExcel']);
        Route::get('/export/pdf/{seriesId}', [StudentController::class, 'exportPdf']);
        Route::get('/export/importable', [StudentController::class, 'exportImportable']);
        Route::get('/template/download', [StudentController::class, 'downloadTemplate']);
        
        Route::post('/', [StudentController::class, 'store']);
        Route::put('/{student}', [StudentController::class, 'update']);
        Route::patch('/{student}/status', [StudentController::class, 'updateStatus']);
        Route::post('/{student}/update-with-photo', [StudentController::class, 'updateWithPhoto']);
        Route::post('/{student}/transfer-series', [StudentController::class, 'transferToSeries']);
        Route::delete('/{student}', [StudentController::class, 'destroy']);
        Route::post('/import/csv', [StudentController::class, 'importCsv']);
        Route::post('/import/excel', [StudentController::class, 'importExcel']);
        Route::post('/series/{seriesId}/import', [StudentController::class, 'importForSeries']);
        Route::post('/series/{seriesId}/import/csv', [StudentController::class, 'importCsvForSeries']);
        Route::get('/school-years', [StudentController::class, 'getSchoolYears']);
        Route::post('/reorder', [StudentController::class, 'reorder']);
        Route::post('/class-series/{seriesId}/sort-alphabetically', [StudentController::class, 'sortAlphabetically']);
        Route::post('/bulk-upload-photos', [StudentController::class, 'bulkUploadPhotos']);
    });

    // Routes utilisateurs (pour compatibilité)
    Route::prefix('users')->group(function () {
        Route::get('/getTeacherOrAdmin', [UserController::class, 'getTeacherOrAdmin']);
        Route::get('/getTeacherOrAdmin/', [UserController::class, 'getTeacherOrAdmin']); // With trailing slash
        Route::get('/getInfos', [UserController::class, 'getInfos']);
        Route::get('/all', [UserController::class, 'all']);
        Route::put('/profile', [UserController::class, 'updateProfile']);
    });

    // Routes pour les comptables
    Route::prefix('accountant')->middleware(['role:admin,accountant,comptable_superieur'])->group(function () {
        Route::get('/dashboard', [AccountantController::class, 'dashboard']);
        Route::get('/classes', [AccountantController::class, 'getClasses']);
        Route::get('/classes/{classId}/series', [AccountantController::class, 'getClassSeries']);
        Route::get('/series/{seriesId}/students', [AccountantController::class, 'getSeriesStudents']);
        Route::get('/students/{studentId}', [AccountantController::class, 'getStudent']);
    });

    // Routes pour les années scolaires
    Route::prefix('school-years')->group(function () {
        // Routes accessibles aux admins et comptables (avec authentification)
        Route::get('/active', [SchoolYearController::class, 'getActiveYears']);
        Route::get('/user-working-year', [SchoolYearController::class, 'getUserWorkingYear']);
        Route::post('/set-user-working-year', [SchoolYearController::class, 'setUserWorkingYear']);

        // Routes pour administrateurs uniquement
        Route::get('/', [SchoolYearController::class, 'index'])->middleware('role:admin');
        Route::post('/', [SchoolYearController::class, 'store'])->middleware('role:admin');
        Route::put('/{schoolYear}', [SchoolYearController::class, 'update'])->middleware('role:admin');
        Route::post('/{schoolYear}/set-current', [SchoolYearController::class, 'setCurrent'])->middleware('role:admin');
    });

    // Routes pour les paiements (comptables et admins)
    Route::prefix('payments')->middleware(['role:admin,accountant,comptable_superieur'])->group(function () {
        Route::get('/student/{studentId}/info', [PaymentController::class, 'getStudentPaymentInfo']);
        Route::get('/student/{studentId}/info-with-discount', [PaymentController::class, 'getStudentPaymentInfoWithDiscount']);
        Route::get('/student/{studentId}/history', [PaymentController::class, 'getStudentPaymentHistory']);
        Route::post('/student/{studentId}/calculate-with-date', [PaymentController::class, 'calculatePaymentWithDate']);
        Route::post('/', [PaymentController::class, 'store']);
        Route::get('/{paymentId}/receipt', [PaymentController::class, 'generateReceipt']);
        Route::get('/{paymentId}/receipt/pdf', [PaymentController::class, 'downloadReceiptPDF']);
        Route::get('/stats', [PaymentController::class, 'getPaymentStats']);
    });

    // Routes pour les paramètres de l'école
    Route::prefix('school-settings')->group(function () {
        Route::get('/', [SchoolSettingsController::class, 'index'])->middleware(['role:admin,accountant,surveillant_general,comptable_superieur']);
        Route::get('/logo', [SchoolSettingsController::class, 'getLogo'])->middleware(['role:admin,accountant,surveillant_general,comptable_superieur']);

        // Routes admin uniquement
        Route::put('/', [SchoolSettingsController::class, 'update'])->middleware(['role:admin']);
        Route::post('/', [SchoolSettingsController::class, 'update'])->middleware(['role:admin']); // Pour FormData avec _method=PUT
        Route::post('/test-whatsapp', [SchoolSettingsController::class, 'testWhatsApp'])->middleware(['role:admin']); // Test WhatsApp
    });

    // Routes pour les bourses de classe
    Route::prefix('class-scholarships')->middleware(['role:admin'])->group(function () {
        Route::get('/', [ClassScholarshipController::class, 'index']);
        Route::post('/', [ClassScholarshipController::class, 'store']);
        Route::get('/{id}', [ClassScholarshipController::class, 'show']);
        Route::put('/{id}', [ClassScholarshipController::class, 'update']);
        Route::delete('/{id}', [ClassScholarshipController::class, 'destroy']);
        Route::get('/class/{classId}', [ClassScholarshipController::class, 'getByClass']);
    });

    // Routes pour les rapports (comptables et admins)
    Route::prefix('reports')->middleware(['role:admin,accountant,comptable_superieur'])->group(function () {
        Route::get('/insolvable', [ReportsController::class, 'getInsolvableReport']);
        Route::get('/payments', [ReportsController::class, 'getPaymentsReport']);
        Route::get('/rame', [ReportsController::class, 'getRameReport']);
        Route::get('/recovery', [ReportsController::class, 'getRecoveryReport']);
        Route::get('/collection-summary', [ReportsController::class, 'getCollectionSummaryReport']);
        Route::get('/payment-details', [ReportsController::class, 'getPaymentDetailsReport']);
        Route::get('/scholarships-discounts', [ReportsController::class, 'getScholarshipsDiscountsReport']);
        Route::get('/collection-details', [ReportsController::class, 'getCollectionDetailsReport']);
        Route::get('/series-collection-summary', [ReportsController::class, 'getSeriesCollectionSummary']);
        
        // Nouveau rapport de détail des paiements des frais de scolarité
        Route::get('/school-fee-payment-details', [ReportsController::class, 'getSchoolFeePaymentDetails']);
        Route::get('/school-fee-payment-details/export-pdf', [ReportsController::class, 'exportSchoolFeePaymentDetailsPdf']);
        
        // Nouveaux rapports financiers
        Route::get('/detailed-collection', [ReportsController::class, 'getDetailedCollectionReport']);
        Route::get('/class-school-fees', [ReportsController::class, 'getClassSchoolFeesReport']);
        Route::get('/class-school-fees/export-pdf', [ReportsController::class, 'exportClassSchoolFeesPdf']);
        
        Route::get('/export-pdf', [ReportsController::class, 'exportPdf']);
    });


    // Routes pour la gestion des utilisateurs (admin uniquement)
    Route::prefix('user-management')->middleware(['role:admin'])->group(function () {
        Route::get('/', [UserManagementController::class, 'index']);
        Route::get('/stats', [UserManagementController::class, 'getStats']);
        Route::post('/', [UserManagementController::class, 'store']);
        Route::get('/{id}', [UserManagementController::class, 'show']);
        Route::put('/{id}', [UserManagementController::class, 'update']);
        Route::post('/{id}/reset-password', [UserManagementController::class, 'resetPassword']);
        Route::post('/{id}/toggle-status', [UserManagementController::class, 'toggleStatus']);
        Route::delete('/{id}', [UserManagementController::class, 'destroy']);
        
        // Routes pour cartes d'identité professionnelles
        Route::get('/{id}/qr-code', [UserManagementController::class, 'getUserQR']);
    });

    // Routes d'upload de photos
    Route::post('upload-photo', [PhotoUploadController::class, 'upload']);

    // Routes de recherche globale
    Route::prefix('search')->group(function () {
        Route::get('/', [App\Http\Controllers\SearchController::class, 'globalSearch']);
        Route::get('/quick', [App\Http\Controllers\SearchController::class, 'quickSearch']);
    });

    // Routes pour les statistiques
    Route::prefix('stats')->group(function () {
        Route::get('/global', [App\Http\Controllers\StatsController::class, 'getGlobalStats']);
    });

    // Routes pour les matières
    Route::prefix('subjects')->group(function () {
        // Routes accessibles aux admins et comptables (consultation)
        Route::get('/', [SubjectController::class, 'index'])->middleware(['role:admin,accountant,teacher']);
        Route::get('/{subject}', [SubjectController::class, 'show'])->middleware(['role:admin,accountant,teacher']);
        Route::get('/series/{classSeries}', [SubjectController::class, 'getForSeries'])->middleware(['role:admin,accountant,teacher']);

        // Routes pour administrateurs uniquement (gestion)
        Route::post('/', [SubjectController::class, 'store'])->middleware(['role:admin']);
        Route::put('/{subject}', [SubjectController::class, 'update'])->middleware(['role:admin']);
        Route::delete('/{subject}', [SubjectController::class, 'destroy'])->middleware(['role:admin']);
        Route::post('/{subject}/toggle-status', [SubjectController::class, 'toggleStatus'])->middleware(['role:admin']);
        Route::post('/series/{classSeries}/configure', [SubjectController::class, 'configureForSeries'])->middleware(['role:admin']);
    });

    // Routes pour les enseignants
    Route::prefix('teachers')->group(function () {
        // Routes accessibles aux admins et comptables (consultation)
        Route::get('/dashboard', [TeacherController::class, 'dashboard'])->middleware(['role:admin,accountant']);
        Route::get('/', [TeacherController::class, 'index'])->middleware(['role:admin,accountant']);
        Route::get('/{teacher}', [TeacherController::class, 'show'])->middleware(['role:admin,accountant']);
        Route::get('/{teacher}/stats', [TeacherController::class, 'getStats'])->middleware(['role:admin,accountant']);
        
        // Export routes
        Route::get('/export/excel', [TeacherController::class, 'exportExcel'])->middleware(['role:admin,accountant']);
        Route::get('/export/csv', [TeacherController::class, 'exportCsv'])->middleware(['role:admin,accountant']);
        Route::get('/export/pdf', [TeacherController::class, 'exportPdf'])->middleware(['role:admin,accountant']);
        Route::get('/export/importable', [TeacherController::class, 'exportImportable'])->middleware(['role:admin,accountant']);
        Route::get('/template/download', [TeacherController::class, 'downloadTemplate'])->middleware(['role:admin']);

        // Routes pour administrateurs uniquement (gestion)
        Route::post('/', [TeacherController::class, 'store'])->middleware(['role:admin']);
        Route::put('/{teacher}', [TeacherController::class, 'update'])->middleware(['role:admin']);
        Route::delete('/{teacher}', [TeacherController::class, 'destroy'])->middleware(['role:admin']);
        Route::post('/{teacher}/toggle-status', [TeacherController::class, 'toggleStatus'])->middleware(['role:admin']);
        Route::post('/{teacher}/assign-subjects', [TeacherController::class, 'assignSubjects'])->middleware(['role:admin']);
        Route::post('/{teacher}/remove-assignment', [TeacherController::class, 'removeAssignment'])->middleware(['role:admin']);
        Route::post('/{teacher}/create-user-account', [TeacherController::class, 'createUserAccount'])->middleware(['role:admin']);
        Route::delete('/{teacher}/remove-user-account', [TeacherController::class, 'removeUserAccount'])->middleware(['role:admin']);
        Route::post('/import/csv', [TeacherController::class, 'importCsv'])->middleware(['role:admin']);
    });

    // Routes pour la configuration des matières par série
    Route::prefix('series-subjects')->group(function () {
        // Routes accessibles aux admins et comptables (consultation)
        Route::get('/', [SeriesSubjectController::class, 'index'])->middleware(['role:admin,accountant,teacher']);
        Route::get('/class/{schoolClass}', [SeriesSubjectController::class, 'getByClass'])->middleware(['role:admin,accountant,teacher']);

        // Routes pour administrateurs uniquement (gestion)
        Route::post('/', [SeriesSubjectController::class, 'store'])->middleware(['role:admin']);
        Route::put('/{seriesSubject}', [SeriesSubjectController::class, 'update'])->middleware(['role:admin']);
        Route::delete('/{seriesSubject}', [SeriesSubjectController::class, 'destroy'])->middleware(['role:admin']);
        Route::post('/{seriesSubject}/toggle-status', [SeriesSubjectController::class, 'toggleStatus'])->middleware(['role:admin']);
        Route::post('/class/{schoolClass}/bulk-configure', [SeriesSubjectController::class, 'bulkConfigure'])->middleware(['role:admin']);
    });

    // Routes pour les affectations d'enseignants
    Route::prefix('teacher-assignments')->group(function () {
        // Routes accessibles aux admins et comptables (consultation)
        Route::get('/', [TeacherAssignmentController::class, 'index'])->middleware(['role:admin,accountant,teacher']);
        Route::get('/teacher/{teacher}', [TeacherAssignmentController::class, 'getByTeacher'])->middleware(['role:admin,accountant,teacher']);
        Route::get('/teacher/{teacher}/available-subjects', [TeacherAssignmentController::class, 'getAvailableSubjects'])->middleware(['role:admin,accountant']);

        // Routes pour administrateurs uniquement (gestion)
        Route::post('/', [TeacherAssignmentController::class, 'store'])->middleware(['role:admin']);
        Route::delete('/{assignment}', [TeacherAssignmentController::class, 'destroy'])->middleware(['role:admin']);
        Route::post('/{assignment}/toggle-status', [TeacherAssignmentController::class, 'toggleStatus'])->middleware(['role:admin']);
        Route::post('/teacher/{teacher}/bulk-assign', [TeacherAssignmentController::class, 'bulkAssign'])->middleware(['role:admin']);
    });

    // Routes pour les professeurs principaux
    Route::prefix('main-teachers')->group(function () {
        // Routes accessibles aux admins et comptables (consultation)
        Route::get('/', [MainTeacherController::class, 'index'])->middleware(['role:admin,accountant,teacher']);
        Route::get('/classes-without-main-teacher', [MainTeacherController::class, 'getClassesWithoutMainTeacher'])->middleware(['role:admin,accountant']);
        Route::get('/available-teachers', [MainTeacherController::class, 'getAvailableTeachers'])->middleware(['role:admin,accountant']);

        // Routes pour administrateurs uniquement (gestion)
        Route::post('/', [MainTeacherController::class, 'store'])->middleware(['role:admin']);
        Route::put('/{mainTeacher}', [MainTeacherController::class, 'update'])->middleware(['role:admin']);
        Route::delete('/{mainTeacher}', [MainTeacherController::class, 'destroy'])->middleware(['role:admin']);
        Route::post('/{mainTeacher}/toggle-status', [MainTeacherController::class, 'toggleStatus'])->middleware(['role:admin']);
    });

    // Routes pour les besoins
    Route::prefix('needs')->group(function () {
        // Routes pour tous les utilisateurs authentifiés
        Route::post('/', [NeedController::class, 'store']); // Soumettre un besoin
        Route::get('/my-needs', [NeedController::class, 'myNeeds']); // Voir ses propres besoins
        Route::put('/{need}', [NeedController::class, 'update']); // Modifier un besoin (propriétaire uniquement)
        Route::delete('/{need}', [NeedController::class, 'destroy']); // Supprimer un besoin (propriétaire uniquement)
        Route::get('/{need}', [NeedController::class, 'show']); // Voir un besoin spécifique (avec contrôle d'accès)

        // Routes pour administrateurs et comptables supérieurs
        Route::get('/', [NeedController::class, 'index'])->middleware(['role:admin,comptable_superieur']); // Lister tous les besoins
        Route::post('/{need}/approve', [NeedController::class, 'approve'])->middleware(['role:admin,comptable_superieur']); // Approuver
        Route::post('/{need}/reject', [NeedController::class, 'reject'])->middleware(['role:admin,comptable_superieur']); // Rejeter
        Route::get('/statistics/summary', [NeedController::class, 'statistics'])->middleware(['role:admin,comptable_superieur']); // Statistiques
        Route::post('/test-whatsapp', [NeedController::class, 'testWhatsApp'])->middleware(['role:admin']); // Test WhatsApp (admin uniquement)
        
        // Routes d'export pour administrateurs et comptables supérieurs
        Route::get('/export/pdf', [NeedController::class, 'exportPdf'])->middleware(['role:admin,comptable_superieur']); // Export PDF
        Route::get('/export/excel', [NeedController::class, 'exportExcel'])->middleware(['role:admin,comptable_superieur']); // Export Excel
        Route::get('/export/word', [NeedController::class, 'exportWord'])->middleware(['role:admin,comptable_superieur']); // Export Word
    });

    // Routes pour les surveillants généraux
    Route::prefix('supervisors')->group(function () {
        // Routes pour administrateurs uniquement (gestion des affectations)
        Route::post('/assign-to-class', [SupervisorController::class, 'assignSupervisorToClass'])->middleware(['role:admin']);
        Route::get('/all-assignments', [SupervisorController::class, 'getAllAssignments'])->middleware(['role:admin']);
        Route::delete('/assignments/{assignmentId}', [SupervisorController::class, 'deleteAssignment'])->middleware(['role:admin']);
        Route::get('/{supervisorId}/assignments', [SupervisorController::class, 'getSupervisorAssignments'])->middleware(['role:admin,surveillant_general']);
        Route::get('/{supervisorId}/available-classes', [SupervisorController::class, 'getAvailableClasses'])->middleware(['role:admin,surveillant_general']);

        // Routes pour surveillants généraux (scanner QR et voir présences)
        Route::post('/scan-qr', [SupervisorController::class, 'scanStudentQR'])->middleware(['role:admin,surveillant_general']);
        Route::get('/daily-attendance', [SupervisorController::class, 'getDailyAttendance'])->middleware(['role:admin,surveillant_general']);
        Route::get('/attendance-range', [SupervisorController::class, 'getAttendanceRange'])->middleware(['role:admin,surveillant_general']);
        Route::get('/entry-exit-stats', [SupervisorController::class, 'getEntryExitStats'])->middleware(['role:admin,surveillant_general']);
        Route::post('/student-status', [SupervisorController::class, 'getStudentCurrentStatus'])->middleware(['role:admin,surveillant_general']);
        Route::post('/mark-absent-students', [SupervisorController::class, 'markAbsentStudents'])->middleware(['role:admin,surveillant_general']);
        Route::post('/mark-all-absent-students', [SupervisorController::class, 'markAllAbsentStudents'])->middleware(['role:admin,surveillant_general']);

        // Routes pour génération codes QR
        Route::get('/generate-qr/{studentId}', [SupervisorController::class, 'generateStudentQR'])->middleware(['role:admin']);
        Route::get('/generate-all-qrs', [SupervisorController::class, 'generateAllStudentQRs'])->middleware(['role:admin']);
    });

    // Routes pour la gestion RAME simplifiée
    Route::prefix('student-rame')->middleware(['role:admin,accountant'])->group(function () {
        Route::get('/student/{studentId}/status', [StudentRameController::class, 'getRameStatus']);
        Route::post('/student/{studentId}/update', [StudentRameController::class, 'updateRameStatus']);
        Route::get('/class-series/{classSeriesId}', [StudentRameController::class, 'getClassRameStatus']);
    });

    // Routes pour l'inventaire scolaire
    Route::prefix('inventory')->middleware(['role:admin,accountant,comptable_superieur'])->group(function () {
        // Routes de consultation (routes spécifiques d'abord)
        Route::get('/', [InventoryController::class, 'index']);
        Route::get('/dashboard', [InventoryController::class, 'dashboard']);
        Route::get('/config', [InventoryController::class, 'config']);
        Route::get('/export', [InventoryController::class, 'export']);
        Route::get('/movements/recent', [InventoryController::class, 'getRecentMovements']);

        // Routes pour les alertes WhatsApp
        Route::get('/low-stock-items', [InventoryController::class, 'getLowStockItems']);
        Route::post('/send-low-stock-alert', [InventoryController::class, 'sendLowStockAlert'])->middleware(['role:admin']);
        Route::post('/test-whatsapp', [InventoryController::class, 'testWhatsAppConfig'])->middleware(['role:admin']);

        // Routes avec paramètres (après les routes spécifiques)
        Route::get('/{inventoryItem}', [InventoryController::class, 'show']);
        Route::get('/{inventoryItem}/movements', [InventoryController::class, 'getMovements']);

        // Routes de gestion (admin uniquement)
        Route::post('/', [InventoryController::class, 'store'])->middleware(['role:admin']);
        Route::put('/{inventoryItem}', [InventoryController::class, 'update'])->middleware(['role:admin']);
        Route::patch('/{inventoryItem}/quantity', [InventoryController::class, 'updateQuantity'])->middleware(['role:admin']);
        Route::post('/{inventoryItem}/movements', [InventoryController::class, 'recordMovement'])->middleware(['role:admin']);
        Route::delete('/{inventoryItem}', [InventoryController::class, 'destroy'])->middleware(['role:admin']);
    });

    // Routes pour le module Cahier des pièces jointes
    Route::prefix('documents')->group(function () {
        // Routes pour les dossiers
        Route::prefix('folders')->group(function () {
            Route::get('/', [DocumentFolderController::class, 'index']); // Lister les dossiers
            Route::get('/tree', [DocumentFolderController::class, 'getTree']); // Arborescence des dossiers
            Route::get('/types', [DocumentFolderController::class, 'getFolderTypes']); // Types de dossiers
            Route::get('/search', [DocumentFolderController::class, 'search']); // Rechercher dans les dossiers
            Route::post('/', [DocumentFolderController::class, 'store']); // Créer un dossier
            Route::get('/{documentFolder}', [DocumentFolderController::class, 'show']); // Voir un dossier
            Route::put('/{documentFolder}', [DocumentFolderController::class, 'update']); // Modifier un dossier
            Route::delete('/{documentFolder}', [DocumentFolderController::class, 'destroy']); // Supprimer un dossier
        });

        // Routes pour les documents
        Route::get('/', [DocumentController::class, 'index']); // Lister les documents
        Route::get('/statistics', [DocumentController::class, 'statistics']); // Statistiques des documents
        Route::get('/types', [DocumentController::class, 'getTypes']); // Types de documents
        Route::get('/visibility-types', [DocumentController::class, 'getVisibilityTypes']); // Types de visibilité
        Route::post('/', [DocumentController::class, 'store']); // Uploader un document
        Route::get('/{document}', [DocumentController::class, 'show']); // Voir un document
        Route::put('/{document}', [DocumentController::class, 'update']); // Modifier un document
        Route::delete('/{document}', [DocumentController::class, 'destroy']); // Supprimer un document
        Route::get('/{document}/download', [DocumentController::class, 'download']); // Télécharger un document
        Route::post('/{document}/toggle-archive', [DocumentController::class, 'toggleArchive']); // Archiver/désarchiver
    });

    // Routes pour les présences des enseignants
    Route::prefix('teacher-attendance')->group(function () {
        // Routes pour scan QR des enseignants
        Route::post('/scan-qr', [TeacherAttendanceController::class, 'scanQR'])->middleware(['role:admin,surveillant_general']);
        Route::get('/daily-attendance', [TeacherAttendanceController::class, 'getDailyAttendance'])->middleware(['role:admin,surveillant_general']);
        Route::get('/entry-exit-stats', [TeacherAttendanceController::class, 'getEntryExitStats'])->middleware(['role:admin,surveillant_general']);
        
        // Routes pour gestion des QR codes enseignants
        Route::post('/generate-qr', [TeacherAttendanceController::class, 'generateQRCode'])->middleware(['role:admin']);
        Route::get('/teachers-with-qr', [TeacherAttendanceController::class, 'getTeachersWithQR'])->middleware(['role:admin,surveillant_general']);
        
        // Routes pour rapports et statistiques
        Route::get('/teacher/{teacherId}/report', [TeacherAttendanceController::class, 'getTeacherReport'])->middleware(['role:admin,surveillant_general']);
        Route::get('/teacher/{teacherId}/detailed-stats', [TeacherAttendanceController::class, 'getDetailedTeacherStats'])->middleware(['role:admin,surveillant_general']);
        Route::get('/teacher/{teacherId}/day-movements', [TeacherAttendanceController::class, 'getDayMovements'])->middleware(['role:admin,surveillant_general']);
        Route::put('/teacher/{teacherId}/work-schedule', [TeacherAttendanceController::class, 'updateWorkSchedule'])->middleware(['role:admin']);
    });
});
