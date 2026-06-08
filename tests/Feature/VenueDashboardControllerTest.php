<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLoyaltyData;
use Tests\TestCase;

class VenueDashboardControllerTest extends TestCase
{
    use BuildsLoyaltyData;
    use RefreshDatabase;

    public function test_dashboard_returns_empty_scope_for_user_with_no_venues(): void
    {
        $user = $this->createUser();

        Sanctum::actingAs($user);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('scope', 'none')
            ->assertJsonPath('venues_count', 0)
            ->assertJsonPath('stats.total_customers', 0);
    }

    public function test_dashboard_for_specific_venue(): void
    {
        $owner = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $customer = $this->createCustomer($venue, $customerUser, ['stamps' => 3]);
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->createRewardCycle($customer);
        $this->createVisit($customer, $owner);
        $this->createVisit($customer, $owner);
        $this->createRewardUnlock($customer, $reward, ['claimed_at' => now(), 'claimed_by' => $owner->id]);

        Sanctum::actingAs($owner);

        $this->getJson("/api/dashboard?venue_id={$venue->id}")
            ->assertOk()
            ->assertJsonPath('scope', 'venue')
            ->assertJsonPath('venue.id', $venue->id)
            ->assertJsonPath('stats.total_customers', 1)
            ->assertJsonPath('stats.total_visits', 2)
            ->assertJsonPath('stats.visits_this_month', 2)
            ->assertJsonPath('stats.active_customers', 1)
            ->assertJsonPath('stats.returning_customers', 1)
            ->assertJsonPath('stats.rewards_claimed', 1)
            ->assertJsonPath('stats.milestones_unlocked', 1)
            ->assertJsonPath('stats.milestones_claimed', 1)
            ->assertJsonPath('has_loyalty_activity', true)
            ->assertJsonStructure([
                'insights',
                'recent_activity' => [
                    ['type', 'title', 'occurred_at'],
                ],
                'kpi_trends' => [
                    'visits_this_month' => ['previous', 'change_pct'],
                    'returning_guests' => ['previous', 'change_pct'],
                    'rewards_unlocked' => ['previous', 'change_pct'],
                    'repeat_rate' => ['previous', 'change_pct'],
                ],
                'customer_health' => ['total', 'active', 'inactive', 'new', 'cooling'],
                'milestone_conversions',
                'most_loyal_customers',
                'monthly_activity' => [
                    ['month', 'label', 'visits'],
                ],
            ]);
    }

    public function test_dashboard_insights_surface_customers_close_to_reward(): void
    {
        $owner = $this->createUser();
        $guest = $this->createUser(['email' => 'close@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $customer = $this->createCustomer($venue, $guest, ['stamps' => 4]);
        $this->createReward($venue, ['required_stamps' => 5, 'title' => 'Free Pastry']);
        $this->createVisit($customer, $owner);

        Sanctum::actingAs($owner);

        $response = $this->getJson("/api/dashboard?venue_id={$venue->id}")
            ->assertOk();

        $insights = collect($response->json('insights'))->pluck('text')->implode(' ');
        $this->assertStringContainsString('1 more stamp', $insights);
    }

    public function test_dashboard_reports_no_activity_for_empty_venue(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->getJson("/api/dashboard?venue_id={$venue->id}")
            ->assertOk()
            ->assertJsonPath('has_loyalty_activity', false)
            ->assertJsonPath('stats.visits_this_month', 0);
    }

    public function test_dashboard_aggregates_all_owner_venues(): void
    {
        $owner = $this->createUser();
        $venueA = $this->createVenue(['name' => 'Alpha Cafe']);
        $venueB = $this->createVenue(['name' => 'Beta Cafe']);
        $this->attachMember($venueA, $owner, 'owner');
        $this->attachMember($venueB, $owner, 'owner');

        $customerUser = $this->createUser(['email' => 'loyal@example.com']);
        $this->createCustomer($venueA, $customerUser, ['stamps' => 10]);
        $this->createCustomer($venueB, $customerUser, ['stamps' => 5]);

        Sanctum::actingAs($owner);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('scope', 'all')
            ->assertJsonPath('venues_count', 2)
            ->assertJsonCount(2, 'venue_summaries');
    }

    public function test_dashboard_aggregates_monthly_activity_and_milestone_conversions(): void
    {
        $owner = $this->createUser();
        $venueA = $this->createVenue(['name' => 'Alpha Cafe']);
        $venueB = $this->createVenue(['name' => 'Beta Cafe']);
        $this->attachMember($venueA, $owner, 'owner');
        $this->attachMember($venueB, $owner, 'owner');

        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $customerA = $this->createCustomer($venueA, $customerUser, ['stamps' => 5]);
        $customerB = $this->createCustomer($venueB, $customerUser, ['stamps' => 5]);
        $rewardA = $this->createReward($venueA, ['required_stamps' => 5]);
        $rewardB = $this->createReward($venueB, ['required_stamps' => 5]);
        $this->createRewardCycle($customerA);
        $this->createRewardCycle($customerB);
        $this->createRewardUnlock($customerA, $rewardA, ['claimed_at' => now(), 'claimed_by' => $owner->id]);
        $this->createRewardUnlock($customerB, $rewardB);

        $this->createVisit($customerA, $owner, ['created_at' => now()->subMonths(2)]);
        $this->createVisit($customerB, $owner, ['created_at' => now()->subMonth()]);

        Sanctum::actingAs($owner);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('scope', 'all')
            ->assertJsonCount(2, 'milestone_conversions')
            ->assertJsonStructure(['monthly_activity']);
    }

    public function test_dashboard_counts_active_progressors_with_multiple_visits(): void
    {
        $owner = $this->createUser();
        $customerUser = $this->createUser(['email' => 'regular@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $customer = $this->createCustomer($venue, $customerUser);
        $this->createVisit($customer, $owner);
        $this->createVisit($customer, $owner);

        Sanctum::actingAs($owner);

        $this->getJson("/api/dashboard?venue_id={$venue->id}")
            ->assertOk()
            ->assertJsonPath('stats.active_progressors', 1);
    }

    public function test_admin_dashboard_includes_all_venues(): void
    {
        $admin = $this->createUser(['is_admin' => true]);
        $venue = $this->createVenue();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $this->createCustomer($venue, $customerUser);

        Sanctum::actingAs($admin);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('scope', 'none')
            ->assertJsonPath('stats.total_customers', 0);
    }

    public function test_venue_dashboard_show_endpoint(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->getJson("/api/venues/{$venue->id}/dashboard")
            ->assertOk()
            ->assertJsonPath('scope', 'venue')
            ->assertJsonPath('venue.slug', $venue->slug);
    }

    public function test_dashboard_recent_activity_returns_real_loyalty_events(): void
    {
        $owner = $this->createUser();
        $guest = $this->createUser(['email' => 'activity@example.com', 'name' => 'Activity Guest']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $customer = $this->createCustomer($venue, $guest);
        $this->createVisit($customer, $owner);

        Sanctum::actingAs($owner);

        $this->getJson("/api/dashboard?venue_id={$venue->id}")
            ->assertOk()
            ->assertJsonFragment(['title' => 'Stamp added for Activity Guest'])
            ->assertJsonFragment(['title' => 'Activity Guest joined loyalty']);
    }

    public function test_staff_cannot_access_dashboard(): void
    {
        $owner = $this->createUser();
        $staff = $this->createUser(['email' => 'staff@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $this->attachMember($venue, $staff, 'staff');

        Sanctum::actingAs($staff);

        $this->getJson("/api/venues/{$venue->id}/dashboard")->assertForbidden();
    }
}
