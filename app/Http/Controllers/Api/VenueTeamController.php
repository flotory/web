<?php

namespace App\Http\Controllers\Api;

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
use Illuminate\Validation\ValidationException;

class VenueTeamController extends Controller
{
    public function index(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $members = VenueUser::query()
            ->where('venue_id', $venue->id)
            ->with('user:id,name,email')
            ->orderByRaw("FIELD(role, 'owner', 'staff')")
            ->get();

        return response()->json([
            'members' => $members,
        ]);
    }

    public function invite(Request $request, Venue $venue): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'name' => ['nullable', 'string', 'max:120'],
            'role' => ['sometimes', Rule::in(['staff'])],
        ]);

        $email = $validated['email'];
        $name = $validated['name'] ?: Str::before($email, '@');
        $temporaryPassword = Str::password(12, letters: true, numbers: true, symbols: false);

        $user = User::query()->where('email', $email)->first();

        if ($user) {
            $existingMembership = VenueUser::query()
                ->where('venue_id', $venue->id)
                ->where('user_id', $user->id)
                ->first();

            if ($existingMembership?->role === 'owner') {
                throw ValidationException::withMessages([
                    'email' => 'This person is the venue owner and cannot be invited as staff.',
                ]);
            }

            $user->forceFill([
                'name' => $name,
                'password' => Hash::make($temporaryPassword),
                'active_venue_id' => $user->active_venue_id ?: $venue->id,
            ])->save();
        } else {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($temporaryPassword),
                'is_admin' => false,
                'active_venue_id' => $venue->id,
            ]);
        }

        $membership = VenueUser::query()
            ->updateOrCreate(
                [
                    'venue_id' => $venue->id,
                    'user_id' => $user->id,
                ],
                [
                    'role' => 'staff',
                ],
            );

        return response()->json([
            'member' => $membership->load('user:id,name,email'),
            'temporary_password' => $temporaryPassword,
        ], 201);
    }

    public function resetPassword(Request $request, Venue $venue, User $user): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $membership = VenueUser::query()
            ->where('venue_id', $venue->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        abort_if($membership->role === 'owner', 422, 'Cannot reset the venue owner password from here.');

        $temporaryPassword = Str::password(12, letters: true, numbers: true, symbols: false);

        $user->forceFill([
            'password' => Hash::make($temporaryPassword),
        ])->save();

        return response()->json([
            'member' => $membership->load('user:id,name,email'),
            'temporary_password' => $temporaryPassword,
        ]);
    }

    public function update(Request $request, Venue $venue, User $user): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);

        $validated = $request->validate([
            'role' => ['required', Rule::in(['staff'])],
        ]);

        abort_unless($request->user()->id !== $user->id, 422);

        $membership = VenueUser::query()
            ->where('venue_id', $venue->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        abort_if($membership->role === 'owner', 422, 'The venue owner role cannot be changed.');

        $membership->update([
            'role' => $validated['role'],
        ]);

        return response()->json([
            'member' => $membership->fresh()->load('user:id,name,email'),
        ]);
    }

    public function destroy(Request $request, Venue $venue, User $user): JsonResponse
    {
        VenueAccess::requireAccess($request->user(), $venue, ['owner']);
        abort_unless($request->user()->id !== $user->id, 422);

        $membership = VenueUser::query()
            ->where('venue_id', $venue->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        abort_if($membership->role === 'owner', 422, 'The venue owner cannot be removed.');

        $membership->delete();

        if ($user->active_venue_id === $venue->id) {
            $nextVenueId = VenueUser::query()
                ->where('user_id', $user->id)
                ->latest()
                ->value('venue_id');

            $user->forceFill([
                'active_venue_id' => $nextVenueId,
            ])->save();
        }

        return response()->json(status: 204);
    }
}
