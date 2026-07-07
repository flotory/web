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
            $table->date('birthday')->nullable();
            $table->boolean('is_admin')->default(false)->index();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('brands', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('category', 20)->default('cafe');
            $table->string('logo')->nullable();
            $table->string('logo_thumb')->nullable();
            $table->string('cover_image')->nullable();
            $table->string('cover_image_thumb')->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('website')->nullable();
            $table->decimal('average_check_amount', 10, 2)->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->text('review_note')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('venues', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('brand_id')->constrained('brands')->cascadeOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('timezone')->nullable();
            $table->string('google_place_id')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['brand_id', 'is_primary']);
            $table->index(['latitude', 'longitude']);
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->foreignId('active_venue_id')->nullable()->after('is_admin')->constrained('venues')->nullOnDelete();
        });

        Schema::create('brand_users', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('brand_id')->constrained('brands')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role')->index();
            $table->timestamps();

            $table->unique(['brand_id', 'user_id']);
            $table->index(['user_id', 'role']);
        });

        Schema::create('customers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('brand_id')->constrained('brands')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('stamps')->default(0);
            $table->unsignedInteger('lifetime_stamps')->default(0);
            $table->timestamps();

            $table->unique(['brand_id', 'user_id']);
            $table->index(['brand_id', 'stamps']);
        });

        Schema::create('rewards', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('brand_id')->constrained('brands')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->string('image_thumb')->nullable();
            $table->unsignedInteger('required_stamps');
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('reward_type')->default('milestone');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['brand_id', 'active', 'required_stamps']);
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

        Schema::create('activity_log', function (Blueprint $table): void {
            $table->id();
            $table->string('log_name')->nullable()->index();
            $table->text('description');
            $table->nullableMorphs('subject', 'subject');
            $table->string('event')->nullable();
            $table->nullableMorphs('causer', 'causer');
            $table->json('attribute_changes')->nullable();
            $table->json('properties')->nullable();
            $table->timestamps();
        });

        Schema::create('customer_notes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();

            $table->index(['customer_id', 'created_at']);
        });

        Schema::create('campaigns', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('brand_id')->constrained('brands')->cascadeOnDelete();
            $table->string('template_id', 40);
            $table->string('name');
            $table->string('status', 20)->default('draft');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->json('config');
            $table->boolean('push_enabled')->default(true);
            $table->timestamp('activated_at')->nullable();
            $table->unsignedInteger('audience_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['brand_id', 'status']);
        });

        Schema::create('platform_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->timestamps();
        });

        Schema::create('venue_address_changes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['venue_id', 'created_at']);
        });

        Schema::create('venue_setup_files', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('brand_id')->constrained('brands')->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('kind', 32);
            $table->string('original_name');
            $table->string('path');
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('byte_size');
            $table->timestamps();

            $table->index(['brand_id', 'kind']);
        });

        Schema::create('nfc_tags', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->string('label')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['venue_id', 'active']);
        });

        Schema::create('stamp_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('venue_id')->constrained('venues')->cascadeOnDelete();
            $table->foreignId('nfc_tag_id')->constrained('nfc_tags')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'venue_id', 'created_at']);
            $table->index(['nfc_tag_id', 'user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stamp_events');
        Schema::dropIfExists('nfc_tags');
        Schema::dropIfExists('venue_setup_files');
        Schema::dropIfExists('venue_address_changes');
        Schema::dropIfExists('platform_settings');
        Schema::dropIfExists('campaigns');
        Schema::dropIfExists('customer_notes');
        Schema::dropIfExists('activity_log');
        Schema::dropIfExists('reward_unlocks');
        Schema::dropIfExists('customer_reward_cycles');
        Schema::dropIfExists('visits');
        Schema::dropIfExists('rewards');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('brand_users');
        Schema::table('users', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('active_venue_id');
        });
        Schema::dropIfExists('venues');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('users');
    }
};
