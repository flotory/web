<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venues', function (Blueprint $table): void {
            $table->decimal('average_check_amount', 10, 2)->nullable()->after('website');
        });
    }

    public function down(): void
    {
        Schema::table('venues', function (Blueprint $table): void {
            $table->dropColumn('average_check_amount');
        });
    }
};
