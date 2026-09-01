<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('students', function (Blueprint $table) {
            // Colonnes pour le suivi des paiements
            $table->boolean('has_payments')->default(false)->after('is_active');
            $table->timestamp('last_payment_date')->nullable()->after('has_payments');
            
            // Colonne pour la mention BTS (ESGIT Licence Pro)
            //$table->enum('bts_mention', ['passable', 'assez_bien', 'bien', 'tres_bien'])->nullable()->after('last_payment_date');
            
            // Niveau actuel de l'étudiant (1, 2, 3, etc.)
            $table->integer('current_level')->default(1)->after('bts_mention');
        });
    }

    public function down()
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['has_payments', 'last_payment_date', 'bts_mention', 'current_level']);
        });
    }
};