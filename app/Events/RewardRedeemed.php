<?php

namespace App\Events;

use App\Models\Customer;
use App\Models\RewardUnlock;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RewardRedeemed implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public Customer $customer,
        public RewardUnlock $unlock,
        public ?string $claimSessionToken = null,
    ) {
        $this->customer->loadMissing('venue', 'user');
        $this->unlock->loadMissing('reward');
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("customer.{$this->customer->id}");
    }

    public function broadcastAs(): string
    {
        return 'reward.redeemed';
    }

    public function broadcastWith(): array
    {
        $reward = $this->unlock->reward;

        return [
            'customer' => $this->customer,
            'venue' => $this->customer->venue,
            'unlock_id' => $this->unlock->id,
            'reward' => $reward,
            'claim_session_token' => $this->claimSessionToken,
            'message' => "{$reward->title} redeemed at {$this->customer->venue->name}.",
            'occurred_at' => now()->toISOString(),
        ];
    }
}
