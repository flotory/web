<?php

namespace App\Services;

use App\Models\Campaign;
use App\Models\Venue;
use App\Support\CampaignTemplates;
use Carbon\Carbon;

/**
 * Owner-facing campaign copy, schedule chips, and enriched API payloads.
 */
class CampaignOwnerPresenter
{
    public function __construct(private CampaignEngine $engine) {}

    /**
     * @return array<string, mixed>
     */
    public function enrichForOwner(Campaign $campaign): array
    {
        return array_merge($campaign->toArray(), $this->displayFields($campaign), [
            'status_label' => $this->statusLabel($campaign),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function displayFields(Campaign $campaign): array
    {
        return [
            'multiplier' => $this->engine->multiplierValue($campaign),
            'schedule_chips' => $this->scheduleChips($campaign),
            'schedule_summary' => $this->scheduleSummary($campaign),
            'summary' => $this->quickSummary($campaign),
        ];
    }

    public function promotionMessage(Campaign $campaign, Venue $venue, int $multiplier): string
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

    /**
     * @param  array<string, mixed>  $config
     */
    public function targetLabelFor(string $templateId, int $count): string
    {
        return match ($templateId) {
            CampaignTemplates::BRING_BACK => "{$count} inactive customers",
            CampaignTemplates::VIP => "{$count} VIP customers",
            CampaignTemplates::QUIET_DAY => "{$count} customers on selected days",
            CampaignTemplates::HAPPY_HOUR => "{$count} customers during happy hour",
            default => "{$count} customers",
        };
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
            $minLifetimeStamps = (int) ($campaign->config['min_lifetime_stamps'] ?? $campaign->config['min_visits'] ?? 5);
            $chips[] = $minLifetimeStamps.'+ lifetime stamps';
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
        $multiplier = $this->engine->multiplierValue($campaign);

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
}
