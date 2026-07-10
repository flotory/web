<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\BrandUser;
use App\Models\OwnerOnboardingDraft;
use App\Models\OwnerOnboardingDraftFile;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueSetupFile;
use App\Support\VenuePresenter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OwnerOnboardingDraftService
{
    public const PURPOSE_FIRST_VENUE = 'first_venue';

    public const PURPOSE_ADDITIONAL_VENUE = 'additional_venue';

    private const MAX_BYTES = 10 * 1024 * 1024;

    public function __construct(
        private VenueAddressUpdateService $venueAddresses,
        private VenuePublicationService $publication,
        private VenueTimezoneService $timezones,
        private OwnerInvitationService $ownerInvitations,
        private VenueSetupFileService $setupFiles,
        private MediaStorageService $media,
        private OwnerMediaPathService $paths,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function defaultPayload(?string $businessName = null): array
    {
        return [
            'name' => $businessName ?? '',
            'category' => 'cafe',
            'address' => '',
            'latitude' => null,
            'longitude' => null,
            'google_place_id' => null,
            'phone' => '',
            'website' => '',
            'reward' => [
                'title' => 'Free coffee',
                'description' => 'Enjoy a complimentary coffee after collecting enough stamps.',
                'required_stamps' => 10,
            ],
        ];
    }

    public function findForUser(User $user): ?OwnerOnboardingDraft
    {
        return OwnerOnboardingDraft::query()
            ->where('user_id', $user->id)
            ->first();
    }

    public function getOrCreate(User $user, ?string $businessName = null, string $purpose = self::PURPOSE_FIRST_VENUE): OwnerOnboardingDraft
    {
        $existing = $this->findForUser($user);

        if ($existing instanceof OwnerOnboardingDraft) {
            if ($existing->purpose !== $purpose) {
                $this->purgeDraft($user);
            } else {
                return $existing;
            }
        }

        return OwnerOnboardingDraft::query()->create([
            'user_id' => $user->id,
            'purpose' => $purpose,
            'payload' => $this->defaultPayload($businessName),
        ]);
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    public function restartAdditionalVenue(User $user, array $changes): array
    {
        $this->purgeDraft($user);

        $payload = array_replace_recursive($this->defaultPayload(), $changes);

        OwnerOnboardingDraft::query()->create([
            'user_id' => $user->id,
            'purpose' => self::PURPOSE_ADDITIONAL_VENUE,
            'payload' => $payload,
        ]);

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    public function updateAdditionalVenue(User $user, array $changes): array
    {
        $draft = $this->getOrCreate($user, null, self::PURPOSE_ADDITIONAL_VENUE);
        $payload = array_replace_recursive($draft->payload ?? $this->defaultPayload(), $changes);

        if (array_key_exists('reward', $changes) && is_array($changes['reward'])) {
            $payload['reward'] = array_replace(
                $draft->payload['reward'] ?? $this->defaultPayload()['reward'],
                $changes['reward'],
            );
        }

        $draft->forceFill([
            'purpose' => self::PURPOSE_ADDITIONAL_VENUE,
            'payload' => $payload,
        ])->save();

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    public function update(User $user, array $changes, ?string $businessName = null, ?string $purpose = null, bool $restart = false): array
    {
        if ($purpose === self::PURPOSE_ADDITIONAL_VENUE) {
            unset($changes['purpose'], $changes['restart']);

            if ($restart) {
                return $this->restartAdditionalVenue($user, $changes);
            }

            return $this->updateAdditionalVenue($user, $changes);
        }

        $draft = $this->getOrCreate($user, $businessName, self::PURPOSE_FIRST_VENUE);
        $payload = array_replace_recursive($draft->payload ?? [], $changes);

        if (array_key_exists('reward', $changes) && is_array($changes['reward'])) {
            $payload['reward'] = array_replace(
                $draft->payload['reward'] ?? $this->defaultPayload()['reward'],
                $changes['reward'],
            );
        }

        $draft->forceFill(['payload' => $payload])->save();

        return $payload;
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
    public function listingSnapshot(OwnerOnboardingDraft $draft): array
    {
        $payload = $draft->payload ?? [];
        $reward = is_array($payload['reward'] ?? null) ? $payload['reward'] : [];
        $fileCount = OwnerOnboardingDraftFile::query()->where('user_id', $draft->user_id)->count();

        $items = [
            [
                'key' => 'address',
                'label' => 'Google address',
                'complete' => filled($payload['address'] ?? null)
                    && ($payload['latitude'] ?? null) !== null
                    && ($payload['longitude'] ?? null) !== null,
                'hint' => 'Add your venue address in settings.',
            ],
            [
                'key' => 'category',
                'label' => 'Venue category',
                'complete' => filled($payload['category'] ?? null),
                'hint' => 'Choose the category that best describes your business.',
            ],
            [
                'key' => 'setup_files',
                'label' => 'Files',
                'complete' => $fileCount > 0,
                'hint' => 'Upload your logo and a cover photo for the app listing.',
            ],
            [
                'key' => 'rewards',
                'label' => 'At least one active reward',
                'complete' => filled($reward['title'] ?? null),
                'hint' => 'Create one reward customers can work toward.',
            ],
        ];

        $ready = filled($payload['name'] ?? null)
            && collect($items)->every(fn (array $item): bool => $item['complete']);

        return [
            'status' => Brand::STATUS_DRAFT,
            'review_note' => null,
            'submitted_at' => null,
            'published_at' => null,
            'ready_to_submit' => $ready,
            'can_submit' => $ready,
            'is_public' => false,
            'items' => $items,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listFiles(User $user): array
    {
        return OwnerOnboardingDraftFile::query()
            ->where('user_id', $user->id)
            ->latest('id')
            ->get()
            ->map(fn (OwnerOnboardingDraftFile $file): array => $this->presentFile($file))
            ->all();
    }

    public function storeFile(User $user, UploadedFile $file): OwnerOnboardingDraftFile
    {
        $draft = $this->findForUser($user);

        if (! $draft instanceof OwnerOnboardingDraft) {
            throw ValidationException::withMessages([
                'draft' => 'Start venue setup before uploading files.',
            ]);
        }

        $allowed = $this->setupFiles->allowedMimeTypes();
        $mime = $file->getMimeType() ?: $file->getClientMimeType() ?: 'application/octet-stream';

        if (! in_array($mime, $allowed, true)) {
            throw ValidationException::withMessages([
                'file' => 'This file type is not allowed. Use images, PDF, Word, or plain text.',
            ]);
        }

        if ($file->getSize() > self::MAX_BYTES) {
            throw ValidationException::withMessages([
                'file' => 'File is too large (max 10 MB).',
            ]);
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'bin');
        $filename = 'draft-'.Str::lower(Str::random(12)).'.'.$extension;
        $storageDirectory = $this->paths->draftsDirectory($user->id);

        $originalName = $file->getClientOriginalName();
        $byteSize = $file->getSize() ?: 0;
        $storedPath = $this->media->putUploadedFile($file, $storageDirectory, $filename);

        return OwnerOnboardingDraftFile::query()->create([
            'user_id' => $user->id,
            'original_name' => $originalName,
            'path' => $storedPath,
            'mime_type' => $mime,
            'byte_size' => $byteSize,
        ]);
    }

    public function deleteFile(User $user, OwnerOnboardingDraftFile $file): void
    {
        if ($file->user_id !== $user->id) {
            abort(404);
        }

        $this->media->delete($file->path);

        $file->delete();
    }

    public function submit(User $user): Venue
    {
        $draft = $this->findForUser($user);

        if (! $draft instanceof OwnerOnboardingDraft) {
            throw ValidationException::withMessages([
                'draft' => 'Complete venue setup before submitting for review.',
            ]);
        }

        $snapshot = $this->listingSnapshot($draft);

        if (! $snapshot['can_submit']) {
            throw ValidationException::withMessages([
                'listing' => 'Complete all listing requirements before submitting for review.',
            ]);
        }

        $payload = $draft->payload ?? [];

        return DB::transaction(function () use ($user, $draft, $payload): Venue {
            $location = $this->venueAddresses->normalizedLocation([
                'address' => $payload['address'] ?? null,
                'latitude' => $payload['latitude'] ?? null,
                'longitude' => $payload['longitude'] ?? null,
                'google_place_id' => $payload['google_place_id'] ?? null,
            ]);

            $this->venueAddresses->assertCanApply(new Venue, $location, enforceDailyLimit: false);

            $name = trim((string) ($payload['name'] ?? ''));
            $slug = Str::slug($name).'-'.Str::lower(Str::random(5));

            $brand = Brand::create([
                'name' => $name,
                'slug' => $slug,
                'category' => (string) ($payload['category'] ?? 'cafe') ?: 'cafe',
                'phone' => filled($payload['phone'] ?? null) ? (string) $payload['phone'] : null,
                'website' => filled($payload['website'] ?? null) ? (string) $payload['website'] : null,
                'status' => Brand::STATUS_DRAFT,
            ]);

            $venue = Venue::create([
                'brand_id' => $brand->id,
                'is_primary' => true,
                'name' => $name,
                'slug' => $slug,
                'address' => $location['address'],
                'latitude' => $location['latitude'],
                'longitude' => $location['longitude'],
                'google_place_id' => $location['google_place_id'],
            ]);

            BrandUser::create([
                'brand_id' => $brand->id,
                'user_id' => $user->id,
                'role' => 'owner',
            ]);

            $this->timezones->applyToVenue($venue, $location['latitude'], $location['longitude']);
            $this->migrateDraftFiles($user, $brand, $venue);
            $this->createRewardFromDraft($venue, $payload['reward'] ?? []);
            $this->publication->submitForReview($venue->fresh(['brand']), $user);

            if ($draft->purpose === self::PURPOSE_FIRST_VENUE) {
                $this->ownerInvitations->attachBrandToAcceptedInvitation($user, $brand);
            }

            $user->forceFill([
                'active_venue_id' => $venue->id,
            ])->save();

            $this->purgeDraft($user);

            VenuePresenter::apply($venue->fresh(['brand']));

            return $venue;
        });
    }

    public function purgeDraft(User $user): void
    {
        $files = OwnerOnboardingDraftFile::query()->where('user_id', $user->id)->get();

        foreach ($files as $file) {
            $this->deleteFile($user, $file);
        }

        OwnerOnboardingDraft::query()->where('user_id', $user->id)->delete();
    }

    /**
     * @return array<string, mixed>
     */
    public function presentFile(OwnerOnboardingDraftFile $file): array
    {
        return [
            'id' => $file->id,
            'original_name' => $file->original_name,
            'path' => VenuePresenter::resolvePublicUploadPath($file->path) ?? $file->path,
            'mime_type' => $file->mime_type,
            'byte_size' => $file->byte_size,
            'is_image' => $file->isImage(),
        ];
    }

    /**
     * @param  array<string, mixed>  $reward
     */
    private function createRewardFromDraft(Venue $venue, array $reward): void
    {
        $title = trim((string) ($reward['title'] ?? ''));

        if ($title === '') {
            throw ValidationException::withMessages([
                'reward.title' => 'Reward title is required.',
            ]);
        }

        $requiredStamps = (int) ($reward['required_stamps'] ?? 10);

        $venue->rewards()->create([
            'title' => $title,
            'description' => filled($reward['description'] ?? null) ? (string) $reward['description'] : null,
            'required_stamps' => max(1, min(100, $requiredStamps)),
            'reward_type' => 'milestone',
            'sort_order' => max(1, min(100, $requiredStamps)),
            'active' => true,
        ]);
    }

    private function migrateDraftFiles(User $user, Brand $brand, Venue $venue): void
    {
        $files = OwnerOnboardingDraftFile::query()
            ->where('user_id', $user->id)
            ->orderBy('id')
            ->get();

        if ($files->isEmpty()) {
            return;
        }

        $storageDirectory = $this->paths->setupDirectory($user->id, $brand->id);

        foreach ($files as $draftFile) {
            $extension = pathinfo($draftFile->path, PATHINFO_EXTENSION) ?: 'bin';
            $filename = Str::slug($venue->slug).'-file-'.Str::lower(Str::random(12)).'.'.$extension;
            $storedPath = $this->media->copy($draftFile->path, $storageDirectory, $filename);

            if ($storedPath === null) {
                continue;
            }

            VenueSetupFile::query()->create([
                'brand_id' => $brand->id,
                'uploaded_by_user_id' => $user->id,
                'kind' => VenueSetupFile::KIND_FILE,
                'original_name' => $draftFile->original_name,
                'path' => $storedPath,
                'mime_type' => $draftFile->mime_type,
                'byte_size' => $draftFile->byte_size,
            ]);
        }
    }
}
