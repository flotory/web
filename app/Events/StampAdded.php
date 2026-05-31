<?php

namespace App\Events;

use App\Models\Customer;
use App\Models\Reward;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection as SupportCollection;

class StampAdded implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public Customer $customer,
        public int $previousStamps,
        public int $addedStamps,
        public ?Reward $nextReward,
        public Collection $availableRewards,
        public SupportCollection $milestones,
        public int $currentCycle,
        public bool $cycleCompleted,
    ) {
        $this->customer->loadMissing('venue', 'user');
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("customer.{$this->customer->id}");
    }

    public function broadcastAs(): string
    {
        return 'stamp.added';
    }

    public function broadcastWith(): array
    {
        return [
            'customer' => $this->customer,
            'venue' => $this->customer->venue,
            'previous_stamps' => $this->previousStamps,
            'added_stamps' => $this->addedStamps,
            'stamps' => $this->customer->stamps,
            'next_reward' => $this->nextReward,
            'available_rewards' => $this->availableRewards,
            'milestones' => $this->milestones,
            'current_cycle' => $this->currentCycle,
            'cycle_completed' => $this->cycleCompleted,
            'message' => "{$this->addedStamps} ".str('star')->plural($this->addedStamps)." added at {$this->customer->venue->name}.",
            'occurred_at' => now()->toISOString(),
        ];
    }
}
