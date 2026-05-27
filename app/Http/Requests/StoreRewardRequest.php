<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRewardRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'required_stamps' => ['required', 'integer', 'min:1', 'max:100'],
            'reward_type' => ['required', Rule::in(['discount', 'free_item', 'upgrade', 'custom'])],
            'active' => ['sometimes', 'boolean'],
        ];
    }
}
