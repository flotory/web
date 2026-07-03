<?php

namespace Tests\Unit;

use App\Support\DashboardPeriod;
use Carbon\Carbon;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Tests\TestCase;

class DashboardPeriodTest extends TestCase
{
    public function test_default_preset_is_28_days(): void
    {
        Carbon::setTestNow('2026-07-03 12:00:00');

        $period = DashboardPeriod::fromPreset('28d');

        $this->assertSame('28d', $period->preset);
        $this->assertSame('2026-06-06', $period->start->toDateString());
        $this->assertSame('2026-07-03', $period->end->toDateString());
        $this->assertSame(28, $period->days());
    }

    public function test_from_request_uses_custom_dates_when_present(): void
    {
        $request = Request::create('/api/dashboard', 'GET', [
            'from' => '2026-01-01',
            'to' => '2026-01-31',
        ]);

        $period = DashboardPeriod::fromRequest($request);

        $this->assertNull($period->preset);
        $this->assertSame('2026-01-01', $period->start->toDateString());
        $this->assertSame('2026-01-31', $period->end->toDateString());
    }

    public function test_custom_range_rejects_future_end_date(): void
    {
        Carbon::setTestNow('2026-07-03 12:00:00');

        $this->expectException(InvalidArgumentException::class);

        DashboardPeriod::fromCustom('2026-07-01', '2026-07-10');
    }

    public function test_previous_period_matches_selected_length(): void
    {
        Carbon::setTestNow('2026-07-03 12:00:00');

        $period = DashboardPeriod::fromPreset('7d');
        $previous = $period->previous();

        $this->assertSame(7, $period->days());
        $this->assertSame(7, $previous->days());
        $this->assertSame('2026-06-20', $previous->start->toDateString());
        $this->assertSame('2026-06-26', $previous->end->toDateString());
    }

    public function test_six_month_preset_exposes_metadata_for_dashboard(): void
    {
        Carbon::setTestNow('2026-07-03 12:00:00');

        $period = DashboardPeriod::fromPreset('6m');

        $this->assertSame('6m', $period->preset);
        $this->assertSame('Last 6 months', $period->label());
        $this->assertGreaterThan(150, $period->days());

        $payload = $period->toArray();
        $this->assertSame('6m', $payload['preset']);
        $this->assertSame('Last 6 months', $payload['label']);
        $this->assertArrayHasKey('from', $payload);
        $this->assertArrayHasKey('to', $payload);
    }
}
