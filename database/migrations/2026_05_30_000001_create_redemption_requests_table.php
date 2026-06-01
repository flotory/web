<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('redemption_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('reward_unlock_id')->constrained('reward_unlocks')->cascadeOnDelete();
            $table->uuid('token')->unique();
            $table->timestamp('expires_at');
            $table->timestamp('claimed_at')->nullable();
            $table->foreignId('claimed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['token', 'expires_at']);
            $table->index(['reward_unlock_id', 'claimed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('redemption_requests');
    }
};
