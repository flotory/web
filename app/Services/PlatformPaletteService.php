<?php

namespace App\Services;

use App\Models\PlatformSetting;

class PlatformPaletteService
{
    public const SETTING_KEY = 'palette';

    /**
     * @return array<string, string>
     */
    public function defaults(): array
    {
        /** @var array<string, string> $palette */
        $palette = config('flotory_palette', []);

        return $palette;
    }

    /**
     * @return array<string, string>
     */
    public function overrides(): array
    {
        $row = PlatformSetting::query()->where('key', self::SETTING_KEY)->first();

        if (! $row || ! is_array($row->value)) {
            return [];
        }

        return $this->sanitizeOverrides($row->value);
    }

    /**
     * @return array<string, string>
     */
    public function current(): array
    {
        return array_merge($this->defaults(), $this->overrides());
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, string>
     */
    public function sanitizeOverrides(array $input): array
    {
        $defaults = $this->defaults();
        $clean = [];

        foreach ($defaults as $key => $defaultValue) {
            if (! array_key_exists($key, $input) || ! is_string($input[$key])) {
                continue;
            }

            $value = strtoupper(trim($input[$key]));

            if (preg_match('/^#[0-9A-F]{6}$/', $value) === 1) {
                $clean[$key] = $value;
            }
        }

        return $clean;
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, string>
     */
    public function update(array $input): array
    {
        $overrides = $this->sanitizeOverrides($input);

        PlatformSetting::query()->updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => $overrides],
        );

        return $this->current();
    }

    public function reset(): array
    {
        PlatformSetting::query()->where('key', self::SETTING_KEY)->delete();

        return $this->current();
    }

