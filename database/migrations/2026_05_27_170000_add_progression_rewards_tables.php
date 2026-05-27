<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rewards', function (Blueprint $table): void {
            $table->text('description')->nullable()->after('title');
            $table->string('image')->nullable()->after('description');
            $table->unsignedInteger('sort_order')->default(0)->after('required_stamps');
        });

        Schema::create('customer_reward_cycles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('cycle_number');
            $table->unsignedInteger('max_milestone_stamps')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['customer_id', 'cycle_number']);
            $table->index(['customer_id', 'completed_at']);
        });

        Schema::create('reward_unlocks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reward_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('cycle_number');
            $table->timestamp('unlocked_at')->useCurrent();
            $table->timestamp('claimed_at')->nullable();
            $table->foreignId('claimed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['customer_id', 'reward_id', 'cycle_number']);
            $table->index(['customer_id', 'cycle_number', 'claimed_at']);
        });

        DB::table('customers')->orderBy('id')->chunkById(200, function ($customers): void {
            $rows = [];
            $now = now();

            foreach ($customers as $customer) {
                $rows[] = [
                    'customer_id' => $customer->id,
                    'cycle_number' => 1,
                    'max_milestone_stamps' => 0,
                    'completed_at' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if ($rows !== []) {
                DB::table('customer_reward_cycles')->insert($rows);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reward_unlocks');
        Schema::dropIfExists('customer_reward_cycles');

        Schema::table('rewards', function (Blueprint $table): void {
            $table->dropColumn(['description', 'image', 'sort_order']);
        });
    }
};
