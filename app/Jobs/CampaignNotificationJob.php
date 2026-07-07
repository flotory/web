<?php

namespace App\Jobs;

use App\Models\Campaign;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Future: send Expo push notifications when a campaign is activated.
 */
class CampaignNotificationJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(public Campaign $campaign) {}

    public function handle(): void
    {
        Log::info('Campaign push notification queued (not yet implemented).', [
            'campaign_id' => $this->campaign->id,
            'brand_id' => $this->campaign->brand_id,
            'template_id' => $this->campaign->template_id,
        ]);
    }
}
