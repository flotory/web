<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venues', function (Blueprint $table): void {
            if (! Schema::hasColumn('venues', 'timezone')) {
                $table->string('timezone')->nullable()->after('longitude');
            }
        });
    }

    public function down(): void
    {
        Schema::table('venues', function (Blueprint $table): void {
            if (Schema::hasColumn('venues', 'timezone')) {
                $table->dropColumn('timezone');
            }
        });
    }
};
