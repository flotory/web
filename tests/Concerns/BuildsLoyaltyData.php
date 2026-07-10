<?php

namespace Tests\Concerns;

use App\Models\Brand;
use App\Models\BrandUser;
use App\Models\Campaign;
use App\Models\Customer;
use App\Models\CustomerRewardCycle;
use App\Models\NfcTag;
use App\Models\Reward;
use App\Support\CampaignTemplates;
use App\Models\RewardUnlock;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueSetupFile;
use App\Models\Visit;
use App\Services\OwnerMediaPathService;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

trait BuildsLoyaltyData
{
    protected function createUser(array $attributes = []): User
    {
        return User::query()->create(array_merge([
            'name' => 'Test User',
            'email' => 'user-'.Str::lower(Str::random(8)).'@example.com',
            'password' => 'password',
            'is_admin' => false,
        ], $attributes));
    }

    protected function createBrand(array $attributes = []): Brand
    {
        $name = $attributes['name'] ?? 'Test Brand';

        return Brand::query()->create(array_merge([
            'name' => $name,
            'slug' => $attributes['slug'] ?? ('brand-'.Str::lower(Str::random(8))),
            'category' => 'cafe',
            'status' => Brand::STATUS_DRAFT,
        ], $attributes));
    }

    protected function createVenueForBrand(Brand $brand, array $attributes = []): Venue
    {
        $name = $attributes['name'] ?? $brand->name;
        $isPrimary = (bool) ($attributes['is_primary'] ?? false);

        $defaults = [
            'brand_id' => $brand->id,
            'is_primary' => $isPrimary,
            'name' => $name,
            'slug' => 'venue-'.Str::lower(Str::random(8)),
        ];

        if (! $isPrimary) {
            $defaults['location_status'] = $attributes['location_status'] ?? Venue::LOCATION_STATUS_PUBLISHED;
        }

        return Venue::query()->create(array_merge($defaults, $attributes));
    }

    protected function createVenue(array $attributes = []): Venue
    {
        $name = $attributes['name'] ?? 'Test Venue';
        $slug = $attributes['slug'] ?? ('venue-'.Str::lower(Str::random(8)));
        $brandAttributes = array_intersect_key($attributes, array_flip([
            'name', 'slug', 'category', 'status', 'published_at', 'logo', 'logo_thumb',
            'cover_image', 'phone', 'website', 'average_check_amount', 'review_note', 'submitted_at',
        ]));
        $venueAttributes = array_intersect_key($attributes, array_flip([
            'name', 'slug', 'address', 'latitude', 'longitude', 'is_primary', 'timezone', 'google_place_id',
            'location_status', 'location_submitted_at', 'location_published_at', 'location_review_note',
        ]));

        unset($brandAttributes['name'], $brandAttributes['slug']);
        if (! isset($brandAttributes['status'])) {
            $brandAttributes['status'] = Brand::STATUS_DRAFT;
        }

        $brand = $this->createBrand(array_merge([
            'name' => $name,
            'slug' => $slug,
            'category' => 'cafe',
        ], $brandAttributes));

        return $this->createVenueForBrand($brand, array_merge([
            'is_primary' => true,
            'name' => $name,
            'slug' => $slug,
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ], $venueAttributes));
    }

    protected function createPublishedVenue(array $attributes = []): Venue
    {
        $name = $attributes['name'] ?? 'Test Venue';
        $slug = $attributes['slug'] ?? ('venue-'.Str::lower(Str::random(8)));
        unset($attributes['name'], $attributes['slug']);

        $brand = $this->createBrand(array_merge([
            'name' => $name,
            'slug' => $slug,
            'status' => Brand::STATUS_PUBLISHED,
            'published_at' => now(),
        ], array_intersect_key($attributes, array_flip([
            'category', 'status', 'published_at', 'logo', 'logo_thumb', 'cover_image', 'phone', 'website', 'average_check_amount',
        ]))));

        return $this->createVenueForBrand($brand, array_merge([
            'is_primary' => true,
            'name' => $name,
            'slug' => $slug,
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ], $attributes));
    }

    protected function attachMember(Venue $venue, User $user, string $role = 'owner'): BrandUser
    {
        $venue->loadMissing('brand');

        return BrandUser::query()->create([
            'brand_id' => $venue->brand_id,
            'user_id' => $user->id,
            'role' => $role,
        ]);
    }

    protected function createCustomer(Venue $venue, User $user, array $attributes = []): Customer
    {
        $venue->loadMissing('brand');

        return Customer::query()->create(array_merge([
            'brand_id' => $venue->brand_id,
            'user_id' => $user->id,
            'stamps' => 0,
        ], $attributes));
    }

    protected function createReward(Venue $venue, array $attributes = []): Reward
    {
        $venue->loadMissing('brand');

        return Reward::query()->create(array_merge([
            'brand_id' => $venue->brand_id,
            'title' => 'Free Coffee',
            'description' => 'A complimentary drink.',
            'required_stamps' => 5,
            'sort_order' => 5,
            'reward_type' => 'milestone',
            'active' => true,
        ], $attributes));
    }

    protected function createRewardCycle(Customer $customer, array $attributes = []): CustomerRewardCycle
    {
        return CustomerRewardCycle::query()->create(array_merge([
            'customer_id' => $customer->id,
            'cycle_number' => 1,
            'completed_at' => null,
        ], $attributes));
    }

