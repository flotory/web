<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('venues') || Schema::hasTable('brands') || ! Schema::hasColumn('venues', 'category')) {
            return;
        }

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

        /** @var array<int, int> $venueBrandMap */
        $venueBrandMap = $this->createBrandsForVenues();

        Schema::table('venues', function (Blueprint $table): void {
            $table->foreignId('brand_id')->nullable()->after('id');
            $table->boolean('is_primary')->default(false)->after('brand_id');
        });

        $hasParentVenue = Schema::hasColumn('venues', 'parent_venue_id');

        foreach (DB::table('venues')->orderBy('id')->get() as $venue) {
            $brandId = $venueBrandMap[(int) $venue->id] ?? null;

            if ($brandId === null) {
                continue;
            }

            DB::table('venues')->where('id', $venue->id)->update([
                'brand_id' => $brandId,
                'is_primary' => ! ($hasParentVenue && filled($venue->parent_venue_id)),
            ]);
        }

        $this->migrateBrandUsers($venueBrandMap);
        $this->migrateCustomers($venueBrandMap);
        $this->migrateRewards($venueBrandMap);
        $this->migrateCampaigns($venueBrandMap);
        $this->migrateVenueSetupFiles($venueBrandMap);
        $this->migrateOwnerInvitations($venueBrandMap);
        $this->stripLegacyVenueColumns($hasParentVenue);

        Schema::table('venues', function (Blueprint $table): void {
            $table->foreign('brand_id')->references('id')->on('brands')->cascadeOnDelete();
            $table->index(['brand_id', 'is_primary']);
        });
    }

    public function down(): void
    {
        // Irreversible production upgrade.
    }

    /**
     * @return array<int, int>
     */
    private function createBrandsForVenues(): array
    {
        $hasParentVenue = Schema::hasColumn('venues', 'parent_venue_id');
        $hasAverageCheck = Schema::hasColumn('venues', 'average_check_amount');
        $venues = DB::table('venues')->orderBy('id')->get();
        $venueBrandMap = [];

        foreach ($venues as $venue) {
            if ($hasParentVenue && filled($venue->parent_venue_id)) {
                continue;
            }

            $venueBrandMap[(int) $venue->id] = $this->insertBrandFromVenue($venue, $hasAverageCheck);
        }

        if ($hasParentVenue) {
            foreach ($venues as $venue) {
                if (! filled($venue->parent_venue_id)) {
                    continue;
                }

                $parentBrandId = $venueBrandMap[(int) $venue->parent_venue_id] ?? null;

                if ($parentBrandId === null) {
                    $parentBrandId = $this->insertBrandFromVenue(
                        DB::table('venues')->where('id', $venue->parent_venue_id)->first(),
                        $hasAverageCheck,
                    );
                    $venueBrandMap[(int) $venue->parent_venue_id] = $parentBrandId;
                }

                $venueBrandMap[(int) $venue->id] = $parentBrandId;
            }
        }

        return $venueBrandMap;
    }

    private function insertBrandFromVenue(object $venue, bool $hasAverageCheck): int
    {
        return (int) DB::table('brands')->insertGetId([
            'name' => $venue->name,
            'slug' => $venue->slug,
            'category' => $venue->category ?? 'cafe',
            'logo' => $venue->logo ?? null,
            'logo_thumb' => $venue->logo_thumb ?? null,
            'cover_image' => $venue->cover_image ?? null,
            'cover_image_thumb' => $venue->cover_image_thumb ?? null,
            'phone' => $venue->phone ?? null,
            'website' => $venue->website ?? null,
            'average_check_amount' => $hasAverageCheck ? ($venue->average_check_amount ?? null) : null,
            'status' => $venue->status ?? 'draft',
            'review_note' => $venue->review_note ?? null,
            'submitted_at' => $venue->submitted_at ?? null,
            'published_at' => $venue->published_at ?? null,
            'deleted_at' => $venue->deleted_at ?? null,
            'created_at' => $venue->created_at ?? now(),
            'updated_at' => $venue->updated_at ?? now(),
        ]);
    }

    /**
     * @param  array<int, int>  $venueBrandMap
     */
    private function migrateBrandUsers(array $venueBrandMap): void
    {
        if (! Schema::hasTable('venue_users')) {
            return;
        }

        if (! Schema::hasTable('brand_users')) {
            Schema::create('brand_users', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('brand_id')->constrained('brands')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('role')->index();
                $table->timestamps();

                $table->unique(['brand_id', 'user_id']);
                $table->index(['user_id', 'role']);
            });
        }

        $seen = [];

        foreach (DB::table('venue_users')->orderBy('id')->get() as $membership) {
            $brandId = $venueBrandMap[(int) $membership->venue_id] ?? null;

            if ($brandId === null) {
                continue;
            }

            $key = "{$brandId}:{$membership->user_id}";

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;

            DB::table('brand_users')->insert([
                'brand_id' => $brandId,
                'user_id' => $membership->user_id,
                'role' => $membership->role,
                'created_at' => $membership->created_at ?? now(),
                'updated_at' => $membership->updated_at ?? now(),
            ]);
        }

        Schema::drop('venue_users');
    }

    /**
     * @param  array<int, int>  $venueBrandMap
     */
    private function migrateCustomers(array $venueBrandMap): void
    {
        if (! Schema::hasColumn('customers', 'venue_id')) {
            return;
        }

        Schema::table('customers', function (Blueprint $table): void {
            $table->foreignId('brand_id')->nullable()->after('id');
        });

        foreach (DB::table('customers')->orderBy('id')->get() as $customer) {
            $brandId = $venueBrandMap[(int) $customer->venue_id] ?? null;

            if ($brandId === null) {
                continue;
            }

            DB::table('customers')->where('id', $customer->id)->update(['brand_id' => $brandId]);
        }

        $this->mergeDuplicateCustomers();

        Schema::table('customers', function (Blueprint $table): void {
            $table->dropForeign(['venue_id']);
        });

        Schema::table('customers', function (Blueprint $table): void {
            $table->dropUnique(['venue_id', 'user_id']);
            $table->dropColumn('venue_id');
            $table->foreign('brand_id')->references('id')->on('brands')->cascadeOnDelete();
            $table->unique(['brand_id', 'user_id']);
            $table->index(['brand_id', 'stamps']);
        });
    }

    private function mergeDuplicateCustomers(): void
    {
        $duplicateGroups = DB::table('customers')
            ->select('brand_id', 'user_id', DB::raw('COUNT(*) as total'))
            ->whereNotNull('brand_id')
            ->groupBy('brand_id', 'user_id')
            ->having('total', '>', 1)
            ->get();

        foreach ($duplicateGroups as $group) {
            $rows = DB::table('customers')
                ->where('brand_id', $group->brand_id)
                ->where('user_id', $group->user_id)
                ->orderByDesc('stamps')
                ->orderBy('id')
                ->get();

            $keeper = $rows->first();

            if ($keeper === null) {
                continue;
            }

            $lifetimeStamps = (int) $rows->sum(fn ($row) => (int) ($row->lifetime_stamps ?? 0));

            DB::table('customers')->where('id', $keeper->id)->update([
                'stamps' => (int) $rows->max('stamps'),
                'lifetime_stamps' => $lifetimeStamps,
            ]);

            foreach ($rows->skip(1) as $duplicate) {
                $this->reassignCustomerChildren((int) $duplicate->id, (int) $keeper->id);
                DB::table('customers')->where('id', $duplicate->id)->delete();
            }
        }
    }

    private function reassignCustomerChildren(int $fromCustomerId, int $toCustomerId): void
    {
        foreach (['visits', 'customer_reward_cycles', 'reward_unlocks', 'customer_notes', 'stamp_events'] as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'customer_id')) {
                continue;
            }

            DB::table($table)->where('customer_id', $fromCustomerId)->update(['customer_id' => $toCustomerId]);
        }
    }

    /**
     * @param  array<int, int>  $venueBrandMap
     */
    private function migrateRewards(array $venueBrandMap): void
    {
        if (! Schema::hasColumn('rewards', 'venue_id')) {
            return;
        }

        Schema::table('rewards', function (Blueprint $table): void {
            $table->foreignId('brand_id')->nullable()->after('id');
        });

        foreach (DB::table('rewards')->orderBy('id')->get() as $reward) {
            $brandId = $venueBrandMap[(int) $reward->venue_id] ?? null;

            if ($brandId === null) {
                continue;
            }

            DB::table('rewards')->where('id', $reward->id)->update(['brand_id' => $brandId]);
        }

        Schema::table('rewards', function (Blueprint $table): void {
            $table->dropForeign(['venue_id']);
            $table->dropIndex(['venue_id', 'active', 'required_stamps']);
            $table->dropColumn('venue_id');
            $table->foreign('brand_id')->references('id')->on('brands')->cascadeOnDelete();
            $table->index(['brand_id', 'active', 'required_stamps']);
        });
    }

    /**
     * @param  array<int, int>  $venueBrandMap
     */
    private function migrateCampaigns(array $venueBrandMap): void
    {
        if (! Schema::hasTable('campaigns') || ! Schema::hasColumn('campaigns', 'venue_id')) {
            return;
        }

        Schema::table('campaigns', function (Blueprint $table): void {
            $table->foreignId('brand_id')->nullable()->after('id');
        });

        foreach (DB::table('campaigns')->orderBy('id')->get() as $campaign) {
            $brandId = $venueBrandMap[(int) $campaign->venue_id] ?? null;

            if ($brandId === null) {
                continue;
            }

            DB::table('campaigns')->where('id', $campaign->id)->update(['brand_id' => $brandId]);
        }

        Schema::table('campaigns', function (Blueprint $table): void {
            $table->dropForeign(['venue_id']);
            $table->dropIndex(['venue_id', 'status']);
            $table->dropColumn('venue_id');
            $table->foreign('brand_id')->references('id')->on('brands')->cascadeOnDelete();
            $table->index(['brand_id', 'status']);
        });
    }

    /**
     * @param  array<int, int>  $venueBrandMap
     */
    private function migrateVenueSetupFiles(array $venueBrandMap): void
    {
        if (! Schema::hasTable('venue_setup_files') || ! Schema::hasColumn('venue_setup_files', 'venue_id')) {
            return;
        }

        Schema::table('venue_setup_files', function (Blueprint $table): void {
            $table->foreignId('brand_id')->nullable()->after('id');
        });

        foreach (DB::table('venue_setup_files')->orderBy('id')->get() as $file) {
            $brandId = $venueBrandMap[(int) $file->venue_id] ?? null;

            if ($brandId === null) {
                continue;
            }

            DB::table('venue_setup_files')->where('id', $file->id)->update(['brand_id' => $brandId]);
        }

        Schema::table('venue_setup_files', function (Blueprint $table): void {
            $table->dropForeign(['venue_id']);
            $table->dropIndex(['venue_id', 'kind']);
            $table->dropColumn('venue_id');
            $table->foreign('brand_id')->references('id')->on('brands')->cascadeOnDelete();
            $table->index(['brand_id', 'kind']);
        });
    }

    /**
     * @param  array<int, int>  $venueBrandMap
     */
    private function migrateOwnerInvitations(array $venueBrandMap): void
    {
        if (! Schema::hasTable('owner_invitations') || ! Schema::hasColumn('owner_invitations', 'venue_id')) {
            return;
        }

        if (! Schema::hasColumn('owner_invitations', 'brand_id')) {
            Schema::table('owner_invitations', function (Blueprint $table): void {
                $table->foreignId('brand_id')->nullable()->after('id')->constrained('brands')->nullOnDelete();
            });
        }

        foreach (DB::table('owner_invitations')->orderBy('id')->get() as $invitation) {
            if (! filled($invitation->venue_id)) {
                continue;
            }

            $brandId = $venueBrandMap[(int) $invitation->venue_id] ?? null;

            if ($brandId === null) {
                continue;
            }

            DB::table('owner_invitations')->where('id', $invitation->id)->update(['brand_id' => $brandId]);
        }

        Schema::table('owner_invitations', function (Blueprint $table): void {
            $table->dropForeign(['venue_id']);
            $table->dropIndex(['venue_id', 'email']);
            $table->dropColumn('venue_id');
            $table->index(['brand_id', 'email']);
        });
    }

    private function stripLegacyVenueColumns(bool $hasParentVenue): void
    {
        $legacyColumns = collect([
            'category',
            'logo',
            'logo_thumb',
            'cover_image',
            'cover_image_thumb',
            'phone',
            'website',
            'average_check_amount',
            'status',
            'review_note',
            'submitted_at',
            'published_at',
        ])->filter(fn (string $column) => Schema::hasColumn('venues', $column))->values()->all();

        if ($hasParentVenue) {
            Schema::table('venues', function (Blueprint $table): void {
                $table->dropForeign(['parent_venue_id']);
                $table->dropIndex(['parent_venue_id', 'deleted_at']);
            });

            Schema::table('venues', function (Blueprint $table): void {
                $table->dropColumn('parent_venue_id');
            });
        }

        if ($legacyColumns !== []) {
            Schema::table('venues', function (Blueprint $table) use ($legacyColumns): void {
                $table->dropColumn($legacyColumns);
            });
        }
    }
};
