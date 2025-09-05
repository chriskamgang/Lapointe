<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Ajouter des colonnes pour les équipements aux tranches de paiement
        Schema::table('payment_tranches', function (Blueprint $table) {
            $table->boolean('is_equipment')->default(false)->after('use_default_amount');
            $table->enum('equipment_type', ['polo', 'blouse', 'laptop', 'rame', 'concours'])->nullable()->after('is_equipment');
            $table->boolean('requires_physical_item')->default(false)->after('equipment_type');
        });

        // Créer table pour suivre le statut des équipements par étudiant
        Schema::create('student_equipment_status', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->foreignId('school_year_id')->constrained()->onDelete('cascade');
            $table->enum('equipment_type', ['polo', 'blouse', 'laptop', 'rame']);
            $table->boolean('is_required')->default(true);
            $table->boolean('has_paid_for')->default(false);
            $table->boolean('has_received')->default(false);
            $table->boolean('brought_physical')->default(false);
            $table->decimal('amount_paid', 10, 2)->default(0);
            $table->date('paid_date')->nullable();
            $table->date('received_date')->nullable();
            $table->string('distributed_by')->nullable();
            $table->string('payment_method')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'school_year_id', 'equipment_type'], 'unique_student_equipment');
            $table->index(['student_id', 'equipment_type']);
            $table->index(['has_paid_for', 'has_received']);
        });

        // Mettre à jour les tranches existantes pour inclure les équipements
        DB::statement("UPDATE payment_tranches SET is_equipment = true, equipment_type = 'polo', requires_physical_item = true WHERE name = 'Polo'");
        DB::statement("UPDATE payment_tranches SET is_equipment = true, equipment_type = 'blouse', requires_physical_item = true WHERE name = 'Blouse'");
        DB::statement("UPDATE payment_tranches SET is_equipment = true, equipment_type = 'rame', requires_physical_item = true WHERE name = 'Rames Papier'");
        
        // Ajouter les nouvelles tranches d'équipement
        /*DB::table('payment_tranches')->insertOrIgnore([
            ['name' => 'Polo', 'description' => 'Polo école avec logo', 'order' => 3, 'is_equipment' => true, 'equipment_type' => 'polo', 'requires_physical_item' => true, 'is_active' => true],
            ['name' => 'Blouse', 'description' => 'Blouse médicale', 'order' => 4, 'is_equipment' => true, 'equipment_type' => 'blouse', 'requires_physical_item' => true, 'is_active' => true],
            ['name' => 'Concours Ingénierie', 'description' => 'Frais de concours ingénierie', 'order' => 2, 'is_equipment' => true, 'equipment_type' => 'concours', 'requires_physical_item' => false, 'is_active' => true]
        ]);*/
    }

    public function down()
    {
        Schema::dropIfExists('student_equipment_status');
        Schema::table('payment_tranches', function (Blueprint $table) {
            $table->dropColumn(['is_equipment', 'equipment_type', 'requires_physical_item']);
        });
    }
};