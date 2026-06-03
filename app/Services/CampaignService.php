<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Customer;
use App\Models\Venue;
use App\Support\CampaignTemplates;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class CampaignService
{
    public function __construct(private CustomerRetentionService $retention) {}

    public function multiplierFor(Customer $customer, Venue $venue, ?Carbon $now = null): int
    {
        $now ??= Carbon::now();
        $multipliers = $this->matchingCampaignsFor($customer, $venue, $now)
            ->map(fn (Campaign $campaign): int => $this->campaignMultiplier($campaign))
            ->all();

        return $multipliers === [] ? 1 : max($multipliers);
    }

    public function winningCampaignFor(Customer $customer, Venue $venue, ?Carbon $now = null): ?Campaign
    {
        $now ??= Carbon::now();

        return $this->matchingCampaignsFor($customer, $venue, $now)
            ->sortByDesc(fn (Campaign $campaign): int => $this->campaignMultiplier($campaign))
            ->first();
    }

    /**
     * @return Collection<int, Campaign>
     */
    public function matchingCampaignsFor(Customer $customer, Venue $venue, ?Carbon $now = null): Collection
    {
        $now ??= Carbon::now();

        return Campaign::query()
            ->where('venue_id', $venue->id)
            ->where('status', Campaign::STATUS_ACTIVE)
            ->get()
            ->filter(fn (Campaign $campaign): bool => $this->customerMatches($customer, $campaign, $now))
            ->values();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function ownerActiveCampaignsFor(Venue $venue): array
    {
        return Campaign::query()
            ->where('venue_id', $venue->id)
            ->where('status', Campaign::STATUS_ACTIVE)
            ->orderByDesc('activated_at')
            ->get()
            ->map(fn (Campaign $campaign): array => $this->enrichForOwner($campaign))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function enrichForOwner(Campaign $campaign): array
    {
        return array_merge($campaign->toArray(), [
            'multiplier' => $this->campaignMultiplier($campaign),
            'schedule_chips' => $this->scheduleChips($campaign),
            'schedule_summary' => $this->scheduleSummary($campaign),
            'status_label' => $this->statusLabel($campaign),
            'summary' => $this->quickSummary($campaign),
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function scannerContextFor(Customer $customer): ?array
    {
        $venue = $customer->venue ?? Venue::query()->find($customer->venue_id);
        if (! $venue) {
            return null;
        }

        $multiplier = $this->multiplierFor($customer, $venue);
        if ($multiplier <= 1) {
            return null;
        }

        $campaign = $this->winningCampaignFor($customer, $venue);
        if (! $campaign) {
            return null;
        }

        return [
            'headline' => $multiplier.'× Stamps Active',
            'name' => $campaign->name,
            'template_id' => $campaign->template_id,
            'multiplier' => $multiplier,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function promotionForCustomer(Customer $customer, ?Carbon $now = null): ?array
    {
        $now ??= Carbon::now();
        $venue = $customer->venue ?? Venue::query()->find($customer->venue_id);
        if (! $venue) {
            return null;
        }

        $multiplier = $this->multiplierFor($customer, $venue, $now);
        if ($multiplier <= 1) {
            return null;
        }

        $campaign = $this->winningCampaignFor($customer, $venue, $now);
        if (! $campaign) {
            return null;
        }

        $endsAt = $campaign->ends_at;
        $daysLeft = $endsAt ? max(0, (int) $now->diffInDays($endsAt, false)) : null;

        return [
            'name' => $campaign->name,
            'template_id' => $campaign->template_id,
            'multiplier' => $multiplier,
            'headline' => $multiplier.'× stamps active',
            'message' => $this->customerPromotionMessage($campaign, $venue, $multiplier),
            'ends_at' => $endsAt?->toIso8601String(),
            'days_left' => $daysLeft,
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    public function audienceCountFor(Venue $venue, string $templateId, array $config = []): int
    {
        CampaignTemplates::assertValid($templateId);

        return match ($templateId) {
            CampaignTemplates::BRING_BACK => $this->inactiveCustomerCount(
                $venue,
                (int) ($config['inactive_days'] ?? 30),
            ),
            CampaignTemplates::VIP => $this->loyalCustomerCount(
                $venue,
                (int) ($config['min_visits'] ?? 5),
                (int) ($config['min_rewards_claimed'] ?? 1),
            ),
            default => $venue->customers()->count(),
        };
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    public function previewFor(Venue $venue, string $templateId, array $config, ?string $name = null): array
    {
        CampaignTemplates::assertValid($templateId);
        $defaults = CampaignTemplates::defaults($templateId);
        $mergedConfig = array_merge($defaults['config'], $config);
        $campaignName = $name ?: $defaults['name'];

        $draft = new Campaign([
            'template_id' => $templateId,
            'name' => $campaignName,
            'config' => $mergedConfig,
            'status' => Campaign::STATUS_DRAFT,
        ]);

        return [
            'name' => $campaignName,
            'template_id' => $templateId,
            'audience_count' => $this->audienceCountFor($venue, $templateId, $mergedConfig),
            'multiplier' => $this->campaignMultiplier($draft),
            'schedule_chips' => $this->scheduleChips($draft),
            'schedule_summary' => $this->scheduleSummary($draft),
            'summary' => $this->quickSummary($draft),
            'push_enabled' => true,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function recommendationsFor(Venue $venue): array
    {
        $recommendations = [];
        $inactive = $this->inactiveCustomerCount($venue, 30);
        $loyal = $this->loyalCustomerCount($venue, 5, 1);

        if ($inactive > 0) {
            $recommendations[] = [
                'template_id' => CampaignTemplates::BRING_BACK,
                'icon' => 'warning',
                'title' => "{$inactive} customers inactive for 30+ days",
                'cta_label' => 'Bring them back',
                'audience_count' => $inactive,
            ];
        }

        if ($loyal > 0) {
            $recommendations[] = [
                'template_id' => CampaignTemplates::VIP,
                'icon' => 'star',
                'title' => "{$loyal} VIP customers",
                'cta_label' => 'Reward VIPs',
                'audience_count' => $loyal,
            ];
        }

        return $recommendations;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function templatesForVenue(Venue $venue): array
    {
        return array_map(function (array $template) use ($venue): array {
            $templateId = $template['template_id'];

            return array_merge($template, [
                'audience_count' => $this->audienceCountFor($venue, $templateId, $template['config']),
                'target_label' => $this->targetLabelFor($venue, $templateId, $template['config']),
            ]);
        }, CampaignTemplates::catalog());
    }

    /**
     * @param  array<string, mixed>  $config
     */
    public function createCampaign(
        Venue $venue,
        string $templateId,
        array $config,
        int $createdBy,
        ?string $name = null,
        bool $pushEnabled = true,
    ): Campaign {
        CampaignTemplates::assertValid($templateId);
        $defaults = CampaignTemplates::defaults($templateId);
        $mergedConfig = array_merge($defaults['config'], $config);

        return $venue->campaigns()->create([
            'template_id' => $templateId,
            'name' => $name ?: $defaults['name'],
            'status' => Campaign::STATUS_DRAFT,
            'starts_at' => $defaults['starts_at'],
            'ends_at' => $defaults['ends_at'],
            'config' => $mergedConfig,
            'push_enabled' => $pushEnabled,
            'audience_count' => $this->audienceCountFor($venue, $templateId, $mergedConfig),
            'created_by' => $createdBy,
        ]);
    }

    public function createFromTemplate(Venue $venue, string $templateId, int $createdBy): Campaign
    {
        $defaults = CampaignTemplates::defaults($templateId);

        return $this->createCampaign($venue, $templateId, $defaults['config'], $createdBy);
    }

    public function activate(Campaign $campaign): Campaign
    {
        $now = Carbon::now();
        $updates = [
            'status' => Campaign::STATUS_ACTIVE,
            'activated_at' => $campaign->activated_at ?? $now,
            'audience_count' => $this->audienceCountFor(
                $campaign->venue,
                $campaign->template_id,
                $campaign->config ?? [],
            ),
        ];

        if (in_array($campaign->template_id, [CampaignTemplates::BRING_BACK, CampaignTemplates::QUIET_DAY], true)) {
            $durationDays = (int) ($campaign->config['duration_days'] ?? 14);
            $updates['starts_at'] = $now;
            $updates['ends_at'] = $now->copy()->addDays($durationDays);
        }

        $campaign->update($updates);

        return $campaign->fresh();
    }

    /**
     * @param  array<string, mixed>  $config
     */
    public function updateCampaignConfig(Campaign $campaign, array $config, ?string $name = null, ?bool $pushEnabled = null): Campaign
    {
        $defaults = CampaignTemplates::defaults($campaign->template_id);
        $mergedConfig = array_merge($defaults['config'], $campaign->config ?? [], $config);

        $updates = [
            'config' => $mergedConfig,
            'audience_count' => $this->audienceCountFor(
                $campaign->venue,
                $campaign->template_id,
                $mergedConfig,
            ),
        ];

        if ($name !== null) {
            $updates['name'] = $name;
        }

        if ($pushEnabled !== null) {
            $updates['push_enabled'] = $pushEnabled;
        }

        $campaign->update($updates);

        return $campaign->fresh();
    }

    private function campaignMultiplier(Campaign $campaign): int
    {
        return max(1, (int) ($campaign->config['stamp_multiplier'] ?? 2));
    }

    private function customerMatches(Customer $customer, Campaign $campaign, Carbon $now): bool
    {
        if (! $this->isScheduleOpen($campaign, $now)) {
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
            CampaignTemplates::VIP => $this->isLoyalCustomer(
                $customer,
                (int) ($campaign->config['min_visits'] ?? 5),
                (int) ($campaign->config['min_rewards_claimed'] ?? 1),
            ),
            default => false,
        };
    }

    private function isScheduleOpen(Campaign $campaign, Carbon $now): bool
    {
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

        return $current >= $start && $current <= $end;
    }

    private function isInactiveCustomer(Customer $customer, int $inactiveDays): bool
    {
        $lastVisit = $customer->visits()->max('created_at');

        if (! $lastVisit) {
            return $customer->created_at->lessThan(now()->subDays($inactiveDays));
        }

        return Carbon::parse($lastVisit)->lessThan(now()->subDays($inactiveDays));
    }

    private function isLoyalCustomer(Customer $customer, int $minVisits, int $minRewardsClaimed): bool
    {
        $visits = $customer->visits()->count();
        $claimed = $customer->rewardUnlocks()->whereNotNull('claimed_at')->count();

        return $visits >= $minVisits || $claimed >= $minRewardsClaimed;
    }

    private function inactiveCustomerCount(Venue $venue, int $inactiveDays): int
    {
        return Customer::query()
            ->where('venue_id', $venue->id)
            ->where(function (Builder $query) use ($inactiveDays): void {
                $query
                    ->whereRaw(
                        '(select max(created_at) from visits where visits.customer_id = customers.id) < ?',
                        [now()->subDays($inactiveDays)],
                    )
                    ->orWhere(function (Builder $nested) use ($inactiveDays): void {
                        $nested
                            ->whereDoesntHave('visits')
                            ->where('customers.created_at', '<', now()->subDays($inactiveDays));
                    });
            })
            ->count();
    }

    private function loyalCustomerCount(Venue $venue, int $minVisits, int $minRewardsClaimed): int
    {
        return Customer::query()
            ->where('venue_id', $venue->id)
            ->where(function (Builder $query) use ($minVisits, $minRewardsClaimed): void {
                $query
                    ->has('visits', '>=', $minVisits)
                    ->orWhereHas(
                        'rewardUnlocks',
                        fn (Builder $unlock) => $unlock->whereNotNull('claimed_at'),
                        '>=',
                        $minRewardsClaimed,
                    );
            })
            ->count();
    }

    /**
     * @return array<int, string>
     */
    private function scheduleChips(Campaign $campaign): array
    {
        $chips = [];

        if (in_array($campaign->template_id, [CampaignTemplates::QUIET_DAY, CampaignTemplates::HAPPY_HOUR], true)) {
            $days = $campaign->config['days_of_week'] ?? [];
            $chips = array_merge($chips, $this->dayChips($days));
        }

        if ($campaign->template_id === CampaignTemplates::HAPPY_HOUR) {
            $start = $campaign->config['start_time'] ?? null;
            $end = $campaign->config['end_time'] ?? null;
            if ($start && $end) {
                $chips[] = $this->formatTime12($start).'–'.$this->formatTime12($end);
            }
        }

        if ($campaign->template_id === CampaignTemplates::BRING_BACK) {
            $chips[] = (int) ($campaign->config['inactive_days'] ?? 30).'+ days inactive';
            $chips[] = (int) ($campaign->config['duration_days'] ?? 14).' day run';
        }

        if ($campaign->template_id === CampaignTemplates::QUIET_DAY) {
            $chips[] = (int) ($campaign->config['duration_days'] ?? 30).' day run';
        }

        if ($campaign->template_id === CampaignTemplates::VIP) {
            $chips[] = (int) ($campaign->config['min_visits'] ?? 5).'+ visits';
            $chips[] = (int) ($campaign->config['min_rewards_claimed'] ?? 1).'+ rewards claimed';
        }

        return $chips;
    }

    private function scheduleSummary(Campaign $campaign): string
    {
        $chips = $this->scheduleChips($campaign);

        return $chips === [] ? 'Always on when active' : implode(' · ', $chips);
    }

    private function statusLabel(Campaign $campaign): string
    {
        return match ($campaign->status) {
            Campaign::STATUS_ACTIVE => 'Running',
            Campaign::STATUS_PAUSED => 'Paused',
            Campaign::STATUS_ENDED => 'Ended',
            default => 'Draft',
        };
    }

    private function quickSummary(Campaign $campaign): string
    {
        $multiplier = $this->campaignMultiplier($campaign);

        return match ($campaign->template_id) {
            CampaignTemplates::BRING_BACK => "Win back inactive guests with {$multiplier}× stamps.",
            CampaignTemplates::QUIET_DAY => "Boost quiet days with {$multiplier}× stamps.",
            CampaignTemplates::HAPPY_HOUR => "Afternoon visits earn {$multiplier}× stamps.",
            CampaignTemplates::VIP => "Loyal guests earn {$multiplier}× stamps.",
            default => "{$multiplier}× stamp bonus for eligible customers.",
        };
    }

    /**
     * @param  array<int, int|string>  $days
     * @return array<int, string>
     */
    private function dayChips(array $days): array
    {
        $labels = [
            1 => 'Mon',
            2 => 'Tue',
            3 => 'Wed',
            4 => 'Thu',
            5 => 'Fri',
            6 => 'Sat',
            7 => 'Sun',
        ];

        $isoDays = array_values(array_unique(array_map('intval', $days)));
        sort($isoDays);

        return array_values(array_filter(array_map(
            fn (int $day): ?string => $labels[$day] ?? null,
            $isoDays,
        )));
    }

    private function formatTime12(string $time): string
    {
        return Carbon::createFromFormat('H:i', $time)->format('g:i A');
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function targetLabelFor(Venue $venue, string $templateId, array $config = []): string
    {
        $count = $this->audienceCountFor($venue, $templateId, $config);

        return match ($templateId) {
            CampaignTemplates::BRING_BACK => "{$count} inactive customers",
            CampaignTemplates::VIP => "{$count} VIP customers",
            CampaignTemplates::QUIET_DAY => "{$count} customers on selected days",
            CampaignTemplates::HAPPY_HOUR => "{$count} customers during happy hour",
            default => "{$count} customers",
        };
    }

    private function customerPromotionMessage(Campaign $campaign, Venue $venue, int $multiplier): string
    {
        $venueName = $venue->name;

        return match ($campaign->template_id) {
            CampaignTemplates::HAPPY_HOUR => "Earn rewards faster at {$venueName} during happy hour",
            CampaignTemplates::QUIET_DAY => "{$multiplier}× stamps on boost days at {$venueName}",
            CampaignTemplates::BRING_BACK => "We miss you — {$multiplier}× stamps at {$venueName}",
            CampaignTemplates::VIP => "Thank you for being a regular at {$venueName}",
            default => "{$multiplier}× stamp bonus at {$venueName}",
        };
    }
}
