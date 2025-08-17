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
        Schema::table('attendances', function (Blueprint $table) {
            // Ajouter le type d'événement : 'entry' ou 'exit'
            $table->enum('event_type', ['entry', 'exit'])->default('entry')->after('is_present');
            
            // Ajouter un champ pour indiquer si les parents ont été notifiés
            $table->boolean('parent_notified')->default(false)->after('event_type');
            
            // Ajouter l'heure de notification pour tracking
            $table->timestamp('notified_at')->nullable()->after('parent_notified');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn(['event_type', 'parent_notified', 'notified_at']);
        });
    }
};
