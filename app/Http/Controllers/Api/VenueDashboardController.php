<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venue;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VenueDashboardController extends Controller
{
    public function show(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager', 'staff']);

        $repeatCustomers = $venue->customers()
            ->withCount('visits')
            ->having('visits_count', '>=', 2)
            ->count();

        return response()->json([
            'stats' => [
                'total_customers' => $venue->customers()->count(),
                'repeat_customers' => $repeatCustomers,
                'total_visits' => $venue->visits()->count(),
                'rewards_redeemed' => DB::table('reward_redemptions')
                    ->join('rewards', 'reward_redemptions.reward_id', '=', 'rewards.id')
                    ->where('rewards.venue_id', $venue->id)
                    ->count(),
            ],
            'most_loyal_customers' => $venue->customers()
                ->with('user:id,name,email')
                ->orderByDesc('stamps')
                ->limit(5)
                ->get(['id', 'venue_id', 'user_id', 'stamps']),
            'monthly_activity' => $venue->visits()
                ->selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as visits')
                ->groupBy('month')
                ->orderBy('month')
                ->limit(12)
                ->get(),
        ]);
    }
}

