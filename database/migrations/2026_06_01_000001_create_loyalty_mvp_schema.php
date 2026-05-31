<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('google_id')->nullable()->unique();
            $table->text('google_avatar')->nullable();
            $table->boolean('is_admin')->default(false)->index();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('venues', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('category', 20)->default('cafe');
            $table->string('logo')->nullable();
            $table->string('logo_thumb')->nullable();
            $table->string('cover_image')->nullable();
            $table->string('cover_image_thumb')->nullable();
            $table->string('address')->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('website')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('active_venue_id')->nullable()->after('is_admin')->constrained('venues')->nullOnDelete();
        });

        Schema::create('venue_users', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role')->index();
            $table->timestamps();

            $table->unique(['venue_id', 'user_id']);
            $table->index(['user_id', 'role']);
        });

        Schema::create('customers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->uuid('qr_token')->unique();
            $table->unsignedInteger('stamps')->default(0);
            $table->timestamps();

            $table->unique(['venue_id', 'user_id']);
            $table->index(['venue_id', 'stamps']);
        });

        Schema::create('rewards', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->string('image_thumb')->nullable();
            $table->unsignedInteger('required_stamps');
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('reward_type')->default('milestone');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['venue_id', 'active', 'required_stamps']);
        });

        Schema::create('visits', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['venue_id', 'created_at']);
            $table->index(['customer_id', 'created_at']);
        });

        Schema::create('customer_reward_cycles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->unsignedInteger('cycle_number');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['customer_id', 'cycle_number']);
            $table->index(['customer_id', 'completed_at']);
        });

        Schema::create('reward_unlocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('reward_id')->constrained('rewards')->cascadeOnDelete();
            $table->unsignedInteger('cycle_number');
            $table->timestamp('unlocked_at')->useCurrent();
            $table->timestamp('claimed_at')->nullable();
            $table->foreignId('claimed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['customer_id', 'reward_id', 'cycle_number']);
            $table->index(['customer_id', 'cycle_number', 'claimed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reward_unlocks');
        Schema::dropIfExists('customer_reward_cycles');
        Schema::dropIfExists('visits');
        Schema::dropIfExists('rewards');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('venue_users');
        Schema::table('users', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('active_venue_id');
        });
        Schema::dropIfExists('venues');
        Schema::dropIfExists('users');
    }
};
