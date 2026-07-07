<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        // business_name and nullable brand_id are defined in the owner_invitations create migration.
    }

    public function down(): void
    {
        // no-op
    }
};
