<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('redemption_requests');
        Schema::dropIfExists('user_stamp_tokens');
        Schema::dropIfExists('venue_staff_invitations');
        Schema::dropIfExists('demo_leads');

        if (Schema::hasColumn('customers', 'qr_token')) {
            Schema::table('customers', function (Blueprint $table): void {
                $table->dropColumn('qr_token');
            });
        }
    }

    public function down(): void
    {
        // Irreversible cleanup for removed product surfaces.
    }
};
