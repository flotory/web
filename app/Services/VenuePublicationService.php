<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\User;
use App\Models\Venue;
use App\Support\AuditLog;
use Illuminate\Validation\ValidationException;

class VenuePublicationService
{
    public function __construct(
        private VenueSetupFileService $setupFiles,
    ) {}

    /**
     * @return list<array{key: string, label: string, complete: bool, hint: string}>
     */
    public function checklistItems(Venue $venue): array
    {
        $brand = $this->brandFor($venue);
        $activeRewards = $brand->rewards()->where('active', true)->count();

        return [
            [
                'key' => 'address',
                'label' => 'Google address',
                'complete' => $this->hasMappedAddress($venue),
                'hint' => 'Add your venue address in settings.',
            ],
            [
                'key' => 'category',
                'label' => 'Venue category',
                'complete' => filled($brand->category),
                'hint' => 'Choose the category that best describes your business.',
            ],
            [
                'key' => 'setup_files',
                'label' => 'Files',
                'complete' => $this->setupFiles->hasAnyFiles($brand),
                'hint' => 'Upload your logo and a cover photo for the app listing.',
            ],
            [
                'key' => 'rewards',
                'label' => 'At least one active reward',
                'complete' => $activeRewards > 0,
                'hint' => 'Create one reward customers can work toward.',
            ],
        ];
    }

    /**
     * @return array{
     *     status: string,
     *     review_note: ?string,
     *     submitted_at: ?string,
     *     published_at: ?string,
     *     ready_to_submit: bool,
     *     can_submit: bool,
     *     is_public: bool,
     *     items: list<array{key: string, label: string, complete: bool, hint: string}>
     * }
     */
    public function snapshot(Venue $venue): array
    {
        $brand = $this->brandFor($venue);
        $items = $this->checklistItems($venue);
        $ready = collect($items)->every(fn (array $item): bool => $item['complete']);
        $status = $brand->status ?? Brand::STATUS_DRAFT;

        return [
            'status' => $status,
            'review_note' => $brand->review_note,
            'submitted_at' => $brand->submitted_at?->toIso8601String(),
            'published_at' => $brand->published_at?->toIso8601String(),
            'ready_to_submit' => $ready,
            'can_submit' => $ready && in_array($status, [Brand::STATUS_DRAFT, Brand::STATUS_REJECTED], true),
            'is_public' => $status === Brand::STATUS_PUBLISHED,
            'items' => $items,
        ];
    }

    public function submitForReview(Venue $venue, User $actor): Venue
    {
        $brand = $this->brandFor($venue);
        $snapshot = $this->snapshot($venue);

        if (! $snapshot['ready_to_submit']) {
            throw ValidationException::withMessages([
                'listing' => 'Complete all listing requirements before submitting for review.',
            ]);
        }

        if (! $snapshot['can_submit']) {
            throw ValidationException::withMessages([
                'listing' => 'This venue is already submitted or live.',
            ]);
        }

        $brand->forceFill([
            'status' => Brand::STATUS_PENDING_REVIEW,
            'review_note' => null,
            'submitted_at' => now(),
        ])->save();

        AuditLog::record('venue.submitted_for_review', $brand, $actor, 'success', [
            'brand_id' => $brand->id,
            'venue_id' => $venue->id,
            'status' => Brand::STATUS_PENDING_REVIEW,
        ]);

        return $venue->fresh(['brand']);
    }

    public function approve(Venue $venue, User $admin): Venue
    {
        $brand = $this->brandFor($venue);

        if ($brand->status !== Brand::STATUS_PENDING_REVIEW) {
            throw ValidationException::withMessages([
                'status' => 'Only venues awaiting review can be approved.',
            ]);
        }

        if (! $this->snapshot($venue)['ready_to_submit']) {
            throw ValidationException::withMessages([
                'listing' => 'Venue no longer meets listing requirements.',
            ]);
        }

        if (! filled($brand->logo)) {
            throw ValidationException::withMessages([
                'listing' => 'Apply a cropped logo from the owner setup files before approving.',
            ]);
        }

        $brand->forceFill([
            'status' => Brand::STATUS_PUBLISHED,
            'review_note' => null,
            'published_at' => now(),
        ])->save();

        AuditLog::record('venue.listing_approved', $brand, $admin, 'success', [
            'brand_id' => $brand->id,
            'venue_id' => $venue->id,
            'status' => Brand::STATUS_PUBLISHED,
        ]);

        return $venue->fresh(['brand']);
    }

    public function reject(Venue $venue, User $admin, ?string $note): Venue
    {
        $brand = $this->brandFor($venue);

        if ($brand->status !== Brand::STATUS_PENDING_REVIEW) {
            throw ValidationException::withMessages([
                'status' => 'Only venues awaiting review can be rejected.',
            ]);
        }

        $brand->forceFill([
            'status' => Brand::STATUS_REJECTED,
            'review_note' => $this->normalizeReviewNote($note),
        ])->save();

        AuditLog::record('venue.listing_rejected', $brand, $admin, 'success', [
            'brand_id' => $brand->id,
            'venue_id' => $venue->id,
            'status' => Brand::STATUS_REJECTED,
            'review_note' => $brand->review_note,
        ]);

        return $venue->fresh(['brand']);
    }

