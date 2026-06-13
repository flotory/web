<?php

namespace App\Services;

use App\Models\User;
use App\Models\Venue;
use App\Support\AuditLog;
use Illuminate\Validation\ValidationException;

class VenuePublicationService
{
    public function __construct(
        private VenueSetupFileService $setupFiles,
        private VenueBranchService $branches,
    ) {}

    /**
     * @return list<array{key: string, label: string, complete: bool, hint: string}>
     */
    public function checklistItems(Venue $venue): array
    {
        $activeRewards = $venue->rewards()->where('active', true)->count();

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
                'complete' => filled($venue->category),
                'hint' => 'Choose cafe, restaurant, bar, or bakery.',
            ],
            [
                'key' => 'setup_files',
                'label' => 'Setup files',
                'complete' => $this->setupFiles->hasAnyFiles($venue),
                'hint' => 'Upload your logo, photos, menus, or any files that help us set up your venue.',
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
        $items = $this->checklistItems($venue);
        $ready = collect($items)->every(fn (array $item): bool => $item['complete']);
        $status = $venue->status ?? Venue::STATUS_DRAFT;

        return [
            'status' => $status,
            'review_note' => $venue->review_note,
            'submitted_at' => $venue->submitted_at?->toIso8601String(),
            'published_at' => $venue->published_at?->toIso8601String(),
            'ready_to_submit' => $ready,
            'can_submit' => $ready && in_array($status, [Venue::STATUS_DRAFT, Venue::STATUS_REJECTED], true),
            'is_public' => $status === Venue::STATUS_PUBLISHED,
            'items' => $items,
        ];
    }

    public function submitForReview(Venue $venue, User $actor): Venue
    {
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

        $venue->forceFill([
            'status' => Venue::STATUS_PENDING_REVIEW,
            'review_note' => null,
            'submitted_at' => now(),
        ])->save();

        AuditLog::record('venue.submitted_for_review', $venue, $actor, 'success', [
            'venue_id' => $venue->id,
            'status' => Venue::STATUS_PENDING_REVIEW,
        ]);

        return $venue->fresh();
    }

    public function approve(Venue $venue, User $admin): Venue
    {
        if ($venue->status !== Venue::STATUS_PENDING_REVIEW) {
            throw ValidationException::withMessages([
                'status' => 'Only venues awaiting review can be approved.',
            ]);
        }

        if (! $this->snapshot($venue)['ready_to_submit']) {
            throw ValidationException::withMessages([
                'listing' => 'Venue no longer meets listing requirements.',
            ]);
        }

        if (! filled($venue->logo)) {
            throw ValidationException::withMessages([
                'listing' => 'Apply a cropped logo from the owner setup files before approving.',
            ]);
        }

        $venue->forceFill([
            'status' => Venue::STATUS_PUBLISHED,
            'review_note' => null,
            'published_at' => now(),
        ])->save();

        AuditLog::record('venue.listing_approved', $venue, $admin, 'success', [
            'venue_id' => $venue->id,
            'status' => Venue::STATUS_PUBLISHED,
        ]);

        $this->branches->syncStatusFromBrand($venue);

        return $venue->fresh();
    }

    public function reject(Venue $venue, User $admin, ?string $note): Venue
    {
        if ($venue->status !== Venue::STATUS_PENDING_REVIEW) {
            throw ValidationException::withMessages([
                'status' => 'Only venues awaiting review can be rejected.',
            ]);
        }

        $venue->forceFill([
            'status' => Venue::STATUS_REJECTED,
            'review_note' => $this->normalizeReviewNote($note),
        ])->save();

        AuditLog::record('venue.listing_rejected', $venue, $admin, 'success', [
            'venue_id' => $venue->id,
            'status' => Venue::STATUS_REJECTED,
            'review_note' => $venue->review_note,
        ]);

        return $venue->fresh();
    }

    public function unpublish(Venue $venue, User $admin, ?string $note = null): Venue
    {
        if ($venue->status !== Venue::STATUS_PUBLISHED) {
            throw ValidationException::withMessages([
                'status' => 'Only published venues can be unpublished.',
            ]);
        }

        $venue->forceFill([
            'status' => Venue::STATUS_DRAFT,
            'review_note' => $this->normalizeReviewNote($note),
            'submitted_at' => null,
            'published_at' => null,
        ])->save();

        AuditLog::record('venue.listing_unpublished', $venue, $admin, 'success', [
            'venue_id' => $venue->id,
            'status' => Venue::STATUS_DRAFT,
        ]);

        $this->branches->syncStatusFromBrand($venue);

        return $venue->fresh();
    }

    public function isPublic(Venue $venue): bool
    {
        if ($venue->deleted_at !== null) {
            return false;
        }

        if ($venue->isBranch()) {
            $parent = $venue->parentVenue;

            if ($parent === null || ! $this->isBrandPublished($parent)) {
                return false;
            }

            return $this->hasMappedAddress($venue);
        }

        return $this->isBrandPublished($venue);
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
        if (($venue->status ?? Venue::STATUS_DRAFT) !== Venue::STATUS_PUBLISHED) {
            return;
        }

        if ($requestedSlug === $venue->slug) {
            return;
        }

        throw ValidationException::withMessages([
            'slug' => 'The venue URL cannot be changed after the listing is published. Printed QR codes and customer links rely on this address.',
        ]);
    }

    private function hasMappedAddress(Venue $venue): bool
    {
        return filled($venue->address)
            && $venue->latitude !== null
            && $venue->longitude !== null;
    }

    private function isBrandPublished(Venue $venue): bool
    {
        return ($venue->status ?? Venue::STATUS_DRAFT) === Venue::STATUS_PUBLISHED;
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
