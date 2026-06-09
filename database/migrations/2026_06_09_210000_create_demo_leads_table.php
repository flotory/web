<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demo_leads', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('venue_name')->nullable();
            $table->string('city')->nullable();
            $table->string('venue_type', 32)->nullable();
            $table->text('message')->nullable();
            $table->string('source', 64)->default('book-demo');
            $table->string('utm_source', 120)->nullable();
            $table->string('utm_campaign', 120)->nullable();
            $table->timestamps();

            $table->index('email');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demo_leads');
    }
};
