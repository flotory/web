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
            'phone' => ['nullable', 'string', 'max:40'],
            'website' => ['nullable', 'url', 'max:2048'],
        ];
    }
}
