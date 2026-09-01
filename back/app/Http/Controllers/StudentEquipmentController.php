<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\StudentEquipmentStatus;
use App\Models\Student;
use App\Models\SchoolYear;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
// Removed incorrect Exception import

class StudentEquipmentController extends Controller
{
    private function getUserWorkingYear()
    {
        $user = Auth::user();
        if ($user && $user->working_school_year_id) {
            $workingYear = SchoolYear::find($user->working_school_year_id);
            if ($workingYear && $workingYear->is_active) {
                return $workingYear;
            }
        }
        return SchoolYear::where('is_current', true)->first() ?? SchoolYear::where('is_active', true)->first();
    }

    public function undoPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'student_id' => 'required|exists:students,id',
            'equipment_type' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Données invalides', 'errors' => $validator->errors()], 422);
        }

        try {
            $workingYear = $this->getUserWorkingYear();
            if (!$workingYear) {
                return response()->json(['success' => false, 'message' => 'Aucune année scolaire définie'], 400);
            }

            $status = StudentEquipmentStatus::where('student_id', $request->student_id)
                ->where('school_year_id', $workingYear->id)
                ->where('equipment_type', $request->equipment_type)
                ->first();

            if ($status) {
                $status->update([
                    'has_paid_for' => false,
                    'paid_date' => null
                ]);
            }

            return response()->json(['success' => true, 'message' => 'Le statut de paiement de l\'équipement a été annulé.']);

        } catch (\Exception $e) {
            Log::error('Error in StudentEquipmentController@undoPayment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'annulation du paiement de l\'équipement.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
