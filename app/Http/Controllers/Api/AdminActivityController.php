<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class AdminActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Activity::query()
            ->where('log_name', AuditLog::LOG_NAME)
            ->with(['causer:id,name,email', 'subject'])
            ->latest('created_at');

        if ($request->filled('event')) {
            $query->where('event', $request->string('event'));
        }

        if ($request->filled('description')) {
            $query->where('description', 'like', '%'.$request->string('description').'%');
        }

        if ($request->filled('request_id')) {
            $query->where('properties->request_id', $request->string('request_id'));
        }

        if ($request->filled('venue_id')) {
            $query->where('properties->venue_id', $request->integer('venue_id'));
        }

        if ($request->filled('customer_id')) {
            $query->where('properties->customer_id', $request->integer('customer_id'));
        }

        if ($request->filled('user_id')) {
            $query->where('causer_id', $request->integer('user_id'))
                ->where('causer_type', \App\Models\User::class);
        }

        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(function ($builder) use ($term): void {
                $builder
                    ->where('description', 'like', $term)
                    ->orWhere('properties', 'like', $term);
            });
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->date('from')->startOfDay());
        }

        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->date('to')->endOfDay());
        }

        $paginator = $query->paginate($request->integer('per_page', 50));

        return response()->json([
            'data' => collect($paginator->items())->map(fn (Activity $activity) => $this->formatActivity($activity)),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatActivity(Activity $activity): array
    {
        $properties = $activity->properties?->toArray() ?? [];

        return [
            'id' => $activity->id,
            'description' => $activity->description,
            'event' => $activity->event,
            'log_name' => $activity->log_name,
            'created_at' => $activity->created_at?->toIso8601String(),
            'request_id' => $properties['request_id'] ?? null,
            'venue_id' => $properties['venue_id'] ?? null,
            'customer_id' => $properties['customer_id'] ?? null,
            'route' => $properties['route'] ?? null,
            'status' => $properties['status'] ?? null,
            'properties' => $properties,
            'causer' => $activity->causer ? [
                'id' => $activity->causer->id,
                'name' => $activity->causer->name,
                'email' => $activity->causer->email,
            ] : null,
            'subject_type' => $activity->subject_type,
            'subject_id' => $activity->subject_id,
        ];
    }
}
