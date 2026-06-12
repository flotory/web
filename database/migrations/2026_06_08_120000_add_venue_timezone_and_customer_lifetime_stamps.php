<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('venues', function (Blueprint $table): void {
            $table->string('timezone', 64)->nullable()->after('longitude');
        });

        Schema::table('customers', function (Blueprint $table): void {
            $table->unsignedInteger('lifetime_stamps')->default(0)->after('stamps');
        });

        foreach (DB::table('customers')->select('id')->cursor() as $customer) {
            $visitCount = DB::table('visits')->where('customer_id', $customer->id)->count();
            DB::table('customers')->where('id', $customer->id)->update([
                'lifetime_stamps' => $visitCount,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            $table->dropColumn('lifetime_stamps');
        });

        Schema::table('venues', function (Blueprint $table): void {
            $table->dropColumn('timezone');
        });
    }
};
