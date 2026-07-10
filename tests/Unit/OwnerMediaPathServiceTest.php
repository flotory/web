<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\OwnerMediaPathService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class OwnerMediaPathServiceTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_builds_owner_scoped_directories(): void
    {
        $paths = app(OwnerMediaPathService::class);

        $this->assertSame('uploads/owners/7/drafts', $paths->draftsDirectory(7));
        $this->assertSame('uploads/owners/7/brands/3/logos', $paths->logosDirectory(7, 3));
        $this->assertSame('uploads/owners/7/brands/3/covers', $paths->coversDirectory(7, 3));
        $this->assertSame('uploads/owners/7/brands/3/rewards', $paths->rewardsDirectory(7, 3));
        $this->assertSame('uploads/owners/7/brands/3/setup', $paths->setupDirectory(7, 3));
    }

    public function test_resolves_owner_from_brand_membership(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $paths = app(OwnerMediaPathService::class);

        $this->assertSame($owner->id, $paths->ownerIdForBrand($venue->brand, $owner));
    }

    public function test_requires_brand_owner_for_media_paths(): void
    {
        $brand = $this->createBrand();
        $paths = app(OwnerMediaPathService::class);

        $this->expectException(ValidationException::class);

        $paths->ownerIdForBrand($brand);
    }
}
