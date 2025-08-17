<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('school_settings', function (Blueprint $table) {
            $table->id();
            $table->string('school_name')->default('COLLÈGE POLYVALENT BILINGUE DE DOUALA');
            $table->string('school_motto')->nullable();
            $table->text('school_address')->nullable();
            $table->string('school_phone')->nullable();
            $table->string('school_email')->nullable();
            $table->string('school_website')->nullable();
            $table->string('school_logo')->nullable();
            $table->string('currency', 10)->default('FCFA');
            $table->string('bank_name')->default('FIGEC');
            $table->string('country')->default('Cameroun');
            $table->string('city')->default('Douala');
            $table->text('footer_text')->nullable();
            $table->date('scholarship_deadline')->nullable()->comment('Date limite pour bénéficier des bourses');
            $table->decimal('reduction_percentage', 5, 2)->default(10.00)->comment('Pourcentage de réduction pour anciens étudiants');
            $table->timestamps();
        });

        // Insérer les paramètres par défaut
        DB::table('school_settings')->insert([
            'school_name' => 'COLLÈGE POLYVALENT BILINGUE DE DOUALA',
            'school_address' => 'B.P. 4100, Douala, Cameroun',
            'school_phone' => '233 43 25 47',
            'school_email' => 'contact@cpdyassa.com',
            'school_website' => 'www.cpdyassa.com',
            'currency' => 'FCFA',
            'bank_name' => 'FIGEC',
            'country' => 'Cameroun',
            'city' => 'Douala',
            'footer_text' => 'Vos dossiers ne seront transmis qu\'après paiement de la totalité des frais de scolarité sollicités',
            'scholarship_deadline' => '2024-12-31',
            'reduction_percentage' => 10.00,
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('school_settings');
    }
};
