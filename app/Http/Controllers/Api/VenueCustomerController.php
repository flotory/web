<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerNote;
use App\Models\Venue;
use App\Services\CustomerRetentionService;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VenueCustomerController extends Controller
{
    public function __construct(private CustomerRetentionService $retention) {}

    public function index(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);

        $activity = $request->string('activity')->toString() ?: 'all';
        $sort = $request->string('sort')->toString() ?: 'last_visit';

        $customers = $this->retention
            ->listQuery($venue, $activity, $sort)
            ->get()
            ->map(fn (Customer $customer) => $this->retention->formatListCustomer($customer));

        return response()->json([
            'customers' => $customers,
            'summary' => $this->retention->activitySummary($venue),
            'filters' => [
                'activity' => $activity,
                'sort' => $sort,
            ],
        ]);
    }

    public function show(Request $request, Venue $venue, Customer $customer): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);
        VenueAccess::requireVenueModel($venue, $customer);

        return response()->json($this->retention->buildProfile($customer));
    }

    public function update(Request $request, Venue $venue, Customer $customer): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);
        VenueAccess::requireVenueModel($venue, $customer);

        $validated = $request->validate([
            'birthday' => ['nullable', 'date', 'before:today'],
        ]);

        if (array_key_exists('birthday', $validated) && $customer->user) {
            $customer->user->update([
                'birthday' => $validated['birthday'],
            ]);
        }

        return response()->json($this->retention->buildProfile($customer->fresh()));
    }

    public function storeNote(Request $request, Venue $venue, Customer $customer): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'staff']);
        VenueAccess::requireVenueModel($venue, $customer);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        CustomerNote::query()->create([
            'customer_id' => $customer->id,
            'author_id' => $request->user()->id,
            'body' => trim($validated['body']),
        ]);

        return response()->json($this->retention->buildProfile($customer->fresh()), 201);
    }
}
