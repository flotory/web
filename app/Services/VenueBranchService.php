<?php

namespace App\Services;

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

    public function assertBrand(Venue $venue): void
    {
        if ($venue->parent_venue_id !== null) {
            throw ValidationException::withMessages([
                'venue' => 'Branches can only be managed on the main venue.',
            ]);
        }
    }

    public function assertBranchOf(Venue $brand, Venue $branch): void
    {
        if ((int) $branch->parent_venue_id !== (int) $brand->id) {
            abort(404);
        }
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Venue>
     */
    public function listForBrand(Venue $brand)
    {
        $this->assertBrand($brand);

        return $brand->branches()
            ->orderBy('name')
            ->get();
    }

    public function create(Venue $brand, array $payload): Venue
    {
        $this->assertBrand($brand);

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
            'parent_venue_id' => $brand->id,
            'name' => trim((string) $payload['name']),
            'slug' => $this->uniqueSlug((string) $payload['name']),
            'category' => $brand->category,
            'address' => $location['address'],
            'latitude' => $location['latitude'],
            'longitude' => $location['longitude'],
            'google_place_id' => $location['google_place_id'],
            'status' => $brand->status,
            'submitted_at' => $brand->submitted_at,
            'published_at' => $brand->published_at,
        ]);

        $this->timezones->applyToVenue($branch, $location['latitude'], $location['longitude']);

        AuditLog::record('venue.branch_created', $branch, null, 'success', [
            'venue_id' => $brand->id,
            'branch_id' => $branch->id,
        ]);

        return $branch->fresh();
    }

    public function update(Venue $brand, Venue $branch, array $payload): Venue
    {
        $this->assertBrand($brand);
        $this->assertBranchOf($brand, $branch);

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

    public function delete(Venue $brand, Venue $branch): void
    {
        $this->assertBrand($brand);
        $this->assertBranchOf($brand, $branch);

        $branch->delete();

        AuditLog::record('venue.branch_deleted', $branch, null, 'success', [
            'venue_id' => $brand->id,
            'branch_id' => $branch->id,
        ]);
    }

    public function syncStatusFromBrand(Venue $brand): void
    {
        if ($brand->parent_venue_id !== null) {
            return;
        }

        $brand->branches()->update([
            'status' => $brand->status,
            'submitted_at' => $brand->submitted_at,
            'published_at' => $brand->published_at,
            'review_note' => $brand->review_note,
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
