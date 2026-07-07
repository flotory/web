<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // average_check_amount is defined on brands in the base schema.
    }

    public function down(): void
    {
        // no-op
    }
};
