<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Renommer sections en écoles (schools)
        Schema::rename('sections', 'schools');
        
        // 2. Ajouter des colonnes supplémentaires aux écoles
        Schema::table('schools', function (Blueprint $table) {
            $table->string('code', 10)->nullable()->after('name');
            $table->text('director_name')->nullable()->after('description');
            $table->string('director_email')->nullable()->after('director_name');
            $table->string('director_phone')->nullable()->after('director_email');
        });

        // 3. Adapter les niveaux pour l'université
        Schema::table('levels', function (Blueprint $table) {
            $table->renameColumn('section_id', 'school_id');
            $table->string('level_code', 20)->nullable()->after('name');
            $table->integer('duration_years')->default(1)->after('level_code');
            $table->enum('level_type', ['BTS', 'HND', 'LICENCE', 'LICENCE_PRO', 'BACHELOR', 'MASTER', 'CQP', 'DQP', 'TMS', 'INGENIERIE'])->after('duration_years');
        });

        // 4. Adapter les classes en spécialités
        Schema::table('school_classes', function (Blueprint $table) {
            $table->string('speciality_code', 20)->nullable()->after('name');
            $table->integer('max_capacity')->default(40)->after('description');
            $table->text('career_prospects')->nullable()->after('max_capacity');
            $table->json('admission_requirements')->nullable()->after('career_prospects');
        });

        // 5. Adapter les séries en salles/groupes
        Schema::table('class_series', function (Blueprint $table) {
            $table->string('room_type', 50)->default('Salle de cours')->after('code');
            $table->text('equipment')->nullable()->after('room_type');
        });

        // 6. Créer table pour les bourses universitaires
        Schema::create('university_scholarships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->onDelete('cascade');
            $table->string('level_type');
            $table->string('formation_name');
            $table->decimal('scholarship_amount', 10, 2)->default(0);
            $table->boolean('laptop_included')->default(false);
            $table->text('conditions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 7. Créer table pour la distribution d'ordinateurs
        Schema::create('laptop_distributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained()->onDelete('cascade');
            $table->string('laptop_model')->nullable();
            $table->string('serial_number')->unique()->nullable();
            $table->date('distribution_date');
            $table->date('return_date')->nullable();
            $table->enum('status', ['distributed', 'returned', 'damaged', 'lost'])->default('distributed');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 8. Ajouter colonnes aux étudiants pour les bourses
        Schema::table('students', function (Blueprint $table) {
            $table->decimal('scholarship_amount', 10, 2)->default(0)->after('parent_email');
            $table->boolean('laptop_eligible')->default(false)->after('scholarship_amount');
            $table->boolean('laptop_received')->default(false)->after('laptop_eligible');
            $table->string('bts_mention')->nullable()->after('laptop_received');
        });

        // 9. Créer table pour les frais universitaires
        Schema::create('university_fees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained('schools')->onDelete('cascade');
            $table->string('level_type');
            $table->string('speciality');
            $table->decimal('inscription_fee', 10, 2)->default(40000);
            $table->decimal('first_installment', 10, 2);
            $table->decimal('second_installment', 10, 2);
            $table->decimal('third_installment', 10, 2);
            $table->decimal('total_annual_fee', 10, 2);
            $table->integer('duration_years')->default(1);
            $table->text('included_benefits')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 10. Mettre à jour les foreign keys
        Schema::table('levels', function (Blueprint $table) {
            $table->foreign('school_id')->references('id')->on('schools')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('laptop_distributions');
        Schema::dropIfExists('university_scholarships');
        Schema::dropIfExists('university_fees');
        
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['scholarship_amount', 'laptop_eligible', 'laptop_received', 'bts_mention']);
        });

        Schema::table('class_series', function (Blueprint $table) {
            $table->dropColumn(['room_type', 'equipment']);
        });

        Schema::table('school_classes', function (Blueprint $table) {
            $table->dropColumn(['speciality_code', 'max_capacity', 'career_prospects', 'admission_requirements']);
        });

        Schema::table('levels', function (Blueprint $table) {
            $table->dropForeign(['school_id']);
            $table->renameColumn('school_id', 'section_id');
            $table->dropColumn(['level_code', 'duration_years', 'level_type']);
        });

        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn(['code', 'director_name', 'director_email', 'director_phone']);
        });

        Schema::rename('schools', 'sections');
    }
};