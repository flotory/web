<?php

namespace Database\Seeders;

/**
 * Deterministic pseudo-random helper for production-safe demo seeding (no Faker dev dependency).
 */
final class SeededRandom
{
    private int $state;

    /** @var list<string> */
    private const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sam', 'Jamie', 'Drew', 'Blake', 'Cameron', 'Hayden', 'Parker', 'Reese', 'Skyler', 'Logan', 'Rowan', 'Emery'];

    /** @var list<string> */
    private const LAST_NAMES = ['Chen', 'Morgan', 'Rivera', 'Bell', 'Martin', 'Stone', 'Brown', 'Green', 'Lee', 'Patel', 'Carter', 'Nguyen', 'Kim', 'Singh', 'Brooks', 'Hayes', 'Ward', 'Cole', 'Reed', 'Price'];

    public function __construct(int $seed)
    {
        $this->state = $seed;
    }

    public function randomElement(array $items): mixed
    {
        if ($items === []) {
            throw new \InvalidArgumentException('randomElement requires a non-empty array.');
        }

        return $items[$this->numberBetween(0, count($items) - 1)];
    }

    /**
     * @template T
     *
     * @param  list<T>  $items
     * @return list<T>
     */
    public function randomElements(array $items, int $count): array
    {
        $count = min($count, count($items));
        if ($count <= 0) {
            return [];
        }

        $keys = array_keys($items);
        $this->shuffle($keys);

        return array_values(array_intersect_key($items, array_flip(array_slice($keys, 0, $count))));
    }

    public function numberBetween(int $min, int $max): int
    {
        if ($max < $min) {
            [$min, $max] = [$max, $min];
        }

        $range = $max - $min + 1;

        return $min + ($this->nextInt() % $range);
    }

    public function boolean(int $percent = 50): bool
    {
        return $this->numberBetween(1, 100) <= max(0, min(100, $percent));
    }

    public function name(): string
    {
        return $this->randomElement(self::FIRST_NAMES).' '.$this->randomElement(self::LAST_NAMES);
    }

    public function buildingNumber(): string
    {
        return (string) $this->numberBetween(1, 999);
    }

    public function numerify(string $pattern): string
    {
        return preg_replace_callback('/#/', fn () => (string) $this->numberBetween(0, 9), $pattern) ?? $pattern;
    }

    /**
     * @template T
     *
     * @param  list<T>  $items
     */
    public function shuffle(array &$items): void
    {
        for ($i = count($items) - 1; $i > 0; $i--) {
            $j = $this->numberBetween(0, $i);
            [$items[$i], $items[$j]] = [$items[$j], $items[$i]];
        }
    }

    private function nextInt(): int
    {
        $this->state = (int) (($this->state * 1103515245 + 12345) & 0x7fffffff);

        return $this->state;
    }
}
