<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRestaurantRequest extends FormRequest
{
    public function rules(): array
    {
        $venue = $this->route('venue');

        return [
            'name' => ['required', 'string', 'max:120'],
            'slug' => [
                'nullable',
                'alpha_dash:ascii',
                'max:80',
                Rule::unique('venues', 'slug')->ignore($venue?->id),
            ],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'google_place_id' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'website' => ['nullable', 'url', 'max:2048'],
            'category' => ['nullable', 'string', 'in:cafe,restaurant,bar,bakery'],
        ];
    }
}
