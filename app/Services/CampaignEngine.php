<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Customer;
use App\Models\Venue;
use App\Support\CampaignTemplates;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Stamp multiplier matching: which active campaigns apply to a customer at a given time.
 */
class CampaignEngine
{
    public function multiplierFor(
        Customer $customer,
        Venue $venue,
        ?Carbon $now = null,
        int $pendingLifetimeStamps = 0,
    ): int {
        $multipliers = $this->matchingCampaignsFor($customer, $venue, $now, $pendingLifetimeStamps)
            ->map(fn (Campaign $campaign): int => $this->multiplierValue($campaign))
            ->all();

        return $multipliers === [] ? 1 : max($multipliers);
    }

    public function winningCampaignFor(
        Customer $customer,
        Venue $venue,
        ?Carbon $now = null,
        int $pendingLifetimeStamps = 0,
    ): ?Campaign {
        return $this->matchingCampaignsFor($customer, $venue, $now, $pendingLifetimeStamps)
            ->sortByDesc(fn (Campaign $campaign): int => $this->multiplierValue($campaign))
            ->first();
    }

    /**
     * @return Collection<int, Campaign>
     */
    public function matchingCampaignsFor(
        Customer $customer,
        Venue $venue,
        ?Carbon $now = null,
        int $pendingLifetimeStamps = 0,
    ): Collection {
        $now = $this->venueNow($venue, $now);

        return Campaign::query()
            ->where('brand_id', $venue->brand_id)
            ->where('status', Campaign::STATUS_ACTIVE)
            ->get()
            ->filter(fn (Campaign $campaign): bool => $this->customerMatches(
                $customer,
                $campaign,
                $venue,
                $now,
                $pendingLifetimeStamps,
            ))
            ->values();
    }

    public function multiplierValue(Campaign $campaign): int
    {
        return max(1, (int) ($campaign->config['stamp_multiplier'] ?? 2));
    }

    private function customerMatches(
        Customer $customer,
        Campaign $campaign,
        Venue $venue,
        Carbon $now,
        int $pendingLifetimeStamps,
    ): bool {
        if (! $this->isScheduleOpen($campaign, $venue, $now)) {
            return false;
        }

        return match ($campaign->template_id) {
            CampaignTemplates::BRING_BACK => $this->isInactiveCustomer(
                $customer,
                (int) ($campaign->config['inactive_days'] ?? 30),
            ),
            CampaignTemplates::QUIET_DAY => $this->matchesDayOfWeek($campaign, $now),
            CampaignTemplates::HAPPY_HOUR => $this->matchesDayOfWeek($campaign, $now)
                && $this->matchesTimeWindow($campaign, $now),
            CampaignTemplates::VIP => $this->isVipCustomer(
                $customer,
                $this->minLifetimeStampsFor($campaign),
                (int) ($campaign->config['min_rewards_claimed'] ?? 1),
                $pendingLifetimeStamps,
            ),
            default => false,
        };
    }

    public function isScheduleOpen(Campaign $campaign, Venue $venue, ?Carbon $now = null): bool
    {
        $now = $this->venueNow($venue, $now);

        if ($campaign->starts_at && $now->lt($campaign->starts_at)) {
            return false;
        }

        if ($campaign->ends_at && $now->gt($campaign->ends_at)) {
            return false;
        }

        if (in_array($campaign->template_id, [CampaignTemplates::QUIET_DAY, CampaignTemplates::HAPPY_HOUR], true)) {
            if (! $this->matchesDayOfWeek($campaign, $now)) {
                return false;
            }
        }

        if ($campaign->template_id === CampaignTemplates::HAPPY_HOUR) {
            return $this->matchesTimeWindow($campaign, $now);
        }

        return true;
    }

    private function venueNow(Venue $venue, ?Carbon $now = null): Carbon
    {
        $timezone = $venue->campaignTimezone();

        if ($now !== null) {
            return $now->copy()->timezone($timezone);
        }

        return Carbon::now($timezone);
    }

    private function matchesDayOfWeek(Campaign $campaign, Carbon $now): bool
    {
        $days = $campaign->config['days_of_week'] ?? [];

        if ($days === []) {
            return true;
        }

        return in_array($now->dayOfWeekIso, array_map('intval', $days), true);
    }

    private function matchesTimeWindow(Campaign $campaign, Carbon $now): bool
    {
        $start = $campaign->config['start_time'] ?? null;
        $end = $campaign->config['end_time'] ?? null;

        if (! $start || ! $end) {
            return true;
        }

        $current = $now->format('H:i');

        if ($start <= $end) {
            return $current >= $start && $current <= $end;
        }

        return $current >= $start || $current <= $end;
    }

    private function isInactiveCustomer(Customer $customer, int $inactiveDays): bool
    {
        $lastVisit = $customer->visits()->max('created_at');

        if (! $lastVisit) {
            return $customer->created_at->lessThan(now()->subDays($inactiveDays));
        }

        return Carbon::parse($lastVisit)->lessThan(now()->subDays($inactiveDays));
    }

    private function isVipCustomer(
        Customer $customer,
        int $minLifetimeStamps,
        int $minRewardsClaimed,
        int $pendingLifetimeStamps,
    ): bool {
        $lifetimeStamps = (int) $customer->lifetime_stamps + $pendingLifetimeStamps;
        $claimed = $customer->rewardUnlocks()->whereNotNull('claimed_at')->count();

        return $lifetimeStamps >= $minLifetimeStamps || $claimed >= $minRewardsClaimed;
    }

    private function minLifetimeStampsFor(Campaign $campaign): int
    {
        $config = $campaign->config ?? [];

        return (int) ($config['min_lifetime_stamps'] ?? $config['min_visits'] ?? 5);
    }
}
