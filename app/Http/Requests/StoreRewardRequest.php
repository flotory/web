<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
class StoreRewardRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'required_stamps' => ['required', 'integer', 'min:1', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'image' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
            'active' => ['sometimes', 'boolean'],
        ];
    }
}
