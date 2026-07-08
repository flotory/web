<?php

namespace Tests\Feature;

use App\Models\Reward;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseSeederDemoRewardsTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_creates_three_demo_cafe_milestones_with_images(): void
    {
        $this->seed();

        $venue = Venue::query()->where('slug', 'demo-cafe')->firstOrFail();

        $rewards = Reward::query()
            ->where('brand_id', $venue->brand_id)
            ->orderBy('required_stamps')
            ->get(['required_stamps', 'title', 'image', 'reward_type', 'active']);

        $this->assertCount(3, $rewards);
        $this->assertSame([5, 10, 15], $rewards->pluck('required_stamps')->all());

        $this->assertSame('50% off ice cream', $rewards[0]->title);
        $this->assertSame('/images/defaults/rewards/default-reward.png', $rewards[0]->image);

        $this->assertSame('Free coffee', $rewards[1]->title);
        $this->assertSame('/images/defaults/rewards/default-reward.png', $rewards[1]->image);

        $this->assertSame('Free piece of cake', $rewards[2]->title);
        $this->assertSame('/images/defaults/rewards/default-reward.png', $rewards[2]->image);

        foreach ($rewards as $reward) {
            $this->assertSame('milestone', $reward->reward_type);
            $this->assertTrue($reward->active);
        }
    }
}
