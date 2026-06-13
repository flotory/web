<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venues', function (Blueprint $table): void {
            $table->foreignId('parent_venue_id')
                ->nullable()
                ->after('id')
                ->constrained('venues')
                ->nullOnDelete();

            $table->index(['parent_venue_id', 'deleted_at']);
        });
    }

    public function down(): void
    {
        Schema::table('venues', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('parent_venue_id');
        });
    }
};
