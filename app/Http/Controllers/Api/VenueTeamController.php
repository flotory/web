<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Venue;
use App\Models\VenueUser;
use App\Support\VenueAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class VenueTeamController extends Controller
{
    public function index(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager']);

        $members = VenueUser::query()
            ->where('venue_id', $venue->id)
            ->with('user:id,name,email')
            ->orderByRaw("FIELD(role, 'owner', 'manager', 'staff')")
            ->get();

        return response()->json([
            'members' => $members,
        ]);
    }

    public function invite(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager']);

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'name' => ['nullable', 'string', 'max:120'],
            'role' => ['required', Rule::in(['manager', 'staff'])],
        ]);

        $email = $validated['email'];
        $name = $validated['name'] ?: Str::before($email, '@');
        $role = $validated['role'];

        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make('password'),
                'role' => UserRole::Customer,
                'active_venue_id' => $venue->id,
            ]);
        } elseif (! $user->active_venue_id) {
            $user->forceFill(['active_venue_id' => $venue->id])->save();
        }

        $membership = VenueUser::query()
            ->updateOrCreate(
                [
                    'venue_id' => $venue->id,
                    'user_id' => $user->id,
                ],
                [
                    'role' => $role,
                ],
            );

        return response()->json([
            'member' => $membership->load('user:id,name,email'),
        ], 201);
    }

    public function update(Request $request, Venue $venue, User $user): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $validated = $request->validate([
            'role' => ['required', Rule::in(['owner', 'manager', 'staff'])],
        ]);

        abort_unless($request->user()->id !== $user->id, 422);

        $membership = VenueUser::query()
            ->where('venue_id', $venue->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $membership->update([
            'role' => $validated['role'],
        ]);

        return response()->json([
            'member' => $membership->fresh()->load('user:id,name,email'),
        ]);
    }

    public function destroy(Request $request, Venue $venue, User $user): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner', 'manager']);
        abort_unless($request->user()->id !== $user->id, 422);

        VenueUser::query()
            ->where('venue_id', $venue->id)
            ->where('user_id', $user->id)
            ->delete();

        if ($user->active_venue_id === $venue->id) {
            $nextVenueId = VenueUser::query()
                ->where('user_id', $user->id)
                ->latest()
                ->value('venue_id');

            $user->forceFill([
                'active_venue_id' => $nextVenueId,
            ])->save();
        }

        return response()->noContent();
    }
}

