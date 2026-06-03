<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('campaigns')
            ->where('template_id', 'monday_promotion')
            ->update(['template_id' => 'quiet_day_promotion']);

        DB::table('campaigns')
            ->where('template_id', 'reward_regulars')
            ->update(['template_id' => 'vip_rewards']);
    }

    public function down(): void
    {
        DB::table('campaigns')
            ->where('template_id', 'quiet_day_promotion')
            ->update(['template_id' => 'monday_promotion']);

        DB::table('campaigns')
            ->where('template_id', 'vip_rewards')
            ->update(['template_id' => 'reward_regulars']);
    }
};
