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
            $table->string('status', 20)->default('draft')->after('website')->index();
            $table->text('review_note')->nullable()->after('status');
            $table->timestamp('submitted_at')->nullable()->after('review_note');
            $table->timestamp('published_at')->nullable()->after('submitted_at');
        });

        DB::table('venues')->update([
            'status' => 'published',
            'published_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('venues', function (Blueprint $table): void {
            $table->dropColumn(['status', 'review_note', 'submitted_at', 'published_at']);
        });
    }
};
