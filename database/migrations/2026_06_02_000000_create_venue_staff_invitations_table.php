<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('venue_staff_invitations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->string('email');
            $table->string('role')->default('staff');
            $table->string('token', 64)->unique();
            $table->foreignId('invited_by')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('accepted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['venue_id', 'status']);
            $table->index(['venue_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('venue_staff_invitations');
    }
};
