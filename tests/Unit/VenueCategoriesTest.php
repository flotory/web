<?php

namespace Tests\Unit;

use App\Support\VenueCategories;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class VenueCategoriesTest extends TestCase
{
    #[Test]
    public function it_exposes_twelve_categories_including_other(): void
    {
        $categories = VenueCategories::all();

        $this->assertCount(12, $categories);
        $this->assertContains('other', $categories);
        $this->assertContains('salon', $categories);
        $this->assertContains('pet_care', $categories);
    }

    #[Test]
    public function it_validates_and_normalizes_categories(): void
    {
        $this->assertTrue(VenueCategories::isValid('gym'));
        $this->assertFalse(VenueCategories::isValid('tea house'));
        $this->assertSame('spa', VenueCategories::normalize('spa'));
        $this->assertSame('cafe', VenueCategories::normalize('unknown'));
    }
}
