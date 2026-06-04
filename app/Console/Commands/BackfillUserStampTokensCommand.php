<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\User;
use App\Models\UserStampToken;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class BackfillUserStampTokensCommand extends Command
{
    protected $signature = 'app:backfill-user-stamp-tokens';

    protected $description = 'Create user_stamp_tokens for users with loyalty cards (v2 universal QR)';

    public function handle(): int
    {
        $userIds = Customer::query()
            ->distinct()
            ->pluck('user_id');

        $created = 0;
        $skipped = 0;

        foreach ($userIds as $userId) {
            if (UserStampToken::query()->where('user_id', $userId)->exists()) {
                $skipped++;
                continue;
            }

            $legacyToken = Customer::query()
                ->where('user_id', $userId)
                ->orderBy('id')
                ->value('qr_token');

            UserStampToken::query()->create([
                'user_id' => $userId,
                'public_token' => $legacyToken && Str::isUuid($legacyToken)
                    ? strtolower($legacyToken)
                    : (string) Str::uuid(),
                'version' => 1,
            ]);

            $created++;
        }

        $this->info("user_stamp_tokens: {$created} created, {$skipped} already existed.");

        return self::SUCCESS;
    }
}
