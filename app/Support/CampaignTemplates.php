<?php

namespace App\Support;

use InvalidArgumentException;

class CampaignTemplates
{
    public const BRING_BACK = 'bring_back_customers';

    public const QUIET_DAY = 'quiet_day_promotion';

    public const HAPPY_HOUR = 'happy_hour';

    public const VIP = 'vip_rewards';

    /** @deprecated Use QUIET_DAY */
    public const MONDAY = self::QUIET_DAY;

    /** @deprecated Use VIP */
    public const REWARD_REGULARS = self::VIP;

    /**
     * @return array<int, string>
     */
    public static function ids(): array
    {
        return [
            self::BRING_BACK,
            self::QUIET_DAY,
            self::HAPPY_HOUR,
            self::VIP,
        ];
    }

    public static function assertValid(string $templateId): void
    {
        if (! in_array($templateId, self::ids(), true)) {
            throw new InvalidArgumentException("Unknown campaign template [{$templateId}].");
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaults(string $templateId): array
    {
        self::assertValid($templateId);

        return match ($templateId) {
            self::BRING_BACK => [
                'template_id' => $templateId,
                'name' => 'Bring Back Customers',
                'description' => 'Win back guests who have not visited recently with bonus stamps.',
                'benefit' => 'Bonus stamps for inactive guests',
                'cta_label' => 'Set up',
                'push_message' => 'We miss you — earn bonus stamps when you visit.',
                'config' => [
                    'stamp_multiplier' => 2,
                    'inactive_days' => 30,
                    'duration_days' => 14,
                ],
                'starts_at' => null,
                'ends_at' => null,
            ],
            self::QUIET_DAY => [
                'template_id' => $templateId,
                'name' => 'Quiet Day Promotion',
                'description' => 'Choose the days you want to boost with extra stamps.',
                'benefit' => 'Bonus stamps on selected days',
                'cta_label' => 'Set up',
                'push_message' => 'Bonus stamps on your selected days.',
                'config' => [
                    'stamp_multiplier' => 2,
                    'days_of_week' => [1, 2, 3],
                    'duration_days' => 30,
                ],
                'starts_at' => null,
                'ends_at' => null,
            ],
            self::HAPPY_HOUR => [
                'template_id' => $templateId,
                'name' => 'Happy Hour',
                'description' => 'Boost visits during a daily time window.',
                'benefit' => 'Bonus stamps during happy hour',
                'cta_label' => 'Set up',
                'push_message' => 'Bonus stamps during happy hour.',
                'config' => [
                    'stamp_multiplier' => 2,
                    'days_of_week' => [1, 2, 3, 4, 5],
                    'start_time' => '15:00',
                    'end_time' => '18:00',
                ],
                'starts_at' => null,
                'ends_at' => null,
            ],
            self::VIP => [
                'template_id' => $templateId,
                'name' => 'VIP Rewards',
                'description' => 'Reward your best customers with bonus stamps.',
                'benefit' => 'Bonus stamps for loyal guests',
                'cta_label' => 'Set up',
                'push_message' => 'Thanks for being a regular.',
                'config' => [
                    'stamp_multiplier' => 2,
                    'min_visits' => 5,
                    'min_rewards_claimed' => 1,
                ],
                'starts_at' => null,
                'ends_at' => null,
            ],
        };
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function catalog(): array
    {
        return array_map(
            fn (string $id): array => self::defaults($id),
            self::ids(),
        );
    }
}
