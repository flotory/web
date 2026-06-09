<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('demo_leads');
    }

    public function down(): void
    {
        // Lead capture was removed; no restore path.
    }
};
