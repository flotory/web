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

    public function multiplierFor(Customer $customer, Venue $venue, ?Carbon $now = null): int
    {
        return $this->engine->multiplierFor($customer, $venue, $now);
    }

    public function winningCampaignFor(Customer $customer, Venue $venue, ?Carbon $now = null): ?Campaign
    {
        return $this->engine->winningCampaignFor($customer, $venue, $now);
    }

    /**
     * @return Collection<int, Campaign>
     */
    public function matchingCampaignsFor(Customer $customer, Venue $venue, ?Carbon $now = null): Collection
    {
        return $this->engine->matchingCampaignsFor($customer, $venue, $now);
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
        return $this->presenter->enrichForOwner($campaign);
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
            'message' => $this->presenter->promotionMessage($campaign, $venue, $multiplier),
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
}
