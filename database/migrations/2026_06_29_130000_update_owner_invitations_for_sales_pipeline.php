<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('owner_invitations', function (Blueprint $table): void {
            $table->dropForeign(['venue_id']);
        });

        Schema::table('owner_invitations', function (Blueprint $table): void {
            $table->foreignId('venue_id')->nullable()->change();
            $table->string('business_name', 120)->nullable()->after('email');
        });

        Schema::table('owner_invitations', function (Blueprint $table): void {
            $table->foreign('venue_id')->references('id')->on('venues')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('owner_invitations', function (Blueprint $table): void {
            $table->dropForeign(['venue_id']);
            $table->dropColumn('business_name');
        });

        Schema::table('owner_invitations', function (Blueprint $table): void {
            $table->foreignId('venue_id')->nullable(false)->change();
            $table->foreign('venue_id')->references('id')->on('venues')->cascadeOnDelete();
        });
    }
};
