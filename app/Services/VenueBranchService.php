<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\Venue;
use App\Support\AuditLog;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class VenueBranchService
{
    public function __construct(
        private VenueAddressUpdateService $venueAddresses,
        private VenueTimezoneService $timezones,
    ) {}

    public function resolveBrand(Venue $venue): Brand
    {
        return $venue->brand()->firstOrFail();
    }

    public function assertBranch(Venue $branch): void
    {
        if ($branch->is_primary) {
            throw ValidationException::withMessages([
                'venue' => 'The main location cannot be managed as a branch.',
            ]);
        }
    }

    public function assertSameBrand(Venue $anchor, Venue $branch): void
    {
        if ((int) $branch->brand_id !== (int) $anchor->brand_id) {
            abort(404);
        }
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Venue>
     */
    public function listForBrand(Venue $anchor)
    {
        return Venue::query()
            ->where('brand_id', $anchor->brand_id)
            ->where('is_primary', false)
            ->orderBy('name')
            ->get();
    }

    public function create(Venue $anchor, array $payload): Venue
    {
        $brand = $this->resolveBrand($anchor);

        $location = $this->venueAddresses->normalizedLocation([
            'address' => $payload['address'] ?? null,
            'latitude' => $payload['latitude'] ?? null,
            'longitude' => $payload['longitude'] ?? null,
            'google_place_id' => $payload['google_place_id'] ?? null,
        ]);

        if (! filled($location['address']) || $location['latitude'] === null || $location['longitude'] === null) {
            throw ValidationException::withMessages([
                'address' => 'Select a branch address from the Google suggestions list.',
            ]);
        }

        $branch = Venue::query()->create([
            'brand_id' => $brand->id,
            'is_primary' => false,
            'location_status' => Venue::LOCATION_STATUS_PENDING_REVIEW,
            'location_submitted_at' => now(),
            'name' => trim((string) $payload['name']),
            'slug' => $this->uniqueSlug((string) $payload['name']),
            'address' => $location['address'],
            'latitude' => $location['latitude'],
            'longitude' => $location['longitude'],
            'google_place_id' => $location['google_place_id'],
        ]);

        $this->timezones->applyToVenue($branch, $location['latitude'], $location['longitude']);

        AuditLog::record('venue.branch_created', $branch, null, 'success', [
            'brand_id' => $brand->id,
            'venue_id' => $branch->id,
        ]);

        return $branch->fresh();
    }

    public function update(Venue $anchor, Venue $branch, array $payload): Venue
    {
        $this->assertBranch($branch);
        $this->assertSameBrand($anchor, $branch);

        $location = $this->venueAddresses->normalizedLocation([
            'address' => $payload['address'] ?? $branch->address,
            'latitude' => $payload['latitude'] ?? $branch->latitude,
            'longitude' => $payload['longitude'] ?? $branch->longitude,
            'google_place_id' => $payload['google_place_id'] ?? $branch->google_place_id,
        ]);

        $this->venueAddresses->assertCanApply($branch, $location, enforceDailyLimit: true);
        $this->venueAddresses->recordChangeIfNeeded($branch, $payload['actor'], $location);

        $branch->update([
            'name' => trim((string) ($payload['name'] ?? $branch->name)),
            'address' => $location['address'],
            'latitude' => $location['latitude'],
            'longitude' => $location['longitude'],
            'google_place_id' => $location['google_place_id'],
        ]);

        $branch = $branch->fresh();
        $this->timezones->applyToVenue($branch, $location['latitude'], $location['longitude']);

        return $branch;
    }

    public function delete(Venue $anchor, Venue $branch): void
    {
        $this->assertBranch($branch);
        $this->assertSameBrand($anchor, $branch);

        $branch->delete();

        AuditLog::record('venue.branch_deleted', $branch, null, 'success', [
            'brand_id' => $anchor->brand_id,
            'venue_id' => $branch->id,
        ]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'branch';
        }

        $slug = $base;
        $suffix = 2;

        while (Venue::withTrashed()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix += 1;
        }

        return $slug;
    }
}
