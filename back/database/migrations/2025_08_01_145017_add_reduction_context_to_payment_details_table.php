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
        Schema::table('payment_details', function (Blueprint $table) {
            $table->decimal('required_amount_at_time', 10, 2)->default(0)->after('new_total_amount');
            $table->boolean('was_reduced')->default(false)->after('required_amount_at_time');
            $table->text('reduction_context')->nullable()->after('was_reduced');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_details', function (Blueprint $table) {
            $table->dropColumn(['required_amount_at_time', 'was_reduced', 'reduction_context']);
        });
    }
};
