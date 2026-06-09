<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDemoLeadRequest;
use App\Services\DemoLeadService;
use Illuminate\Http\JsonResponse;

class PublicDemoBookingController extends Controller
{
    public function show(): JsonResponse
    {
        $url = config('flotory.demo_calendly_url');
        $normalizedUrl = is_string($url) ? trim($url) : '';

        return response()->json([
            'calendly_url' => $normalizedUrl !== '' ? $normalizedUrl : null,
        ]);
    }

    public function store(StoreDemoLeadRequest $request, DemoLeadService $demoLeads): JsonResponse
    {
        if ($request->filled('company_website')) {
            return response()->json([
                'message' => 'Thanks — we will be in touch shortly.',
            ], 201);
        }

        $lead = $demoLeads->create($request->validated());

        return response()->json([
            'message' => 'Thanks — pick a time below when you are ready.',
            'lead' => [
                'id' => $lead->id,
            ],
        ], 201);
    }
}
