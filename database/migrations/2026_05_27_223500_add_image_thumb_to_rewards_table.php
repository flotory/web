<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rewards', function (Blueprint $table): void {
            $table->string('image_thumb')->nullable()->after('image');
        });
    }

    public function down(): void
    {
        Schema::table('rewards', function (Blueprint $table): void {
            $table->dropColumn('image_thumb');
        });
    }
};
