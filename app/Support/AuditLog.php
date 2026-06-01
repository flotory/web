<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\Activitylog\Contracts\Activity;

class AuditLog
{
    public const LOG_NAME = 'audit';

    /**
     * @param  array<string, mixed>  $properties
     */
    public static function record(
        string $description,
        ?Model $subject = null,
        ?Model $causer = null,
        string $event = 'info',
        array $properties = [],
    ): ?Activity {
        if (! config('activitylog.enabled')) {
            return null;
        }

        $properties = array_merge([
            'event' => $event,
            'request_id' => RequestContext::id(),
            'route' => request()?->route()?->getName() ?? request()?->path(),
        ], $properties);

        $logger = activity(self::LOG_NAME)
            ->event($event)
            ->withProperties($properties);

        if ($subject !== null) {
            $logger->performedOn($subject);
        }

        if ($causer !== null) {
            $logger->causedBy($causer);
        } elseif ($user = request()?->user()) {
            $logger->causedBy($user);
        }

        return $logger->log($description);
    }

    public static function validationFailure(Request $request, ValidationException $exception): void
    {
        $messages = collect($exception->errors())->flatten()->take(3)->all();

        self::record(
            description: 'validation.failed',
            event: 'failed',
            properties: [
                'status' => 'failed',
                'http_status' => 422,
                'path' => $request->path(),
                'method' => $request->method(),
                'messages' => $messages,
                'venue_id' => $request->route('venue')?->id ?? $request->integer('venue_id') ?: null,
                'customer_id' => $request->route('customer')?->id ?? null,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    public static function loyalty(
        string $description,
        Model $subject,
        ?Model $causer = null,
        string $event = 'info',
        array $properties = [],
    ): ?Activity {
        $venueId = $properties['venue_id'] ?? null;
        $customerId = $properties['customer_id'] ?? null;

        if ($subject instanceof \App\Models\Customer) {
            $venueId ??= $subject->venue_id;
            $customerId ??= $subject->id;
        }

        if ($subject instanceof \App\Models\RewardUnlock) {
            $subject->loadMissing('customer');
            $customerId ??= $subject->customer_id;
            $venueId ??= $subject->customer?->venue_id;
        }

        if ($subject instanceof \App\Models\RedemptionRequest) {
            $subject->loadMissing('rewardUnlock.customer');
            $customerId ??= $subject->rewardUnlock?->customer_id;
            $venueId ??= $subject->rewardUnlock?->customer?->venue_id;
        }

        if ($subject instanceof \App\Models\Reward) {
            $venueId ??= $subject->venue_id;
        }

        return self::record(
            description: $description,
            subject: $subject,
            causer: $causer,
            event: $event,
            properties: array_merge([
                'venue_id' => $venueId,
                'customer_id' => $customerId,
            ], $properties),
        );
    }
}