    public function unpublish(Venue $venue, User $admin, ?string $note = null): Venue
    {
        $brand = $this->brandFor($venue);

        if ($brand->status !== Brand::STATUS_PUBLISHED) {
            throw ValidationException::withMessages([
                'status' => 'Only published venues can be unpublished.',
            ]);
        }

        $brand->forceFill([
            'status' => Brand::STATUS_DRAFT,
            'review_note' => $this->normalizeReviewNote($note),
            'submitted_at' => null,
            'published_at' => null,
        ])->save();

        AuditLog::record('venue.listing_unpublished', $brand, $admin, 'success', [
            'brand_id' => $brand->id,
            'venue_id' => $venue->id,
            'status' => Brand::STATUS_DRAFT,
        ]);

        return $venue->fresh(['brand']);
    }

    public function isPublic(Venue $venue): bool
    {
        if ($venue->deleted_at !== null) {
            return false;
        }

        $brand = $venue->brand;

        if ($brand === null || $brand->deleted_at !== null) {
            return false;
        }

        if (($brand->status ?? Brand::STATUS_DRAFT) !== Brand::STATUS_PUBLISHED) {
            return false;
        }

        if ($venue->isBranch() && ! $venue->isLocationPublished()) {
            return false;
        }

        return $this->hasMappedAddress($venue);
    }

    public function approveBranch(Venue $branch, User $admin): Venue
    {
        if ($branch->is_primary) {
            throw ValidationException::withMessages([
                'venue' => 'Only branch locations use branch approval.',
            ]);
        }

        if ($branch->location_status !== Venue::LOCATION_STATUS_PENDING_REVIEW) {
            throw ValidationException::withMessages([
                'status' => 'Only branches awaiting review can be approved.',
            ]);
        }

        $brand = $this->brandFor($branch);

        if (($brand->status ?? Brand::STATUS_DRAFT) !== Brand::STATUS_PUBLISHED) {
            throw ValidationException::withMessages([
                'brand' => 'Publish the brand before approving branch locations.',
            ]);
        }

        if (! $this->hasMappedAddress($branch)) {
            throw ValidationException::withMessages([
                'address' => 'Branch needs a mapped address before going live.',
            ]);
        }

        $branch->forceFill([
            'location_status' => Venue::LOCATION_STATUS_PUBLISHED,
            'location_review_note' => null,
            'location_published_at' => now(),
        ])->save();

        AuditLog::record('venue.branch_approved', $branch, $admin, 'success', [
            'brand_id' => $branch->brand_id,
            'venue_id' => $branch->id,
        ]);

        return $branch->fresh();
    }

    public function rejectBranch(Venue $branch, User $admin, ?string $note): Venue
    {
        if ($branch->is_primary) {
            throw ValidationException::withMessages([
                'venue' => 'Only branch locations use branch approval.',
            ]);
        }

        if ($branch->location_status !== Venue::LOCATION_STATUS_PENDING_REVIEW) {
            throw ValidationException::withMessages([
                'status' => 'Only branches awaiting review can be rejected.',
            ]);
        }

        $branch->forceFill([
            'location_status' => Venue::LOCATION_STATUS_REJECTED,
            'location_review_note' => $this->normalizeReviewNote($note),
            'location_published_at' => null,
        ])->save();

        AuditLog::record('venue.branch_rejected', $branch, $admin, 'success', [
            'brand_id' => $branch->brand_id,
            'venue_id' => $branch->id,
            'location_review_note' => $branch->location_review_note,
        ]);

        return $branch->fresh();
    }

    public function assertPublic(Venue $venue): void
    {
        if ($this->isPublic($venue)) {
            return;
        }

        throw ValidationException::withMessages([
            'venue' => 'This venue is not available to customers yet.',
        ]);
    }

    public function assertSlugCanChange(Venue $venue, string $requestedSlug): void
    {
        $brand = $this->brandFor($venue);

        if (($brand->status ?? Brand::STATUS_DRAFT) !== Brand::STATUS_PUBLISHED) {
            return;
        }

        if ($requestedSlug === $venue->slug) {
            return;
        }

        throw ValidationException::withMessages([
            'slug' => 'The venue URL cannot be changed after the listing is published. Printed QR codes and customer links rely on this address.',
        ]);
    }

    private function brandFor(Venue $venue): Brand
    {
        $venue->loadMissing('brand');

        return $venue->brand;
    }

    private function hasMappedAddress(Venue $venue): bool
    {
        return filled($venue->address)
            && $venue->latitude !== null
            && $venue->longitude !== null;
    }

    private function normalizeReviewNote(?string $note): ?string
    {
        if ($note === null) {
            return null;
        }

        $trimmed = trim($note);

        return $trimmed === '' ? null : $trimmed;
    }
}
