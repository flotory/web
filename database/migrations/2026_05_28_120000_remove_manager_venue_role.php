<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('venue_users')
            ->where('role', 'manager')
            ->update(['role' => 'staff']);
    }

    public function down(): void
    {
        // Manager role removed from MVP; no safe way to restore prior assignments.
    }
};
