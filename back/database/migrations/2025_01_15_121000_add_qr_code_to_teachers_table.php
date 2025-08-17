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
        Schema::table('teachers', function (Blueprint $table) {
            $table->string('qr_code')->nullable()->unique()->after('user_id');
            $table->time('expected_arrival_time')->default('08:00:00')->after('qr_code');
            $table->time('expected_departure_time')->default('17:00:00')->after('expected_arrival_time');
            $table->decimal('daily_work_hours', 4, 2)->default(8.00)->after('expected_departure_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teachers', function (Blueprint $table) {
            $table->dropColumn(['qr_code', 'expected_arrival_time', 'expected_departure_time', 'daily_work_hours']);
        });
    }
};