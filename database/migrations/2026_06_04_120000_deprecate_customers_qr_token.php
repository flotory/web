<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique(['qr_token']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->uuid('qr_token')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->uuid('qr_token')->nullable(false)->change();
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->unique('qr_token');
        });
    }
};
