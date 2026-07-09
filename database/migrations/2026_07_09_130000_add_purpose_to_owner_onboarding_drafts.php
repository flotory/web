<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('owner_onboarding_drafts', function (Blueprint $table): void {
            $table->string('purpose', 32)->default('first_venue')->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('owner_onboarding_drafts', function (Blueprint $table): void {
            $table->dropColumn('purpose');
        });
    }
};
