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
        Schema::table('school_settings', function (Blueprint $table) {
            $table->string('whatsapp_notification_number')->nullable()->after('primary_color');
            $table->boolean('whatsapp_notifications_enabled')->default(false)->after('whatsapp_notification_number');
            $table->string('whatsapp_api_url')->nullable()->after('whatsapp_notifications_enabled');
            $table->string('whatsapp_instance_id')->nullable()->after('whatsapp_api_url');
            $table->string('whatsapp_token')->nullable()->after('whatsapp_instance_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('school_settings', function (Blueprint $table) {
            $table->dropColumn([
                'whatsapp_notification_number',
                'whatsapp_notifications_enabled',
                'whatsapp_api_url',
                'whatsapp_instance_id',
                'whatsapp_token'
            ]);
        });
    }
};