    protected function createRewardUnlock(Customer $customer, Reward $reward, array $attributes = []): RewardUnlock
    {
        return RewardUnlock::query()->create(array_merge([
            'customer_id' => $customer->id,
            'reward_id' => $reward->id,
            'cycle_number' => 1,
            'unlocked_at' => now(),
            'claimed_at' => null,
            'claimed_by' => null,
        ], $attributes));
    }

    protected function ensurePublicUploadFile(string $path, string $contents = 'test'): void
    {
        if (! str_starts_with($path, '/uploads/')) {
            return;
        }

        $absolute = public_path(ltrim($path, '/'));
        File::ensureDirectoryExists(dirname($absolute));

        if (! is_file($absolute)) {
            File::put($absolute, $contents);
        }
    }

    protected function ownerMediaPath(User $owner, Brand $brand, string $kind, string $filename = ''): string
    {
        $paths = app(OwnerMediaPathService::class);
        $directory = match ($kind) {
            'drafts' => $paths->draftsDirectory($owner->id),
            'logos' => $paths->logosDirectory($owner->id, $brand->id),
            'covers' => $paths->coversDirectory($owner->id, $brand->id),
            'rewards' => $paths->rewardsDirectory($owner->id, $brand->id),
            'setup' => $paths->setupDirectory($owner->id, $brand->id),
            default => throw new \InvalidArgumentException("Unknown owner media kind: {$kind}"),
        };

        return $filename === '' ? '/'.$directory : '/'.$directory.'/'.ltrim($filename, '/');
    }

    protected function createVenueSetupFile(Venue $venue, ?User $uploader = null, array $attributes = []): VenueSetupFile
    {
        $uploader ??= $this->createUser();
        $venue->loadMissing('brand');

        $file = VenueSetupFile::query()->create(array_merge([
            'brand_id' => $venue->brand_id,
            'uploaded_by_user_id' => $uploader->id,
            'kind' => VenueSetupFile::KIND_FILE,
            'original_name' => 'owner-setup.png',
            'path' => $this->ownerMediaPath($uploader, $venue->brand, 'setup', 'owner-setup.png'),
            'mime_type' => 'image/png',
            'byte_size' => 1024,
        ], $attributes));

        $this->ensurePublicUploadFile($file->path);

        return $file;
    }

    protected function createListingReadyVenue(array $attributes = [], ?User $owner = null): Venue
    {
        $owner ??= $this->createUser();

        $venue = $this->createVenueForBrand($this->createBrand(array_merge([
            'status' => $attributes['status'] ?? Brand::STATUS_DRAFT,
            'category' => 'cafe',
            'review_note' => $attributes['review_note'] ?? null,
        ], array_intersect_key($attributes, array_flip(['name', 'slug', 'category', 'status', 'review_note'])))), array_merge([
            'is_primary' => true,
            'address' => '12 Market Street, Torun',
            'latitude' => 53.0101,
            'longitude' => 18.6101,
        ], array_intersect_key($attributes, array_flip(['name', 'slug', 'address', 'latitude', 'longitude']))));

        $this->attachMember($venue, $owner, 'owner');

        $logoPath = $attributes['logo'] ?? $this->ownerMediaPath($owner, $venue->brand, 'logos', 'demo.png');
        $venue->brand->forceFill(['logo' => $logoPath])->save();
        $this->ensurePublicUploadFile($logoPath);

        $this->createReward($venue);
        $this->createVenueSetupFile($venue, $owner);

        return $venue->fresh(['brand']);
    }

    protected function createVisit(Customer $customer, User $staff, array $attributes = []): Visit
    {
        $createdAt = $attributes['created_at'] ?? null;
        unset($attributes['created_at']);

        $customer->loadMissing('brand');
        $venueId = $attributes['venue_id']
            ?? $customer->brand->venues()->where('is_primary', true)->value('id')
            ?? $customer->brand->venues()->value('id');

        $visit = Visit::query()->create(array_merge([
            'customer_id' => $customer->id,
            'venue_id' => $venueId,
            'created_by' => $staff->id,
        ], $attributes));

        if ($createdAt !== null) {
            $visit->forceFill(['created_at' => $createdAt])->saveQuietly();
        }

        return $visit->refresh();
    }

    protected function createNfcTag(Venue $venue, array $attributes = []): NfcTag
    {
        return NfcTag::query()->create(array_merge([
            'venue_id' => $venue->id,
            'token' => NfcTag::generateUniqueToken(),
            'label' => 'Counter stand',
            'active' => true,
        ], $attributes));
    }

    /**
     * @param  array<string, mixed>  $config
     */
    protected function seedActiveCampaign(
        Venue $venue,
        User $owner,
        string $templateId,
        array $config,
        ?string $name = null,
    ): Campaign {
        $venue->loadMissing('brand');
        $defaults = CampaignTemplates::defaults($templateId);
        $merged = array_merge($defaults['config'], $config);

        return Campaign::query()->create([
            'brand_id' => $venue->brand_id,
            'template_id' => $templateId,
            'name' => $name ?? $defaults['name'],
            'status' => Campaign::STATUS_ACTIVE,
            'config' => $merged,
            'push_enabled' => true,
            'activated_at' => now(),
            'created_by' => $owner->id,
            'audience_count' => 0,
        ]);
    }
}
