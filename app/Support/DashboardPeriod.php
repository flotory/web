<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Http\Request;
use InvalidArgumentException;

class DashboardPeriod
{
    public const DEFAULT_PRESET = '28d';

    public const MAX_RANGE_DAYS = 730;

    /** @var array<string, string> */
    public const PRESET_LABELS = [
        '7d' => 'Last 7 days',
        '14d' => 'Last 14 days',
        '28d' => 'Last 28 days',
        '2m' => 'Last 2 months',
        '3m' => 'Last 3 months',
        '6m' => 'Last 6 months',
        '12m' => 'Last 12 months',
    ];

    public function __construct(
        Carbon $start,
        Carbon $end,
        public readonly ?string $preset = null,
    ) {
        $this->start = $start->copy()->startOfDay();
        $this->end = $end->copy()->endOfDay();
    }

    public readonly Carbon $start;

    public readonly Carbon $end;

    public static function fromRequest(Request $request): self
    {
        $from = $request->string('from')->toString();
        $to = $request->string('to')->toString();

        if ($from !== '' && $to !== '') {
            return self::fromCustom($from, $to);
        }

        $preset = $request->string('period')->toString();

        return self::fromPreset($preset !== '' ? $preset : self::DEFAULT_PRESET);
    }

    public static function fromPreset(string $preset): self
    {
        if (! array_key_exists($preset, self::PRESET_LABELS)) {
            throw new InvalidArgumentException("Unknown dashboard period preset [{$preset}].");
        }

        $end = now()->endOfDay();

        $start = match ($preset) {
            '7d' => $end->copy()->subDays(6)->startOfDay(),
            '14d' => $end->copy()->subDays(13)->startOfDay(),
            '28d' => $end->copy()->subDays(27)->startOfDay(),
            '2m' => $end->copy()->subMonths(2)->addDay()->startOfDay(),
            '3m' => $end->copy()->subMonths(3)->addDay()->startOfDay(),
            '6m' => $end->copy()->subMonths(6)->addDay()->startOfDay(),
            '12m' => $end->copy()->subMonths(12)->addDay()->startOfDay(),
            default => throw new InvalidArgumentException("Unknown dashboard period preset [{$preset}]."),
        };

        return new self($start, $end, $preset);
    }

    public static function fromCustom(string $from, string $to): self
    {
        try {
            $start = Carbon::parse($from)->startOfDay();
            $end = Carbon::parse($to)->endOfDay();
        } catch (\Throwable) {
            throw new InvalidArgumentException('Invalid custom dashboard period dates.');
        }

        if ($start->greaterThan($end)) {
            throw new InvalidArgumentException('Dashboard period start must be on or before the end date.');
        }

        if ($end->greaterThan(now()->endOfDay())) {
            throw new InvalidArgumentException('Dashboard period cannot end in the future.');
        }

        if ($start->diffInDays($end) + 1 > self::MAX_RANGE_DAYS) {
            throw new InvalidArgumentException('Dashboard period cannot exceed '.self::MAX_RANGE_DAYS.' days.');
        }

        return new self($start, $end);
    }

    public function days(): int
    {
        return max(1, (int) $this->start->diffInDays($this->end) + 1);
    }

    public function previous(): self
    {
        $lengthDays = $this->days();
        $previousEnd = $this->start->copy()->subDay()->endOfDay();
        $previousStart = $previousEnd->copy()->subDays($lengthDays - 1)->startOfDay();

        return new self($previousStart, $previousEnd);
    }

    public function label(): string
    {
        if ($this->preset && isset(self::PRESET_LABELS[$this->preset])) {
            return self::PRESET_LABELS[$this->preset];
        }

        if ($this->start->isSameDay($this->end)) {
            return $this->start->format('M j, Y');
        }

        return $this->start->format('M j, Y').' – '.$this->end->format('M j, Y');
    }

    /**
     * @return array{preset: string|null, from: string, to: string, label: string, days: int}
     */
    public function toArray(): array
    {
        return [
            'preset' => $this->preset,
            'from' => $this->start->toDateString(),
            'to' => $this->end->toDateString(),
            'label' => $this->label(),
            'days' => $this->days(),
        ];
    }
}
