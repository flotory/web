<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserAccountDeletionService
{
    public function delete(User $user, ?string $password = null): void
    {
        if ($user->is_admin) {
            throw ValidationException::withMessages([
                'account' => 'Platform admin accounts cannot be deleted from the app.',
            ]);
        }

        if ($user->memberships()->where('role', 'owner')->exists()) {
            throw ValidationException::withMessages([
                'account' => 'This account manages venues on Flotory. Contact support before deleting your account.',
            ]);
        }

        if (! $user->google_id && ! $user->apple_id) {
            if ($password === null || $password === '') {
                throw ValidationException::withMessages([
                    'password' => 'Enter your password to delete your account.',
                ]);
            }

            if (! Hash::check($password, $user->password)) {
                throw ValidationException::withMessages([
                    'password' => 'Your password is incorrect.',
                ]);
            }
        }

        DB::transaction(function () use ($user): void {
            $user->tokens()->delete();
            $user->delete();
        });
    }
}
