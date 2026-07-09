<?php

namespace App\Http\Requests;

use App\Support\VenueCategories;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOwnerOnboardingDraftRequest extends FormRequest
{
    public function rules(): array
    {
        $requiresMappedAddress = $this->input('purpose') === 'additional_venue';

        return [
            'purpose' => ['sometimes', 'string', Rule::in(['first_venue', 'additional_venue'])],
            'restart' => ['sometimes', 'boolean'],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'category' => ['sometimes', 'nullable', 'string', Rule::in(VenueCategories::all())],
            'address' => [
                Rule::requiredIf($requiresMappedAddress),
                'nullable',
                'string',
                'max:255',
            ],
            'latitude' => [
                Rule::requiredIf($requiresMappedAddress),
                'nullable',
                'numeric',
                'between:-90,90',
            ],
            'longitude' => [
                Rule::requiredIf($requiresMappedAddress),
                'nullable',
                'numeric',
                'between:-180,180',
            ],
            'google_place_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'website' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'reward' => ['sometimes', 'array'],
            'reward.title' => ['sometimes', 'required', 'string', 'max:120'],
            'reward.description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'reward.required_stamps' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
        ];
    }
}
