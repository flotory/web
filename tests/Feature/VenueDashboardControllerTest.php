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
            ->assertJsonPath('stats.visits_last_28_days', 2)
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
                    'visits_last_28_days' => ['previous', 'change_pct'],
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
                'revenue_estimate' => [
                    'average_check_amount',
                    'visits_last_28_days',
                    'total_visits',
                    'estimated_revenue_last_28_days',
                    'estimated_revenue_total',
                ],
            ]);
    }

    public function test_dashboard_revenue_estimate_multiplies_visits_by_average_check(): void
    {
        $owner = $this->createUser();
        $customerUser = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue(['average_check_amount' => 5]);
        $this->attachMember($venue, $owner, 'owner');

        $customer = $this->createCustomer($venue, $customerUser);
        $this->createVisit($customer, $owner);
        $this->createVisit($customer, $owner);
        $this->createVisit($customer, $owner);

        Sanctum::actingAs($owner);

        $this->getJson("/api/dashboard?venue_id={$venue->id}")
            ->assertOk()
            ->assertJsonPath('revenue_estimate.average_check_amount', 5)
            ->assertJsonPath('revenue_estimate.total_visits', 3)
            ->assertJsonPath('revenue_estimate.estimated_revenue_total', 15)
            ->assertJsonPath('revenue_estimate.visits_last_28_days', 3)
            ->assertJsonPath('revenue_estimate.estimated_revenue_last_28_days', 15);
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
            ->assertJsonPath('stats.visits_last_28_days', 0);
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

    public function test_dashboard_respects_period_query_parameter(): void
    {
        $owner = $this->createUser();
        $recentGuest = $this->createUser(['email' => 'recent@example.com']);
        $oldGuest = $this->createUser(['email' => 'old@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $recentCustomer = $this->createCustomer($venue, $recentGuest);
        $this->createVisit($recentCustomer, $owner, ['created_at' => now()->subDays(3)]);
        $this->createVisit($recentCustomer, $owner, ['created_at' => now()->subDays(1)]);

        $oldCustomer = $this->createCustomer($venue, $oldGuest);
        $this->createVisit($oldCustomer, $owner, ['created_at' => now()->subDays(10)]);

        Sanctum::actingAs($owner);

        $this->getJson("/api/dashboard?venue_id={$venue->id}&period=7d")
            ->assertOk()
            ->assertJsonPath('period.preset', '7d')
            ->assertJsonPath('stats.visits_last_28_days', 2)
            ->assertJsonPath('stats.returning_customers', 1);

        $this->getJson("/api/dashboard?venue_id={$venue->id}&period=14d")
            ->assertOk()
            ->assertJsonPath('stats.visits_last_28_days', 3);
    }

    public function test_dashboard_rejects_invalid_custom_period(): void
    {
        $owner = $this->createUser();
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        Sanctum::actingAs($owner);

        $this->getJson("/api/dashboard?venue_id={$venue->id}&from=2026-07-10&to=2026-07-01")
            ->assertStatus(422);
    }

    public function test_dashboard_six_month_period_scopes_visits_and_returns_metadata(): void
    {
        $owner = $this->createUser();
        $guest = $this->createUser(['email' => 'six-month@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');
        $customer = $this->createCustomer($venue, $guest);

        $this->createVisit($customer, $owner, ['created_at' => now()->subMonths(2)]);
        $this->createVisit($customer, $owner, ['created_at' => now()->subMonths(8)]);

        Sanctum::actingAs($owner);

        $this->getJson("/api/dashboard?venue_id={$venue->id}&period=6m")
            ->assertOk()
            ->assertJsonPath('period.preset', '6m')
            ->assertJsonPath('period.label', 'Last 6 months')
            ->assertJsonPath('stats.visits_last_28_days', 1)
            ->assertJsonStructure([
                'activity_series' => ['bucket', 'rows'],
            ]);
    }

    public function test_dashboard_rolling_window_excludes_visits_outside_last_28_days(): void
    {
        $owner = $this->createUser();
        $recentGuest = $this->createUser(['email' => 'recent@example.com']);
        $oldGuest = $this->createUser(['email' => 'old@example.com']);
        $venue = $this->createVenue();
        $this->attachMember($venue, $owner, 'owner');

        $recentCustomer = $this->createCustomer($venue, $recentGuest);
        $this->createVisit($recentCustomer, $owner, ['created_at' => now()->subDays(5)]);
        $this->createVisit($recentCustomer, $owner, ['created_at' => now()->subDays(2)]);

        $oldCustomer = $this->createCustomer($venue, $oldGuest);
        $this->createVisit($oldCustomer, $owner, ['created_at' => now()->subDays(40)]);
        $this->createVisit($oldCustomer, $owner, ['created_at' => now()->subDays(35)]);

        Sanctum::actingAs($owner);

        $this->getJson("/api/dashboard?venue_id={$venue->id}")
            ->assertOk()
            ->assertJsonPath('stats.visits_last_28_days', 2)
            ->assertJsonPath('stats.returning_customers', 1);
    }

    public function test_dashboard_kpi_trends_compare_reward_unlocks_and_claim_rate_by_unlock_date(): void
    {
        $owner = $this->createUser();
        $guest = $this->createUser(['email' => 'guest@example.com']);
        $venue = $this->createVenue();
        $reward = $this->createReward($venue, ['required_stamps' => 5]);
        $this->attachMember($venue, $owner, 'owner');
        $customer = $this->createCustomer($venue, $guest);

        $this->createRewardUnlock($customer, $reward, [
            'cycle_number' => 1,
            'unlocked_at' => now()->subDays(40),
            'claimed_at' => now()->subDays(39),
            'claimed_by' => $guest->id,
        ]);
        $this->createRewardUnlock($customer, $reward, [
            'cycle_number' => 2,
            'unlocked_at' => now()->subDays(10),
            'claimed_at' => now()->subDays(9),
            'claimed_by' => $guest->id,
        ]);
        $this->createRewardUnlock($customer, $reward, [
            'cycle_number' => 3,
            'unlocked_at' => now()->subDays(5),
            'claimed_at' => null,
        ]);

        Sanctum::actingAs($owner);

        $this->getJson("/api/dashboard?venue_id={$venue->id}")
            ->assertOk()
            ->assertJsonPath('stats.rewards_unlocked_last_28_days', 2)
            ->assertJsonPath('stats.claim_rate_last_28_days', 50)
            ->assertJsonPath('kpi_trends.rewards_unlocked.previous', 1)
            ->assertJsonPath('kpi_trends.rewards_unlocked.change_pct', 100)
            ->assertJsonPath('kpi_trends.repeat_rate.previous', 100)
            ->assertJsonPath('kpi_trends.repeat_rate.change_pct', -50);
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
