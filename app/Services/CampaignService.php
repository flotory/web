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
    public function __construct(
        private CampaignEngine $engine,
        private CampaignOwnerPresenter $presenter,
    ) {}

    public function multiplierFor(
        Customer $customer,
        Venue $venue,
        ?Carbon $now = null,
        int $pendingLifetimeStamps = 0,
    ): int {
        return $this->engine->multiplierFor($customer, $venue, $now, $pendingLifetimeStamps);
    }

    public function winningCampaignFor(
        Customer $customer,
        Venue $venue,
        ?Carbon $now = null,
        int $pendingLifetimeStamps = 0,
    ): ?Campaign {
        return $this->engine->winningCampaignFor($customer, $venue, $now, $pendingLifetimeStamps);
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
        return $this->engine->matchingCampaignsFor($customer, $venue, $now, $pendingLifetimeStamps);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function ownerActiveCampaignsFor(Venue $venue): array
    {
        return Campaign::query()
            ->where('brand_id', $venue->brand_id)
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
        return $this->presenter->enrichForOwner($campaign);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function promotionForCustomer(Customer $customer, ?Carbon $now = null): ?array
    {
        $now ??= Carbon::now();
        $venue = $customer->venue;
        if (! $venue) {
            $customer->loadMissing('brand');
            $venue = $customer->brand?->venues()->where('is_primary', true)->first()
                ?? $customer->brand?->venues()->first();
        }
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

        return $this->presentCustomerCampaign($venue, $campaign, $multiplier, $now, appliesNow: true);
    }

    /**
     * Active campaigns at venues where the customer has a card (for home carousel).
     *
     * @param  Collection<int, Customer>  $cards
     * @return array<int, array<string, mixed>>
     */
    public function homeCampaignsForCards(Collection $cards, ?Carbon $now = null, int $limit = 10): array
    {
        $now ??= Carbon::now();
        $items = [];
        $seen = [];

        foreach ($cards as $card) {
            $venue = $card->venue;
            if (! $venue) {
                $card->loadMissing('brand');
                $venue = $card->brand?->venues()->where('is_primary', true)->first()
                    ?? $card->brand?->venues()->first();
            }
            if (! $venue) {
                continue;
            }

            foreach ($this->visibleCampaignsForVenue($venue, $now) as $campaign) {
                $key = $venue->id.'-'.$campaign->id;
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;

                $multiplier = $this->engine->multiplierValue($campaign);
                $appliesNow = $this->engine->matchingCampaignsFor($card, $venue, $now)
                    ->contains(fn (Campaign $match): bool => $match->id === $campaign->id);

                $items[] = array_merge(
                    $this->presentCustomerCampaign($venue, $campaign, $multiplier, $now, $appliesNow),
                    [
                        'campaign_id' => $campaign->id,
                        'card_id' => $card->id,
                        'venue_id' => $venue->id,
                        'venue_name' => $venue->name,
                    ],
                );
            }
        }

        usort($items, function (array $a, array $b): int {
            if ($a['applies_now'] !== $b['applies_now']) {
                return $b['applies_now'] <=> $a['applies_now'];
            }

            if ($a['multiplier'] !== $b['multiplier']) {
                return $b['multiplier'] <=> $a['multiplier'];
            }

            $daysA = $a['days_left'] ?? 9999;
            $daysB = $b['days_left'] ?? 9999;

            return $daysA <=> $daysB;
        });

        return array_slice($items, 0, $limit);
    }

    /**
     * @return Collection<int, Campaign>
     */
    private function visibleCampaignsForVenue(Venue $venue, Carbon $now): Collection
    {
        return Campaign::query()
            ->where('brand_id', $venue->brand_id)
            ->where('status', Campaign::STATUS_ACTIVE)
            ->orderByDesc('activated_at')
            ->get()
            ->filter(fn (Campaign $campaign): bool => $this->isCampaignVisible($campaign, $now))
            ->values();
    }

    private function isCampaignVisible(Campaign $campaign, Carbon $now): bool
    {
        if ($campaign->starts_at && $now->lt($campaign->starts_at)) {
            return false;
        }

        if ($campaign->ends_at && $now->gt($campaign->ends_at)) {
            return false;
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    private function presentCustomerCampaign(
        Venue $venue,
        Campaign $campaign,
        int $multiplier,
        Carbon $now,
        bool $appliesNow,
    ): array {
        $endsAt = $campaign->ends_at;
        $daysLeft = $endsAt ? max(0, (int) $now->diffInDays($endsAt, false)) : null;
        $display = $this->presenter->displayFields($campaign);

        return [
            'name' => $campaign->name,
            'template_id' => $campaign->template_id,
            'multiplier' => $multiplier,
            'headline' => $appliesNow
                ? $multiplier.'× stamps active'
                : $campaign->name,
            'message' => $appliesNow
                ? $this->presenter->promotionMessage($campaign, $venue, $multiplier)
                : ($display['schedule_summary'] ?? $display['summary'] ?? 'See details at '.$venue->name),
            'applies_now' => $appliesNow,
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
                (int) ($config['min_lifetime_stamps'] ?? $config['min_visits'] ?? 5),
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

        return array_merge([
            'name' => $campaignName,
            'template_id' => $templateId,
            'audience_count' => $this->audienceCountFor($venue, $templateId, $mergedConfig),
            'push_enabled' => true,
        ], $this->presenter->displayFields($draft));
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
            $config = $template['config'];

            return array_merge($template, [
                'audience_count' => $this->audienceCountFor($venue, $templateId, $config),
                'target_label' => $this->presenter->targetLabelFor(
                    $templateId,
                    $this->audienceCountFor($venue, $templateId, $config),
                ),
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
        $venue = $campaign->venue;
        if (! $venue) {
            $campaign->loadMissing('brand');
            $venue = $campaign->brand?->venues()->where('is_primary', true)->first()
                ?? $campaign->brand?->venues()->first();
        }

        $updates = [
            'status' => Campaign::STATUS_ACTIVE,
            'activated_at' => $campaign->activated_at ?? $now,
            'audience_count' => $venue
                ? $this->audienceCountFor(
                    $venue,
                    $campaign->template_id,
                    $campaign->config ?? [],
                )
                : 0,
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

        $venue = $campaign->venue;
        if (! $venue) {
            $campaign->loadMissing('brand');
            $venue = $campaign->brand?->venues()->where('is_primary', true)->first()
                ?? $campaign->brand?->venues()->first();
        }

        $updates = [
            'config' => $mergedConfig,
            'audience_count' => $venue
                ? $this->audienceCountFor(
                    $venue,
                    $campaign->template_id,
                    $mergedConfig,
                )
                : 0,
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

    private function inactiveCustomerCount(Venue $venue, int $inactiveDays): int
    {
        return Customer::query()
            ->where('brand_id', $venue->brand_id)
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

    private function loyalCustomerCount(Venue $venue, int $minLifetimeStamps, int $minRewardsClaimed): int
    {
        return Customer::query()
            ->where('brand_id', $venue->brand_id)
            ->where(function (Builder $query) use ($minLifetimeStamps, $minRewardsClaimed): void {
                $query
                    ->where('lifetime_stamps', '>=', $minLifetimeStamps)
                    ->orWhereHas(
                        'rewardUnlocks',
                        fn (Builder $unlock) => $unlock->whereNotNull('claimed_at'),
                        '>=',
                        $minRewardsClaimed,
                    );
            })
            ->count();
    }
}
