<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venues', function (Blueprint $table): void {
            $table->string('location_status', 20)->nullable()->after('is_primary');
            $table->timestamp('location_submitted_at')->nullable()->after('location_status');
            $table->timestamp('location_published_at')->nullable()->after('location_submitted_at');
            $table->text('location_review_note')->nullable()->after('location_published_at');
        });

        DB::table('venues')
            ->where('is_primary', false)
            ->whereNull('location_status')
            ->update(['location_status' => 'published']);
    }

    public function down(): void
    {
        Schema::table('venues', function (Blueprint $table): void {
            $table->dropColumn([
                'location_status',
                'location_submitted_at',
                'location_published_at',
                'location_review_note',
            ]);
        });
    }
};
