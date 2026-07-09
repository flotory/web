<?php

namespace App\Http\Requests;

use App\Support\VenueCategories;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRestaurantRequest extends FormRequest
{
    public function rules(): array
    {
        $venue = $this->route('venue');
        $requiresMappedAddress = $this->isMethod('POST')
            || $this->hasAny(['address', 'latitude', 'longitude', 'google_place_id']);

        return [
            'name' => ['required', 'string', 'max:120'],
            'slug' => [
                'nullable',
                'alpha_dash:ascii',
                'max:80',
                Rule::unique('venues', 'slug')->ignore($venue?->id),
            ],
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
            'google_place_id' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'website' => ['nullable', 'url', 'max:2048'],
            'category' => ['nullable', 'string', Rule::in(VenueCategories::all())],
            'average_check_amount' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
        ];
    }
}