    /**
     * @return list<array{key: string, label: string, description: string, group: string}>
     */
    public function tokenCatalog(): array
    {
        return [
            ['key' => 'primary', 'label' => 'Primary', 'description' => 'Main buttons, nav active, key actions', 'group' => 'brand'],
            ['key' => 'primary_soft', 'label' => 'Primary soft', 'description' => 'Secondary emphasis on dark surfaces', 'group' => 'brand'],
            ['key' => 'primary_text', 'label' => 'Primary text', 'description' => 'Text on primary buttons', 'group' => 'brand'],
            ['key' => 'accent', 'label' => 'Accent', 'description' => 'Highlights, progress, reward cues', 'group' => 'brand'],
            ['key' => 'accent_soft', 'label' => 'Accent soft', 'description' => 'Soft accent backgrounds', 'group' => 'brand'],
            ['key' => 'accent_border', 'label' => 'Accent border', 'description' => 'Accent outlines and chips', 'group' => 'brand'],
            ['key' => 'accent_active', 'label' => 'Dark gold', 'description' => 'Active reward states and pressed accents', 'group' => 'brand'],
            ['key' => 'bg', 'label' => 'App background', 'description' => 'Default page background (cream)', 'group' => 'surfaces'],
            ['key' => 'bg_gradient_start', 'label' => 'Background gradient start', 'description' => 'Top of home/workspace gradient', 'group' => 'surfaces'],
            ['key' => 'bg_gradient_end', 'label' => 'Background gradient end', 'description' => 'Bottom of home/workspace gradient', 'group' => 'surfaces'],
            ['key' => 'surface', 'label' => 'Surface', 'description' => 'Cards and panels', 'group' => 'surfaces'],
            ['key' => 'surface_muted', 'label' => 'Surface muted', 'description' => 'Subtle blocks and inputs', 'group' => 'surfaces'],
            ['key' => 'border', 'label' => 'Border', 'description' => 'Dividers and card edges', 'group' => 'surfaces'],
            ['key' => 'workspace_bg', 'label' => 'Workspace background', 'description' => 'Owner app content canvas', 'group' => 'surfaces'],
            ['key' => 'workspace_bg_gradient_start', 'label' => 'Workspace gradient start', 'description' => 'Top of owner workspace background', 'group' => 'surfaces'],
            ['key' => 'workspace_bg_gradient_end', 'label' => 'Workspace gradient end', 'description' => 'Bottom of owner workspace background', 'group' => 'surfaces'],
            ['key' => 'surface_elevated', 'label' => 'Elevated surface', 'description' => 'Raised cards and panels', 'group' => 'surfaces'],
            ['key' => 'sidebar_bg', 'label' => 'Sidebar background', 'description' => 'Owner navigation sidebar', 'group' => 'admin'],
            ['key' => 'sidebar_border', 'label' => 'Sidebar border', 'description' => 'Sidebar edge divider', 'group' => 'admin'],
            ['key' => 'sidebar_text', 'label' => 'Sidebar text', 'description' => 'Primary text on sidebar', 'group' => 'admin'],
            ['key' => 'sidebar_text_muted', 'label' => 'Sidebar muted text', 'description' => 'Inactive nav labels on sidebar', 'group' => 'admin'],
            ['key' => 'sidebar_hover', 'label' => 'Sidebar hover', 'description' => 'Hover state for sidebar items', 'group' => 'admin'],
            ['key' => 'nav_active_bg', 'label' => 'Nav active background', 'description' => 'Active sidebar item pill', 'group' => 'admin'],
            ['key' => 'nav_active_text', 'label' => 'Nav active text', 'description' => 'Text on active sidebar item', 'group' => 'admin'],
            ['key' => 'ink', 'label' => 'Ink', 'description' => 'Primary text', 'group' => 'text'],
            ['key' => 'ink_muted', 'label' => 'Ink muted', 'description' => 'Secondary text', 'group' => 'text'],
            ['key' => 'ink_soft', 'label' => 'Ink soft', 'description' => 'Tertiary labels and hints', 'group' => 'text'],
            ['key' => 'success', 'label' => 'Success', 'description' => 'Positive status color', 'group' => 'status'],
            ['key' => 'success_text', 'label' => 'Success text', 'description' => 'Text on success surfaces', 'group' => 'status'],
            ['key' => 'success_bg', 'label' => 'Success background', 'description' => 'Success alert backgrounds', 'group' => 'status'],
            ['key' => 'success_border', 'label' => 'Success border', 'description' => 'Success alert borders', 'group' => 'status'],
            ['key' => 'danger', 'label' => 'Danger', 'description' => 'Errors and destructive actions', 'group' => 'status'],
            ['key' => 'danger_soft', 'label' => 'Danger soft', 'description' => 'Soft error backgrounds', 'group' => 'status'],
            ['key' => 'campaign_bg', 'label' => 'Campaign card', 'description' => 'Active campaign card background', 'group' => 'components'],
            ['key' => 'campaign_border', 'label' => 'Campaign border', 'description' => 'Active campaign card border', 'group' => 'components'],
            ['key' => 'reward_ready_accent', 'label' => 'Reward ready accent', 'description' => 'Left accent on ready reward cards', 'group' => 'components'],
            ['key' => 'lavender', 'label' => 'Champagne', 'description' => 'Hover states and soft badges', 'group' => 'extras'],
            ['key' => 'lavender_border', 'label' => 'Champagne border', 'description' => 'Badge and chip borders', 'group' => 'extras'],
            ['key' => 'plum', 'label' => 'Deep navy panel', 'description' => 'Dark accent panels', 'group' => 'extras'],
            ['key' => 'progress_track', 'label' => 'Progress track', 'description' => 'Empty progress bar track', 'group' => 'extras'],
            ['key' => 'progress_filled', 'label' => 'Progress filled', 'description' => 'Filled progress bar', 'group' => 'extras'],
            ['key' => 'link', 'label' => 'Link', 'description' => 'Text links in owner app', 'group' => 'web'],
            ['key' => 'chart', 'label' => 'Chart', 'description' => 'Analytics bars and charts', 'group' => 'web'],
            ['key' => 'nav_active', 'label' => 'Nav active', 'description' => 'Active sidebar item', 'group' => 'web'],
        ];
    }
}
