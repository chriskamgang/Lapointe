<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Améliorer la table schools
        Schema::table('schools', function (Blueprint $table) {
            //$table->string('code', 10)->unique()->after('name');
            //$table->text('description')->nullable()->after('code');
            $table->json('equipment_config')->nullable()->after('description');
            $table->json('pricing_config')->nullable()->after('equipment_config');
        });

        // Améliorer la table levels
        Schema::table('levels', function (Blueprint $table) {
            //$table->string('level_type', 50)->nullable()->after('name');
            $table->json('speciality_categories')->nullable()->after('level_type');
        });

        // Améliorer la table school_classes
        Schema::table('school_classes', function (Blueprint $table) {
            //$table->string('speciality_code', 100)->nullable()->after('name');
            $table->string('category', 50)->nullable()->after('speciality_code');
            $table->json('scholarship_config')->nullable()->after('category');
            $table->json('equipment_config')->nullable()->after('scholarship_config');
        });

        // Améliorer la table students pour les nouvelles fonctionnalités
        Schema::table('students', function (Blueprint $table) {
            //$table->enum('bts_mention', ['passable', 'assez_bien', 'bien', 'tres_bien'])->nullable()->after('current_level');
            $table->boolean('scholarship_enabled')->default(true)->after('bts_mention');
            //$table->decimal('scholarship_amount', 10, 2)->default(0)->after('scholarship_enabled');
            $table->json('equipment_status')->nullable()->after('scholarship_amount');
        });
    }

    public function down()
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['bts_mention', 'scholarship_enabled', 'scholarship_amount', 'equipment_status']);
        });

        Schema::table('school_classes', function (Blueprint $table) {
            $table->dropColumn(['speciality_code', 'category', 'scholarship_config', 'equipment_config']);
        });

        Schema::table('levels', function (Blueprint $table) {
            $table->dropColumn(['level_type', 'speciality_categories']);
        });

        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn(['code', 'description', 'equipment_config', 'pricing_config']);
        });
    }
};